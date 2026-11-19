import { buildReports } from '../server/report.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      return res.status(400).json({ error: 'invalid JSON' })
    }
  }

  try {
    const result = await buildReports({
      story: body?.story,
      lang: body?.lang,
      form: body?.form,
      institutions: body?.institutions,
      templates: body?.templates,
      apiKey: process.env.AI_STUDIO_API,
      model: process.env.AI_STUDIO_MODEL,
    })
    res.status(200).json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}
