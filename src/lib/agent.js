import { DEMO_MODE, CANNED_ANALYSIS, cannedLookup } from './demo'

export async function analyzeStory(story) {
  if (DEMO_MODE) return CANNED_ANALYSIS
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

export async function sendAllReports(userEmail, reports, pdf) {
  const res = await fetch('/api/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      user_email: userEmail,
      reports: reports.map((r) => ({ institution_id: r.slug, subject: r.subject, body: r.body })),
      ...(pdf ? { pdf_base64: pdf.pdfBase64, pdf_filename: pdf.pdfFilename } : {}),
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Send failed (${res.status})`)
  return json
}