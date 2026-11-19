const DEFAULT_MODEL = 'gemini-3.8-flash'
const MAX_BASE64_CHARS = 8 * 1024 * 1024
const PROMPT =
  'Transcribe this audio exactly as spoken. Return only the transcript text, no commentary. ' +
  'Preserve names, amounts, phone numbers and URLs. Do not translate.'

export async function transcribeAudio({ audioBase64, mimeType, apiKey, model, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('AI_STUDIO_API is not set')
  if (!audioBase64) throw new Error('audio is required')
  if (audioBase64.length > MAX_BASE64_CHARS) throw new Error('audio is too large (max ~6 MB)')
  if (typeof mimeType !== 'string' || !mimeType.startsWith('audio/')) {
    throw new Error('mimeType must be an audio/* type')
  }

  const modelId = model || process.env.AI_STUDIO_MODEL || DEFAULT_MODEL
  const res = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: audioBase64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0 },
      }),
    },
  )

  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error?.message || `AI Studio error ${res.status}`)

  const text = (json.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('')
    .trim()
  if (!text) throw new Error('No transcript returned')
  return text
}
