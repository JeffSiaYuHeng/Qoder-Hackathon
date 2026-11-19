// Rewrites the browser-built report templates with Gemini (same AI Studio key as analyze).
// If the key is missing, Gemini is slow, or its output fails validation, the templates are
// returned unchanged — the demo never blocks on the model.
const DEFAULT_MODEL = 'gemini-3.8-flash'
const DEADLINE_MS = 20000
const MIN_BODY = 50
const MAX_BODY = 4000
const MAX_STATEMENT = 1200
const MAX_STORY = 6000

const SUSPECT_KEYS = ['scammer_phone', 'scammer_account', 'transaction_ref']

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    statement: { type: 'string' },
    reports: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['slug', 'body'],
      },
    },
  },
  required: ['statement', 'reports'],
}

function templateResult(templates) {
  return {
    source: 'template',
    statement: null,
    reports: templates.map((t) => ({ slug: t.slug, subject: t.subject, body: t.body })),
  }
}

function formatAmountValue(amount) {
  return Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })
}

function lastLine(body) {
  const lines = String(body).trimEnd().split('\n')
  return lines[lines.length - 1].trim()
}

function bodyAmounts(body) {
  return [...body.matchAll(/RM\s*([\d,]+(?:\.\d+)?)/g)].map((m) => m[1])
}

function buildPrompt({ story, lang, form, templates }) {
  const langName = lang === 'bm' ? 'Bahasa Melayu' : 'English'
  const facts = [
    `Amount: ${form.amount ?? 'not given'}`,
    `Date/time: ${form.occurred_at ?? 'not given'}`,
    `Contact method: ${form.contact_method ?? 'not given'}`,
    `Scammer phone: ${form.scammer_phone ?? 'not given'}`,
    `Scammer account: ${form.scammer_account ?? 'not given'}`,
    `Transaction reference: ${form.transaction_ref ?? 'not given'}`,
  ].join('\n')
  const blocks = templates.map((t) =>
    [
      `--- ${t.slug} (${t.name}, ${t.type}) ---`,
      `Addressed to: ${t.name}. The body must mention ${t.name} by name.`,
      'Required structure:',
      t.body,
      '---',
    ].join('\n'),
  )
  return [
    'You rewrite scam-report emails for ScamSOS, a Malaysian scam-response app.',
    `Write all text in ${langName}. Every report keeps the structure and line order of its template.`,
    'Rules:',
    '- Use ONLY facts stated in the facts block or the story. Never invent numbers, dates, names or references.',
    '- A missing value stays exactly "[to add]" (English) or "[untuk ditambah]" (Bahasa Melayu). Do not fabricate it.',
    '- Copy the suspect account / phone / reference exactly as written in the facts block. Do not add spaces or change digits.',
    '- Keep the final disclaimer line of each template verbatim.',
    '- Plain text only: no markdown, no bullets, no code fences, no commentary.',
    '- Do not add new numbers or dates.',
    '- statement: one clean paragraph in the first person summarising what happened, for a police report.',
    'Return ONLY a JSON object with this exact shape:',
    '{"statement":"<one paragraph>","reports":[{"slug":"<slug>","body":"<email body>"}]}',
    'Include one reports entry per template below, using the same slug.',
    '',
    'Facts:',
    facts,
    '',
    'Story:',
    story.slice(0, MAX_STORY),
    '',
    'Templates:',
    ...blocks,
  ].join('\n')
}

function parseJson(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('no JSON in model output')
  return JSON.parse(text.slice(start, end + 1))
}

// Returns the cleaned body, or null when the model body fails validation.
function cleanBody(raw, tpl, form, lang) {
  if (typeof raw !== 'string') return null
  const body = raw.replace(/\r\n/g, '\n').trim()
  if (body.length < MIN_BODY || body.length > MAX_BODY) return null
  if (lang === 'en' && body.includes('[untuk ditambah]')) return null
  if (lang === 'bm' && body.includes('[to add]')) return null
  if (!body.toLowerCase().includes(tpl.name.toLowerCase())) return null
  const normal = (v) => String(v).toLowerCase().replace(/[^a-z0-9]/g, '')
  for (const key of SUSPECT_KEYS) {
    if (form[key] && !normal(body).includes(normal(form[key]))) return null
  }
  const amounts = bodyAmounts(body)
  if (form.amount !== null && form.amount !== undefined) {
    const expected = Number(formatAmountValue(form.amount).replace(/,/g, ''))
    if (amounts.some((a) => Number(a.replace(/,/g, '')) !== expected)) return null
  } else if (amounts.length) {
    return null
  }
  const disclaimer = lastLine(tpl.body)
  return body.endsWith(disclaimer) ? body : `${body}\n\n${disclaimer}`
}

function normalizeInput({ story, lang, form, institutions, templates }) {
  const text = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const normalizedForm = {}
  const src = form && typeof form === 'object' ? form : {}
  normalizedForm.amount = Number.isFinite(Number(src.amount)) && src.amount !== null && src.amount !== '' ? Number(src.amount) : null
  normalizedForm.occurred_at = text(src.occurred_at)
  normalizedForm.contact_method = text(src.contact_method)
  for (const key of SUSPECT_KEYS) normalizedForm[key] = text(src[key])
  const bySlug = new Map()
  for (const inst of Array.isArray(institutions) ? institutions : []) {
    if (inst && typeof inst.slug === 'string') bySlug.set(inst.slug, inst)
  }
  const cleanTemplates = templates
    .filter(
      (t) =>
        t &&
        typeof t.slug === 'string' &&
        t.slug &&
        typeof t.body === 'string' &&
        typeof t.subject === 'string',
    )
    .map((t) => {
      const inst = bySlug.get(t.slug)
      return {
        slug: t.slug,
        name: typeof t.name === 'string' && t.name ? t.name : inst?.name || t.slug,
        type: typeof t.type === 'string' ? t.type : inst?.type || 'other',
        subject: t.subject,
        body: t.body,
      }
    })
  return { story: text(story) || '', lang: lang === 'bm' ? 'bm' : 'en', form: normalizedForm, templates: cleanTemplates }
}

export async function buildReports({
  story,
  lang,
  form,
  institutions,
  templates,
  apiKey,
  model,
  fetchImpl = fetch,
}) {
  if (!Array.isArray(templates) || !templates.length) throw new Error('templates are required')
  const input = normalizeInput({ story, lang, form, institutions, templates })
  if (!input.templates.length) throw new Error('templates with slug, subject and body are required')

  const fallback = templateResult(input.templates)
  if (!apiKey) return fallback

  const modelId = model || process.env.AI_STUDIO_MODEL || DEFAULT_MODEL
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEADLINE_MS)
  let text
  try {
    const res = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(input) }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            thinkingConfig: { thinkingBudget: 0 },
            maxOutputTokens: 4096,
          },
        }),
      },
    )
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return fallback
    text = (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('')
  } catch {
    return fallback
  } finally {
    clearTimeout(timer)
  }

  let parsed
  try {
    parsed = parseJson(text)
  } catch {
    return fallback
  }

  const returned = new Map()
  for (const r of Array.isArray(parsed.reports) ? parsed.reports : []) {
    if (r && typeof r.slug === 'string') returned.set(r.slug, r.body)
  }
  const reports = input.templates.map((tpl) => {
    const body = cleanBody(returned.get(tpl.slug), tpl, input.form, input.lang)
    return { slug: tpl.slug, subject: tpl.subject, body: body || tpl.body }
  })
  const statement =
    typeof parsed.statement === 'string' && parsed.statement.trim()
      ? parsed.statement.trim().slice(0, MAX_STATEMENT)
      : null

  // Nothing passed validation — behave exactly like the template path.
  const anyAi = input.templates.some((tpl, i) => reports[i].body !== tpl.body)
  return { source: anyAi ? 'ai' : 'template', statement: anyAi ? statement : null, reports }
}
