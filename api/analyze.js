import { analyzeStory } from '../server/analyze.js'
import { fetchRegistry } from '../server/registry.js'

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
    const institutions = await fetchRegistry({
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      supabaseKey: process.env.VITE_SUPABASE_ANON_KEY,
    })
    const result = await analyzeStory({
      story: body?.story,
      institutions,
      apiKey: process.env.AI_STUDIO_API,
    })
    res.status(200).json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}