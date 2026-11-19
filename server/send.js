const TIMEOUT_MS = 10000
const DEFAULT_FROM = 'ScamSOS <onboarding@resend.dev>'

// Sends one email per report via Resend. `To` always comes from the server-side
// registry, never from the browser. DEMO_MODE redirects everything to the team inbox.
export async function sendReports({
  userEmail,
  reports,
  institutions,
  apiKey,
  demoMode = false,
  demoInbox,
  from,
  fetchImpl = fetch,
}) {
  if (!apiKey) throw new Error('RESEND_API_KEY is not set — use the mailto drafts instead')
  if (typeof userEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
    throw new Error('a valid user_email is required')
  }
  if (!Array.isArray(reports) || !reports.length) throw new Error('reports are required')
  if (demoMode && !demoInbox) throw new Error('DEMO_INBOX is not set')

  const bySlug = new Map(institutions.map((i) => [i.slug, i]))
  const results = []
  for (const report of reports) {
    const inst = bySlug.get(report.institution_id)
    if (!inst || typeof report.subject !== 'string' || typeof report.body !== 'string') {
      results.push({ institution_id: report.institution_id, status: 'failed', error: 'unknown institution or invalid report' })
      continue
    }
    const intended = inst.support_email
    if (!demoMode && !intended) {
      results.push({ institution_id: inst.slug, status: 'failed', error: 'no official email — use the fraud page instead' })
      continue
    }
    const to = demoMode ? demoInbox : intended
    const subject = demoMode
      ? `[DEMO for ${inst.name}${intended ? ` <${intended}>` : ' (no official email)'}] ${report.subject}`
      : report.subject

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          from: from || DEFAULT_FROM,
          to: [to],
          cc: [userEmail],
          reply_to: userEmail,
          subject,
          text: report.body,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message || `Resend error ${res.status}`)
      results.push({ institution_id: inst.slug, status: 'sent', to })
    } catch (err) {
      results.push({
        institution_id: inst.slug,
        status: 'failed',
        error: err.name === 'AbortError' ? 'timeout' : err.message,
      })
    } finally {
      clearTimeout(timer)
    }
  }
  return results
}