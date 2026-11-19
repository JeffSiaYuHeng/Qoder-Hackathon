import { sendReports } from '../server/send.js'
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
    const results = await sendReports({
      userEmail: body?.user_email,
      reports: body?.reports,
      institutions,
      apiKey: process.env.RESEND_API_KEY,
      demoMode: process.env.DEMO_MODE === 'true',
      demoInbox: process.env.DEMO_INBOX,
      from: process.env.SEND_FROM,
    })
    res.status(200).json(results)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}