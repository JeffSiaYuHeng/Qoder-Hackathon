// Asks the server to rewrite the template reports. Resolves to { source, statement, reports }.
export async function draftReports({ story, lang, form, institutions, templates }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  try {
    const res = await fetch('/api/report', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ story, lang, form, institutions, templates }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `Report drafting failed (${res.status})`)
    return json
  } finally {
    clearTimeout(timer)
  }
}
