import { lookupChannels } from '../server/lookup.js'
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
    const all = await fetchRegistry({
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      supabaseKey: process.env.VITE_SUPABASE_ANON_KEY,
    })
    const ids = Array.isArray(body?.institution_ids) ? body.institution_ids : []
    const institutions = all.filter((i) => ids.includes(i.slug))
    if (!institutions.length) return res.status(400).json({ error: 'no matching institutions' })
    const result = await lookupChannels({ institutions, apiKey: process.env.AI_STUDIO_API })
    res.status(200).json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}