# 02 — Server-Side API

The browser talks straight to Supabase (PostgREST + Auth) with the public anon key. One custom endpoint exists — `POST /api/stt` (Vercel function, mirrored in the Vite dev server). The remaining planned `/api` functions in [04_PRD.md](04_PRD.md) are not built yet.

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
| `AI_STUDIO_API` | server only | Google AI Studio key for `/api/stt` — never `VITE_*` |
| `AI_STUDIO_MODEL` | server only | Optional model override; defaults to `gemini-3.8-flash` |

Vite inlines `VITE_*` into the client bundle — treat them as public. Never put the `service_role` / `sb_secret_*` key in a `VITE_*` var or anywhere in `src/`.

`AI_STUDIO_API` / `AI_STUDIO_MODEL` are used by `/api/stt`. Still planned but unused: `ANTHROPIC_API_KEY` (or other LLM), `RESEND_API_KEY` (or other email service), `DEMO_MODE`, `DEMO_INBOX`.

## Auth (Supabase Auth)

| Call | Where | Notes |
| --- | --- | --- |
| `supabase.auth.getSession()` | `src/App.jsx` | Restores the session on load |
| `supabase.auth.onAuthStateChange(cb)` | `src/App.jsx` | Keeps `session` in sync; unsubscribed on unmount |
| `supabase.auth.signInWithPassword({ email, password })` | `src/AuthScreen.jsx` | Email/password sign-in |
| `supabase.auth.signOut()` | `src/App.jsx` | Topbar "Sign out" |

`src/AuthScreen.jsx` has a hardcoded demo account behind a "Use demo account" button (marked `HACK`). Do not reuse that pattern outside the demo.

There is no sign-up flow and no password reset. Users must already exist in Supabase Auth.

**Guest mode** bypasses auth entirely. `App.jsx` keeps a `guest` flag in `sessionStorage` (`scamsos.guest`), and guest incidents insert with `user_id: null`. With RLS off, the anon key can write without a session, so guest filing works with no account or profile. Signing in clears the guest flag.

## Data calls (PostgREST via supabase-js)

| Operation | Where | Equivalent |
| --- | --- | --- |
| Load registry | `src/InstitutionPicker.jsx` | `select * from institutions order by name` |
| Create incident | `src/App.jsx` `submitIntake()` | `insert into incidents (...) returning *` |
| Link institutions | `src/App.jsx` `submitIntake()` | `insert into incident_institutions (...)` for each selected |
| Save steps | `src/App.jsx` `submitIntake()` | `insert into action_steps (...) returning *` |
| Tick a step | `src/App.jsx` `toggleStep()` | `update action_steps set done = $1 where id = $2` |

Payloads match the columns in [01_DATA_SCHEMA.md](01_DATA_SCHEMA.md), including `user_id` (FK to `auth.users`, or `null` in guest mode).

Errors are caught per call and surfaced in the screen's `error` state (`insertError.message`, `links.error`, etc.). There is no retry and no transaction: if the incident insert succeeds but the links/steps insert fails, you are left with a partial incident.

## Client-side plan builder (not an API)

`src/lib/plan.js` → `buildActionPlan(form, institutions)` is a **pure function** that runs in the browser. It returns:

```js
{
  steps:       [{ title, action, value, urgency }], // ordered
  call_script: string,
  summary:     { amount, when, institutions, step_count },
}
```

It is a rule-based stand-in for the LLM intake (`HACK` comment) and keeps the same output shape as [05_PRODUCT_PLAN.md](05_PRODUCT_PLAN.md) §5 so it can be swapped for a model call later.

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

## Planned serverless endpoints (not implemented)

From [04_PRD.md](04_PRD.md) §7–§8. Vercel runs `api/*.js` next to the Vite build; no extra config. Keys stay server-side.

| Endpoint | Request | Response |
| --- | --- | --- |
| `POST /api/analyze` | `{ story, quick_fields }` | `{ incident, call_script }` |
| `POST /api/lookup` | `{ institution_ids }` | streamed log lines, then `[{ id, fraud_page_url, source, rejected_domains }]` |
| `POST /api/send` | `{ user_email, reports: [{ institution_id, subject, body }] }` | `[{ institution_id, status: "sent" \| "failed" }]` |

Rules the PRD imposes on these:

- `/api/send` resolves the recipient address from the registry **server-side**; never trust an address from the browser.
- `/api/lookup` accepts a URL only if its domain is in the institution's official allow-list; phone numbers and emails always come from the registry.
- `/api/lookup` times out at 8 s and falls back to registry data.
- `DEMO_MODE=true` redirects all email to the team inbox.

## Security notes

- With RLS off, anyone holding the anon key (it ships in the bundle) can read and write all tables, including incident stories. Do not leave this on for anything real.
- The AI Studio key stays in the function / Vite middleware; it is not in the client bundle.
- No Supabase Edge Functions, no database RPCs, no custom CORS config in the repo.
- Server-side secrets today: `AI_STUDIO_API` (and optional `AI_STUDIO_MODEL`), read only inside `/api/stt`. Everything else is public client code.
