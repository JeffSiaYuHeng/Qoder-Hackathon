import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { transcribeAudio } from './server/stt.js'
import { analyzeStory } from './server/analyze.js'
import { lookupChannels } from './server/lookup.js'
import { sendReports } from './server/send.js'
import { buildReports } from './server/report.js'
import { fetchRegistry } from './server/registry.js'

// Runs the api/*.js handlers locally so `npm run dev` works without `vercel dev`.
function devApi(env) {
  const registry = () =>
    fetchRegistry({ supabaseUrl: env.VITE_SUPABASE_URL, supabaseKey: env.VITE_SUPABASE_ANON_KEY })

  const routes = {
    '/api/stt': async (body) => ({
      text: await transcribeAudio({
        audioBase64: body.audio,
        mimeType: body.mimeType,
        apiKey: env.AI_STUDIO_API,
      }),
    }),
    '/api/analyze': async (body) =>
      analyzeStory({ story: body.story, institutions: await registry(), apiKey: env.AI_STUDIO_API }),
    '/api/lookup': async (body) => {
      const all = await registry()
      const ids = Array.isArray(body.institution_ids) ? body.institution_ids : []
      const institutions = all.filter((i) => ids.includes(i.slug))
      if (!institutions.length) throw new Error('no matching institutions')
      return lookupChannels({ institutions, apiKey: env.AI_STUDIO_API })
    },
    '/api/send': async (body) =>
      sendReports({
        userEmail: body.user_email,
        reports: body.reports,
        institutions: await registry(),
        apiKey: env.RESEND_API_KEY,
        demoMode: env.DEMO_MODE === 'true',
        demoInbox: env.DEMO_INBOX,
        from: env.SEND_FROM,
        pdfBase64: body.pdf_base64,
        pdfFilename: body.pdf_filename,
      }),
    '/api/report': async (body) =>
      buildReports({
        story: body.story,
        lang: body.lang,
        form: body.form,
        institutions: body.institutions,
        templates: body.templates,
        apiKey: env.AI_STUDIO_API,
        model: env.AI_STUDIO_MODEL,
      }),
  }

  return {
    name: 'dev-api',
    configureServer(server) {
      for (const [path, handle] of Object.entries(routes)) {
        server.middlewares.use(path, (req, res) => {
          res.setHeader('content-type', 'application/json')
          if (req.method !== 'POST') {
            res.statusCode = 405
            return res.end(JSON.stringify({ error: 'POST only' }))
          }
          let raw = ''
          req.on('data', (chunk) => {
            raw += chunk
            if (raw.length > 12 * 1024 * 1024) req.destroy()
          })
          req.on('end', async () => {
            try {
              const body = JSON.parse(raw || '{}')
              res.end(JSON.stringify(await handle(body)))
            } catch (err) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: err.message }))
            }
          })
        })
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), devApi(env)],
  }
})