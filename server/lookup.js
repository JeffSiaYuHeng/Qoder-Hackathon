// Grounding is ~30-90s on gemini-3.8-flash but ~3s on 3.5-flash-lite (measured 2026-11-19).
const DEFAULT_MODEL = 'gemini-3.5-flash-lite'
const TIMEOUT_MS = 8000

// HACK: hardcoded allowlist — registry table has no official_domains column yet.
// Domains checked against official sites 2026-11-19.
const OFFICIAL_DOMAINS = {
  'maybank': ['maybank2u.com.my', 'maybank.com.my', 'maybank.com'],
  'cimb': ['cimb.com.my', 'cimb.com', 'cimbclicks.com.my'],
  'public-bank': ['pbebank.com', 'publicbank.com.my'],
  'rhb': ['rhbgroup.com', 'rhbgroup.com.my'],
  'hong-leong': ['hlb.com.my', 'hlbb.hongleong.com.my', 'hongleong.com.my'],
  'tng-ewallet': ['tngdigital.com.my', 'touchngo.com.my'],
  'shopee': ['shopee.com.my', 'shopee.com'],
}

function isOfficial(url, domains) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return domains.some((d) => host === d || host.endsWith('.' + d))
  } catch {
    return false
  }
}

function extractUrls(json) {
  const urls = []
  const text = (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join(' ')
  for (const m of text.matchAll(/https?:\/\/[^\s"'<>)\]]+/g)) urls.push(m[0])
  for (const chunk of json.candidates?.[0]?.groundingMetadata?.groundingChunks || []) {
    const uri = chunk.web?.uri
    // Google's grounding redirect links are not candidate sites.
    if (uri && !uri.includes('vertexaisearch.cloud.google.com')) urls.push(uri)
  }
  return [...new Set(urls)]
}

async function urlIsLive(url, fetchImpl) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetchImpl(url, { signal: controller.signal, redirect: 'follow' })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

async function lookupOne(inst, { apiKey, model, fetchImpl }) {
  const domains = OFFICIAL_DOMAINS[inst.slug] || []
  const log = [`Searching official fraud channels for ${inst.name}…`]
  const base = {
    slug: inst.slug,
    name: inst.name,
    hotline: inst.hotline,
    support_email: inst.support_email,
    report_url: inst.report_url,
    fraud_page_url: inst.report_url,
    source: 'registry',
    rejected_domains: [],
  }
  if (!apiKey || !domains.length) {
    log.push(`${inst.name}: using verified registry data.`)
    return { result: base, log }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let json
  try {
    const res = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Search the web for the official ${inst.name} Malaysia fraud/scam report page. Reply with only the single best official URL, nothing else.`,
                },
              ],
            },
          ],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0 },
        }),
      },
    )
    json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error?.message || `AI Studio error ${res.status}`)
  } catch (err) {
    log.push(`${inst.name}: live lookup failed (${err.name === 'AbortError' ? 'timeout 8s' : err.message}) — using verified registry.`)
    return { result: base, log }
  } finally {
    clearTimeout(timer)
  }

  const rejected = new Set()
  let accepted = null
  for (const url of extractUrls(json)) {
    if (isOfficial(url, domains)) {
      accepted = accepted || url
    } else {
      try {
        rejected.add(new URL(url).hostname.replace(/^www\./, ''))
      } catch {
        /* not a URL */
      }
    }
  }
  for (const d of rejected) log.push(`${inst.name}: skipped ${d} — not an official domain.`)
  if (accepted) {
    // The model can invent plausible URLs on official domains; only show pages that respond.
    if (await urlIsLive(accepted, fetchImpl)) {
      log.push(`${inst.name}: verified ${accepted} (official domain, live).`)
      return { result: { ...base, fraud_page_url: accepted, source: 'live', rejected_domains: [...rejected] }, log }
    }
    log.push(`${inst.name}: candidate page did not respond — keeping verified registry page.`)
  } else {
    log.push(`${inst.name}: no official page found live — using verified registry.`)
  }
  return { result: { ...base, rejected_domains: [...rejected] }, log }
}

export async function lookupChannels({ institutions, apiKey, model, fetchImpl = fetch }) {
  if (!Array.isArray(institutions) || !institutions.length) throw new Error('institutions are required')
  const modelId = model || process.env.LOOKUP_MODEL || DEFAULT_MODEL
  const settled = await Promise.all(
    institutions.map((inst) => lookupOne(inst, { apiKey, model: modelId, fetchImpl })),
  )
  return {
    log: settled.flatMap((s) => s.log),
    results: settled.map((s) => s.result),
  }
}