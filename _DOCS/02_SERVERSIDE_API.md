# 02 — Server-Side API

The browser reads the public `institutions` registry from Supabase (anon key) and calls five Vercel functions: `/api/stt`, `/api/analyze`, `/api/report`, `/api/lookup`, `/api/send`. All are mirrored in the Vite dev server. There is no auth and no incident write.

## Configuration

`src/lib/supabase.js` creates one client and throws if env is missing:

```js
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
```

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | browser bundle | Supabase REST/Auth base URL |
| `VITE_SUPABASE_ANON_KEY` | browser bundle | Public anon key (RLS still applies in production) |
| `AI_STUDIO_API` | server only | Google AI Studio key for `/api/stt`, `/api/analyze`, `/api/report`, `/api/lookup` — never `VITE_*` |
| `AI_STUDIO_MODEL` | server only | Optional model override; defaults to `gemini-3.8-flash` |
| `RESEND_API_KEY` | server only | `/api/send` email delivery |
| `SEND_FROM` | server only | Optional sender; defaults to `ScamSOS <onboarding@resend.dev>` |
| `DEMO_MODE` | server only | `true` redirects every email to `DEMO_INBOX` |
| `DEMO_INBOX` | server only | Where demo emails land |

Vite inlines `VITE_*` into the client bundle — treat them as public. Never put the `service_role` / `sb_secret_*` key in a `VITE_*` var or anywhere in `src/`.

## Auth

None. The app is guest-only: no sign-in screen, no Supabase session, no `user_id`, and no auth calls. `src/lib/supabase.js` is used only to read the public `institutions` registry.

## Data calls (PostgREST via supabase-js)

| Operation | Where | Equivalent |
| --- | --- | --- |
| Load registry | `src/InstitutionPicker.jsx` | `select * from institutions order by name` |

There are no incident writes. An incident is a React-state object (`crypto.randomUUID()` id, `created_at`, form fields, `steps`, `call_script`, `reports`, optional `statement`) that disappears on reload. The `incidents`, `incident_institutions`, and `action_steps` tables remain in the schema but are unused.

## Client-side plan builder (not an API)

`src/lib/plan.js` → `buildActionPlan(form, institutions, t, locale)` is a **pure function** that runs in the browser. It returns:

```js
{
  steps:       [{ title, action, value, urgency }], // ordered
  call_script: string,
  reports:     [{ slug, name, type, to, subject, body, mailto }], // one per institution
  summary:     { amount, when, institutions, step_count },
}
```

The steps, call script and report templates are deterministic. The reports are then sent to `/api/report` for an AI rewrite; the rendered plan uses the templates until (and unless) the AI version arrives.

## Speech-to-text — `POST /api/stt` (implemented)

The intake screen records the mic, decodes the recording, resamples it to **16 kHz mono WAV**, base64-encodes it and posts JSON to the same origin. The browser never sees the API key.

| Endpoint | Request | Response |
| --- | --- | --- |
| `POST /api/stt` | `{ "audio": "<base64 WAV>", "mimeType": "audio/wav" }` | `{ "text": "…" }` or `400 { "error": "…" }` |

Files: `src/IntakeForm.jsx` (opens the dialog, appends transcripts) → `src/VoiceDialog.jsx` (hold-to-talk UI + state machine) → `src/lib/stt.js` (record + encode + fetch) → `api/stt.js` (Vercel) / `vite.config.js` middleware (dev) → `server/stt.js` (Gemini call).

### Control flow, end to end

**1. Open the dialog.** The intake screen's "Speak instead of typing" button sets `voiceOpen`, rendering `VoiceDialog` as a modal (backdrop click, `Close`, or Escape dismisses it). The dialog owns a four-phase state machine: `idle → recording → transcribing → done`, mirrored in a ref so pointer/timer callbacks never read stale state.

**2. Hold to record.** `pointerdown` on the mic button (or holding Space/Enter) sets `holdingRef` and calls `startRecording()` (`src/lib/stt.js`):

- Checks `navigator.mediaDevices.getUserMedia` exists; if not, throws `Microphone is not available in this browser`.
- Requests the mic with `{ echoCancellation: true, noiseSuppression: true }` — this is the browser permission prompt.
- Picks the first supported MIME from `['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']` and constructs a `MediaRecorder` on the stream.
- Collects `ondataavailable` chunks and builds a `stopped` promise resolved on the recorder's `stop` event with `new Blob(chunks, …)`.
- Returns `{ stop(), cancel() }`; both stop the recorder and release the mic tracks (`track.stop()`).

If the user releases **while the permission prompt is still open**, `holdingRef` is already false when the stream arrives, so the recorder is cancelled immediately and nothing is sent. On success the phase becomes `recording` (mic turns brand-red with a pulsing ring + equalizer bars) and a **60 s `setTimeout`** arms `endHold()`. On any throw, `voiceError` shows inline and the phase returns to `idle`.

**3. Release to stop.** Every exit converges on `endHold()`:

| Trigger | Path |
| --- | --- |
| `pointerup` (finger/mouse released) | `endHold()` |
| Pointer slides off the button / `pointercancel` | `endHold()` — same as release |
| 60 s cap reached | timer → `endHold()` |
| Dialog closed / screen unmounts | cleanup effect → `recorderRef.cancel()` — mic released, **no transcription** |

`endHold()` clears the timer, guards on phase `recording`, sets `transcribing` (spinner replaces the mic icon, button disabled), then awaits `recorder.stop()` → the recorded `Blob`.

**4. Encode (browser).** `transcribeBlob(blob)` (`src/lib/stt.js`):

- Rejects blobs under 1000 bytes with `Recording was too short`.
- `blobToWavBase64()`: `AudioContext.decodeAudioData()` decodes the compressed recording (context closed in `finally`), then an `OfflineAudioContext(1, ceil(duration × 16000), 16000)` renders it as **16 kHz mono** — the browser does the resampling, no server work.
- `audioBufferToWavBase64()`: writes a 44-byte RIFF/WAVE header, converts clamped float samples to 16-bit little-endian PCM, and `btoa()`s in 32 KB chunks. Result ≈ **32 KB per second** of audio (~2 MB at the 60 s cap) instead of ~190 KB/s for 48 kHz stereo float.
- `fetch('/api/stt', { method: 'POST', body: JSON.stringify({ audio, mimeType: 'audio/wav' }) })`. Non-2xx → throws `json.error` or `Transcription failed (<status>)`.

**5. Receive (same handler in dev and prod).**

- **Dev** — `sttDevApi` middleware in `vite.config.js`: 405 for non-POST, accumulates the raw body and **destroys the request past 12 MB**, `JSON.parse`s it, calls `transcribeAudio()` with `env.AI_STUDIO_API` (`loadEnv(mode, cwd, '')` loads non-`VITE_` vars too). Errors → 400 `{ error }`.
- **Prod** — `api/stt.js` Vercel function: same 405/400 shape, parses `req.body` if it arrived as a string, reads `process.env.AI_STUDIO_API`.

Both delegate to the identical core, so dev and prod behaviour match.

**6. Transcribe (server core).** `transcribeAudio()` in `server/stt.js`, validation in this order:

1. `apiKey` missing → `AI_STUDIO_API is not set`
2. `audioBase64` missing → `audio is required`
3. base64 longer than 8 Mi chars (~6 MB) → `audio is too large (max ~6 MB)`
4. `mimeType` not `audio/*` → `mimeType must be an audio/* type`

Model resolution: explicit `model` arg → `process.env.AI_STUDIO_MODEL` → `gemini-3.8-flash`. Then one `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=…` with `contents[0].parts = [{ text: PROMPT }, { inline_data: { mime_type, data } }]` and `generationConfig.temperature = 0`. The prompt demands an exact transcript, no commentary, no translation, names/amounts/numbers preserved.

Non-2xx → throws the upstream `error.message` (or `AI Studio error <status>`). Otherwise it joins `candidates[0].content.parts[].text`, trims, and throws `No transcript returned` if empty.

**7. Back in the dialog and form.** `{ text }` is passed to `IntakeForm`'s `addTranscript`, which **appends** it to `victim_summary` immediately — existing typed text is kept, transcript added after a space. The dialog enters `done`: it shows the transcript under "Added to your story" with **Record again** (back to `idle`, appends another clip) and **Done** (closes). The `finally` block nulls `recorderRef`. Any error from steps 4–6 lands in `voiceError` inline and the phase returns to `idle`; the textarea behind the dialog stays typeable throughout. The audio itself is never persisted — only the transcript text ends up in the incident.

### UI state (dialog phases)

| Phase | Mic button | Animation | Status line |
| --- | --- | --- | --- |
| `idle` | enabled, mic icon | none | Hold the button to speak |
| `recording` | held, brand-red | pulsing ring (`voice-pulse`) + 5 equalizer bars (`voice-bar`) | Listening… release to transcribe |
| `transcribing` | disabled | spinner (`voice-spin`) | Transcribing… |
| `done` | enabled | none | transcript card + Record again / Done |

Animation CSS lives in `src/index.css` (`.voice-mic`, `.voice-mic-live`, `.voice-bars`, `.voice-spinner` + keyframes). Labels are i18n keys (`voiceSpeak`, `voiceTitle`, `voiceHold`, `voiceRelease`, `voiceTranscribing`, `voiceAdded`, `voiceAgain`, `voiceDone`, `voiceClose`, `voiceHint`, `voiceError`) in `src/lib/i18n.js`. The mic button uses `touch-action: none` and suppresses the context menu so long-press on mobile records instead of selecting text.

### Limits and failure modes

| Limit / failure | Where | Behaviour |
| --- | --- | --- |
| 60 s recording cap | `VoiceDialog.jsx` timer | auto-release, then normal transcription |
| < 1000-byte blob | `transcribeBlob()` | `Recording was too short` inline |
| > 12 MB raw request | dev middleware only | connection destroyed |
| > 8 Mi base64 chars | `transcribeAudio()` | 400 `audio is too large` |
| Mic denied / unavailable | `startRecording()` | inline `voiceError`, type instead |
| Missing key / bad MIME / empty output | `transcribeAudio()` | 400 with the message, inline `voiceError` |
| Upstream 4xx/5xx | Gemini response | 400 with upstream message |

No retry and no queue: one tap = one recording = one request. `fetchImpl` is injectable in `transcribeAudio()` for tests.

## Serverless endpoints (implemented)

Vercel runs `api/*.js` next to the Vite build; no extra config. Keys stay server-side. All four handlers are also mounted by `vite.config.js` for `npm run dev`.

| Endpoint | Request | Response |
| --- | --- | --- |
| `POST /api/analyze` | `{ story }` | `{ scam_type, fields, detected, missing }` |
| `POST /api/report` | `{ story, lang, form, institutions, templates }` | `{ source: "ai" \| "template", statement, reports }` |
| `POST /api/lookup` | `{ institution_ids }` | `{ log, results }` |
| `POST /api/send` | `{ user_email, reports, pdf_base64?, pdf_filename? }` | `[{ institution_id, status, to?, error? }]` |

Rules:

- `/api/report` uses the same Gemini key/model as analyze (`AI_STUDIO_API`, default `gemini-3.8-flash`). It validates every rewritten body (slug, institution name, provided suspect fields, amount). Missing key, timeout (20 s), or invalid output returns the templates unchanged with `source: "template"` — the UI never blocks on it.
- `/api/analyze` extracts only stated facts and chooses detected institutions from the registry; nulls stay null.
- `/api/send` resolves the recipient address and attachment rules from the registry **server-side**; never trust an address from the browser. The optional PDF is validated (base64, ≤ 4 MB, `.pdf` filename) before any send.
- `/api/lookup` accepts a URL only if its domain is in the institution's official allow-list; phone numbers and emails always come from the registry. It times out at 8 s and falls back to registry data.
- `DEMO_MODE=true` redirects all email to the team inbox with a `[DEMO for …]` subject prefix.

## Security notes

- With RLS off, anyone holding the anon key (it ships in the bundle) can read and write all tables. The app now only reads the `institutions` registry and writes nothing, but the key still allows writes — do not leave this on for anything real.
- The AI Studio and Resend keys stay in the function / Vite middleware; they are not in the client bundle.
- No Supabase Edge Functions, no database RPCs, no custom CORS config in the repo.
- Server-side secrets today: `AI_STUDIO_API` (and optional `AI_STUDIO_MODEL`), read only inside `/api/stt`. Everything else is public client code.
