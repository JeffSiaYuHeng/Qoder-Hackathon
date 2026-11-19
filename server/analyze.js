const DEFAULT_MODEL = 'gemini-3.8-flash'
const MAX_STORY_CHARS = 8000
const TIMEOUT_MS = 20000

const METHODS = ['call', 'whatsapp', 'sms', 'social', 'marketplace', 'other']
const FIELD_KEYS = ['amount', 'occurred_at', 'contact_method', 'scammer_phone', 'scammer_account', 'transaction_ref']

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    scam_type: { type: 'string', nullable: true },
    amount: { type: 'number', nullable: true },
    occurred_at: { type: 'string', nullable: true },
    contact_method: { type: 'string', nullable: true },
    scammer_phone: { type: 'string', nullable: true },
    scammer_account: { type: 'string', nullable: true },
    transaction_ref: { type: 'string', nullable: true },
    detected: { type: 'array', items: { type: 'string' } },
    missing: { type: 'array', items: { type: 'string' } },
  },
  required: ['scam_type', 'amount', 'occurred_at', 'contact_method', 'scammer_phone', 'scammer_account', 'transaction_ref', 'detected', 'missing'],
}

function buildPrompt(story, institutions) {
  const list = institutions.map((i) => `${i.slug} (${i.name}, ${i.type})`).join('; ')
  const nowMYT = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16) + '+08:00'
  return [
    'You extract structured data from a scam victim\'s story. The victim may write in English or Malay.',
    `Current date/time in Malaysia (UTC+8): ${nowMYT}. Resolve relative times like "today" or "yesterday" against it.`,
    'Rules:',
    '- Extract ONLY facts explicitly stated in the story. NEVER guess or invent values. Unknown = null.',
    '- amount: the money lost, as a number in MYR (RM). Null if not stated.',
    '- occurred_at: ISO 8601 with +08:00 timezone if a date/time is stated; null otherwise. Do not use today\'s date unless the story says today.',
    `- contact_method: exactly one of ${METHODS.join(', ')}; null if unclear.`,
    '- scammer_phone / scammer_account / transaction_ref: copy exactly as written; null if absent.',
    `- detected: slugs of institutions involved, chosen ONLY from this list: ${list}. Include the victim's bank and any platform/e-wallet mentioned. Empty array if none.`,
    `- missing: the subset of ${FIELD_KEYS.join(', ')} whose value is null.`,
    '- scam_type: short label like parcel_courier, phishing, investment, impersonation, marketplace, other.',
    '',
    'Story:',
    story,
  ].join('\n')
}

function sanitize(raw, institutions) {
  const slugs = new Set(institutions.map((i) => i.slug))
  const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const amount = typeof raw.amount === 'number' && raw.amount >= 0 ? raw.amount : null
  let occurredAt = str(raw.occurred_at)
  if (occurredAt && Number.isNaN(new Date(occurredAt).getTime())) occurredAt = null
  const fields = {
    amount,
    occurred_at: occurredAt,
    contact_method: METHODS.includes(raw.contact_method) ? raw.contact_method : null,
    scammer_phone: str(raw.scammer_phone),
    scammer_account: str(raw.scammer_account),
    transaction_ref: str(raw.transaction_ref),
  }
  return {
    scam_type: str(raw.scam_type) || 'other',
    fields,
    detected: Array.isArray(raw.detected) ? raw.detected.filter((s) => slugs.has(s)) : [],
    missing: FIELD_KEYS.filter((k) => fields[k] === null),
  }
}

export async function analyzeStory({ story, institutions, apiKey, model, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('AI_STUDIO_API is not set')
  if (typeof story !== 'string' || !story.trim()) throw new Error('story is required')
  if (story.length > MAX_STORY_CHARS) throw new Error('story is too long')
  if (!Array.isArray(institutions) || !institutions.length) throw new Error('institutions list is required')

  const modelId = model || process.env.AI_STUDIO_MODEL || DEFAULT_MODEL
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let res
  try {
    res = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(story.trim(), institutions) }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    )
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('analysis timed out')
    throw err
  } finally {
    clearTimeout(timer)
  }

  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error?.message || `AI Studio error ${res.status}`)
  const text = (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('')
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('analysis returned invalid JSON')
  }
  return sanitize(raw, institutions)
}