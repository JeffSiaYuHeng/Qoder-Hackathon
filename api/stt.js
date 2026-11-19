import { transcribeAudio } from '../server/stt.js'

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
    const text = await transcribeAudio({
      audioBase64: body?.audio,
      mimeType: body?.mimeType,
      apiKey: process.env.AI_STUDIO_API,
    })
    res.status(200).json({ text })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}
