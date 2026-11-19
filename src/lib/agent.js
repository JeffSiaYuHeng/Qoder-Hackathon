import { DEMO_MODE, CANNED_ANALYSIS, cannedLookup } from './demo'

// The voice autofill (IntakeForm) and the submit step (App) both analyse the story. Cache by text
// so an unchanged story costs one Gemini call, not two. Failed calls are not cached.
const analysisCache = new Map()

export function analyzeStory(story) {
  if (DEMO_MODE) return Promise.resolve(CANNED_ANALYSIS)
  const key = story.trim()
  if (!analysisCache.has(key)) {
    analysisCache.set(key, requestAnalysis(key).catch((err) => {
      analysisCache.delete(key)
      throw err
    }))
  }
  return analysisCache.get(key)
}

async function requestAnalysis(story) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ story }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Analysis failed (${res.status})`)
  return json
}

export async function lookupInstitutions(institutions) {
  if (DEMO_MODE) return cannedLookup(institutions)
  const res = await fetch('/api/lookup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ institution_ids: institutions.map((i) => i.slug) }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Lookup failed (${res.status})`)
  return json
}

export async function sendAllReports(userEmail, reports) {
  const res = await fetch('/api/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      user_email: userEmail,
      reports: reports.map((r) => ({ institution_id: r.slug, subject: r.subject, body: r.body })),
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Send failed (${res.status})`)
  return json
}