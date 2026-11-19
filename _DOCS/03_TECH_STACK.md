# Tech Stack

Hackathon demo stack. One app, one process, boring tech — see [AGENTS.md](../AGENTS.md).

## Core

| Layer | Choice | Notes |
| --- | --- | --- |
| Frontend | React (plain JavaScript, no TypeScript) | Single-page app |
| Styling | Tailwind CSS v4 + design-token CSS | Tailwind for layout/utilities, a design-system stylesheet (light/dark tokens + component classes) for the look. See [06_DESIGN.md](06_DESIGN.md) |
| Build tool | Vite | Instant dev server, zero config |
| Fonts | Inter (body) + Plus Jakarta Sans (headings), Google Fonts | Falls back to the system font if blocked |
| Database | Supabase (hosted Postgres) | Accessed via `@supabase/supabase-js` |
| Hosting | Vercel | Already authenticated locally |
| Email | Resend (optional) | `/api/send` only; without a key the UI falls back to `mailto:` drafts |

Supabase project: **scamsos**, ref `cxmzutazrqrykpnjgqnd`, region `ap-southeast-1` (Singapore).

> The older project `dnzuxidxonvfyhjaifbo` is paused beyond recovery and is not used.

## Layout

```
.
├── api/
│   ├── stt.js            # Vercel function: speech-to-text
│   ├── analyze.js        # Vercel function: story → structured incident + plan
│   ├── lookup.js         # Vercel function: per-institution contact lookup
│   └── send.js           # Vercel function: one-click email via Resend
├── server/
│   ├── stt.js            # Gemini transcription core (dev + prod)
│   ├── analyze.js        # plan/field extraction core
│   ├── lookup.js         # channel lookup core (live page check + registry fallback)
│   ├── send.js           # email core (DEMO_MODE reroutes to the team inbox)
│   └── registry.js       # server-side institutions read
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
│   ├── VoiceDialog.jsx   # hold-to-talk mic dialog (pulse + bars animation)
│   ├── ActionPlan.jsx    # checklist, script, print report, mailto drafts
│   ├── ThemeToggle.jsx   # light/dark switch
│   ├── Stepper.jsx       # flow progress
│   ├── EmergencyBar.jsx  # Call 997 bar
│   ├── demoMode.js       # ?demo=1 intercepts tel:/mailto: links
│   ├── index.css         # design tokens + component styles (see 06_DESIGN.md)
│   └── lib/
│       ├── supabase.js   # single client export
│       ├── i18n.js       # EN/BM dictionary + useI18n
│       ├── stt.js        # mic recording → 16 kHz WAV → /api/stt
│       ├── agent.js      # /api/analyze, /api/lookup, /api/send wrappers (not called by the UI yet)
│       ├── demo.js       # canned API responses when ?demo=1 (not imported yet)
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
AI_STUDIO_MODEL=gemini-3.8-flash   # optional; this is the default (STT + analyze)
LOOKUP_MODEL=                      # optional; lookup default is gemini-3.5-flash-lite

# /api/send — optional. Without a key the UI falls back to mailto: drafts.
RESEND_API_KEY=
DEMO_MODE=true                     # sends ALL email to DEMO_INBOX, never real institutions
DEMO_INBOX=<team inbox>
SEND_FROM=ScamSOS <onboarding@resend.dev>
```

Vite only exposes `VITE_*` vars to the browser. The anon/publishable key is public by design; never put the `service_role`/`sb_secret_*` key in the frontend. `AI_STUDIO_API` must stay server-side — do **not** prefix it with `VITE_`.

HACK: teammate worktree only — `server/analyze.js` + `api/analyze.js` are uncommitted local edits that call the Qoder Agent SDK (needs `qodercli` signed in) instead of Gemini and strip Qoder Desktop's SDK env vars on import. Requires the `Qoder SDK/typescript` folder next to the repo; not part of the merge commit.

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

## Styling (Tailwind CSS v4 + design-token CSS)

Two layers coexist in `src/index.css`; the design system is the source of truth for the look ([06_DESIGN.md](06_DESIGN.md)).

- **Version**: Tailwind CSS v4 (`tailwindcss@4.3.5`) with the first-party `@tailwindcss/vite` plugin. Registered in `vite.config.js`; **no** `tailwind.config.js`, no PostCSS config — v4 needs neither.
- **Entry**: `src/index.css` starts with `@import "tailwindcss";`, then a `@theme` **token bridge** that maps utility names to the design tokens (`--color-canvas: var(--bg)`, `--color-brand: var(--accent)`, …) so `bg-canvas`, `text-muted`, `border-edge` follow light/dark automatically.
- **Design tokens** (plain custom properties on `:root`): light values by default, dark values under `@media (prefers-color-scheme: dark)` and `:root[data-theme='dark']`; `ThemeToggle.jsx` sets `data-theme`. Roles: `--bg`, `--surface`, `--surface-2`, `--line`, `--ink`, `--ink-2`, `--ink-3`, `--accent`, `--accent-soft`, `--ok*`, `--warn*`, plus `--fs-*`, `--s-*`, `--r-*`, `--tap`.
- **Component classes** live **unlayered** (not in `@layer components`), so they beat Tailwind utilities: `.card-grid`, `.card`, `.panel`, `.step`, `.action-btn`, `.primary`, `.link`, `.topbar`, `.intake`, voice-dialog and report styles. Reuse these names; new screens match for free.
- **Tailwind utilities** are used for layout and spacing inside the JSX.
- `.grid` was renamed **`.card-grid`** so it does not collide with Tailwind's `.grid` utility.
- **Hand-written CSS is deliberate** for `.report`, `.report-*` and the `@media print` block (which forces a light `color-scheme`). Screen elements that must not print carry `.no-print`. Do not convert the print report to utilities — keep it in `src/index.css` so `window.print()` stays predictable.
- `@media (prefers-reduced-motion: reduce)` disables transitions/animations.

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
