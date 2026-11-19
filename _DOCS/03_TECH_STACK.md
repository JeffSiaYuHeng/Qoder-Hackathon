# Tech Stack

Hackathon demo stack. One app, one process, boring tech — see [AGENTS.md](../AGENTS.md).

## Core

| Layer | Choice | Notes |
| --- | --- | --- |
| Frontend | React (plain JavaScript, no TypeScript) | Single-page app |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` | Theme tokens in `src/index.css`; printable-report CSS kept hand-written |
| Build tool | Vite | Instant dev server, zero config |
| Database | Supabase (hosted Postgres) | Accessed via `@supabase/supabase-js` |
| Hosting | Vercel | Already authenticated locally |

Supabase project: **scamsos**, ref `cxmzutazrqrykpnjgqnd`, region `ap-southeast-1` (Singapore).

> The older project `dnzuxidxonvfyhjaifbo` is paused beyond recovery and is not used.

## Layout

```
.
├── api/
│   └── stt.js            # Vercel function: speech-to-text
├── server/
│   └── stt.js            # shared Gemini transcription core (dev + prod)
├── db/
│   ├── schema.sql        # tables (apply via Supabase SQL editor or Management API)
│   └── seed.sql          # verified fallback contacts
├── index.html
├── src/
│   ├── main.jsx          # React entry + LangContext provider
│   ├── App.jsx           # stage state machine + Supabase reads/writes
│   ├── AuthScreen.jsx    # email/password sign-in (demo account hardcoded)
│   ├── InstitutionPicker.jsx
│   ├── IntakeForm.jsx
│   ├── VoiceDialog.jsx     # hold-to-talk mic dialog (pulse + bars animation)
│   ├── ActionPlan.jsx    # checklist, script, print report, mailto drafts
│   ├── index.css         # Tailwind entry, theme tokens, report + print CSS
│   └── lib/
│       ├── supabase.js   # single client export
│       ├── i18n.js       # EN/BM dictionary + useI18n
│       ├── stt.js        # mic recording → 16 kHz WAV → /api/stt
│       └── plan.js       # rule-based plan builder
├── .env.local            # real keys, never committed
├── .env.example
└── _DOCS/                # docs — see 00_STRUCTURE.md
```

## Environment variables

`.env.local` (gitignored) holds the real values:

```bash
VITE_SUPABASE_URL=https://cxmzutazrqrykpnjgqnd.supabase.co
VITE_SUPABASE_ANON_KEY=<legacy anon key>

# server-only — not exposed to the browser
AI_STUDIO_API=<Google AI Studio API key>
AI_STUDIO_MODEL=gemini-3.8-flash   # optional; this is the default
```

Vite only exposes `VITE_*` vars to the browser. The anon/publishable key is public by design; never put the `service_role`/`sb_secret_*` key in the frontend. `AI_STUDIO_API` must stay server-side — do **not** prefix it with `VITE_`.

## Commands

```bash
npm install          # install deps
npm run dev          # dev server → http://localhost:5173
npm run build        # production build
vercel deploy        # preview deploy
```

## User flow

1. **Sign in or continue as guest** — Supabase Auth email/password, "Use demo account" for one click, or "Continue as guest" to file without an account. Guest state persists in `sessionStorage` (`scamsos.guest`).
2. **Pick institutions** — banks / e-wallets / platforms (multi-select, loaded from `institutions`).
3. **Intake** — type the story or record it; the voice button transcribes through `/api/stt` (Google AI Studio). Plus amount, time, contact method, suspect details.
4. **Action plan** — rule-based builder (`src/lib/plan.js`) writes `incidents`, `incident_institutions` and `action_steps`; the screen renders `tel:` / web / map buttons, a call script, email drafts and a printable police report.
5. Step checkboxes persist `action_steps.done`.

## Language (i18n)

- Hand-rolled EN/BM dictionary in `src/lib/i18n.js` — no dependency.
- `LangContext` + `useI18n()` expose `lang`, `setLang`, `t`; choice persists in `localStorage` (`scamsos.lang`).
- The toggle is in the topbar (auth screen included). Dates use `en-MY` / `ms-MY`.
- Plan generation is localized at build time: step titles, call script and `mailto:` drafts are generated in the active language and stored that way.

## Speech-to-text (Google AI Studio)

- Intake has a "Speak instead of typing" button that opens `VoiceDialog.jsx`: **hold** the mic button to record, **release** to transcribe. While held, the mic pulses and equalizer bars animate; a spinner shows during transcription. The transcript appends straight into the story box and the dialog offers Record again / Done. Recordings auto-stop at 60 s; Escape/backdrop closes and cancels.
- `src/lib/stt.js`: `MediaRecorder` → `decodeAudioData` → `OfflineAudioContext` resample to **16 kHz mono** → 16-bit WAV → base64 → `POST /api/stt`.
- `server/stt.js` calls Gemini `:generateContent` with `inline_data` audio. Model defaults to **`gemini-3.8-flash`**; override with `AI_STUDIO_MODEL`.
- `api/stt.js` serves it on Vercel; `vite.config.js` mounts the same core in dev, so `npm run dev` is enough (no `vercel dev`).
- Key: `AI_STUDIO_API` in `.env.local`, server-side only. The client bundle never sees it.
- Verified end to end in the browser with a fake mic stream fed a 16 kHz speech WAV: hold → live animation → release → transcript appended to the form. A real microphone still needs one manual check (permission prompt).

## Auth

- Supabase Auth email/password; `incidents.user_id` references `auth.users` (nullable).
- **Guest mode** — "Continue as guest" on the auth screen starts the same flow with no session and no profile; incidents save with `user_id = null`. The flag lives in `sessionStorage` and is cleared on sign-in. The topbar shows a `Guest` badge and a "Sign in" link back to the auth screen.
- Demo credential (created via admin API, email confirmed): **demo@scamsos.my / ScamSOS2026!**
- HACK: the demo credential is hardcoded in `src/AuthScreen.jsx` so the on-stage login is one click.

## Styling (Tailwind CSS)

- **Version**: Tailwind CSS v4 (`tailwindcss@4.3.5`) with the first-party `@tailwindcss/vite` plugin. Registered in `vite.config.js`; **no** `tailwind.config.js`, no PostCSS config — v4 needs neither.
- **Entry**: `src/index.css` starts with `@import "tailwindcss";`.
- **Theme tokens** (in `@theme`, used as normal utilities like `bg-canvas`, `text-muted`, `border-edge`):

  | Token | Value | Use |
  | --- | --- | --- |
  | `canvas` | `#0b0f14` | page background |
  | `panel` | `#141b24` | cards, inputs, panels |
  | `edge` / `edge-strong` | `#232e39` / `#3a4a5a` | borders, hover borders |
  | `ink` / `muted` / `dim` | `#e8edf2` / `#93a1b0` / `#6f7f8f` | text levels |
  | `brand` / `brand-soft` | `#ff5a5f` / `#241518` | accent and selected-card tint |
  | `btn` | `#1d2732` | secondary action pills |

- **Component classes** (`@layer components`, reused across screens): `.field`, `.btn-primary`, `.link`, `.panel`, `.card`, `.card-selected`, `.action-btn`.
- **Everything else is inline utilities** in the JSX; one-off hex values use arbitrary values (`text-[#ffb3b5]`, `bg-[#0f151c]`).
- **Hand-written CSS is deliberate** for `.report`, `.report-*` and the `@media print` block. Screen elements that must not print carry `.no-print`. Do not convert the print report to utilities — keep it in `src/index.css` so `window.print()` stays predictable.
- `html { color-scheme: dark }` keeps native inputs/selects dark; form controls rely on Tailwind Preflight for font inheritance.

## Data model

| Table | Purpose |
| --- | --- |
| `institutions` | Fallback registry: banks, e-wallets, platforms + hotline, report URL, support email |
| `incidents` | One victim incident; `llm_summary` jsonb holds the LLM's steps/actions payload |
| `incident_institutions` | Which institutions the money went through |
| `action_steps` | Ordered checklist per incident (`call` / `open` / `map` / `email` / `print`) |
| `reports` | Police/bank/platform report drafts generated from an incident |

- Schema source of truth: [db/schema.sql](../db/schema.sql); seed: [db/seed.sql](../db/seed.sql).
- Contacts in the seed were verified against official pages (Nov 2026).
- RLS is intentionally off for the demo. Tables are created through SQL, so the anon key can read/write freely — acceptable for a 2-hour demo, never for production.
- No ORM and no migration tooling; edit the SQL files and re-run them in the Supabase SQL editor.

## Deliberately out of scope

TypeScript, Next.js/SSR, state management libraries, ORMs, custom auth flows, background jobs.
