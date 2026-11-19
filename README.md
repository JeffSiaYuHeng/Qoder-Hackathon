# ScamSOS

**From panic to action.** A Malaysia-first scam response app: describe the incident once, get an ordered action plan, the right official contacts, written reports, and a printable police document.

Built for a 2-hour hackathon. Demo over polish — see [AGENTS.md](AGENTS.md).

## The problem

In the first hour after a scam, victims do not know who to call, in what order, or what each institution needs. They google phone numbers (sometimes fake ones), retype the same story four times, and lose the window to freeze the money.

ScamSOS turns one incident into an ordered checklist: call the bank's fraud line first, then NSRC 997, then the police, then report to the platforms — with verified contacts and drafts for each recipient.

## Demo flow

```
"Get help now" (no account, no sign-in)
        ↓
Describe what happened (type, or hold the mic) — AI prefills the details
        ↓
Confirm the banks / e-wallets / platforms involved
        ↓
Action plan: calls, official pages, call script, AI report drafts, PDF, printable police report
```

- **No accounts** — the app opens on a welcome screen and goes straight in; there is nothing to sign in to.
- **In-memory only** — the incident lives in React state; nothing is written to Supabase and a reload clears it.
- **EN / BM / 中文** — toggle in the top bar, persisted in `localStorage`.
- **Voice intake** — hold-to-talk dialog records a 16 kHz WAV and transcribes it via `/api/stt`.
- **AI report drafts** — `/api/report` rewrites the statement and per-institution emails; templates are the fallback.
- **PDF + printable report** — downloadable incident PDF and a police-ready print view (`window.print()`).

## Quick start

Requirements: Node 20+, a Supabase project (project `scamsos`, ref `cxmzutazrqrykpnjgqnd`).

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # http://localhost:5173
```

### Database

In the Supabase SQL editor, run in order:

1. [`db/schema.sql`](db/schema.sql) — tables and indexes
2. [`db/seed.sql`](db/seed.sql) — institution registry (`on conflict (slug) do update`, safe to re-run)

No migration tooling. Edit the SQL files and re-run them.

### Environment

`.env.local` is gitignored. Only `VITE_*` variables reach the browser.

| Variable | Scope | Required | Purpose |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | client + server | yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | client + server | yes | Anon key (public by design; never use the service-role key) |
| `AI_STUDIO_API` | server only | for all AI paths | Google AI Studio (Gemini) API key — STT, analyze, report, lookup |
| `AI_STUDIO_MODEL` | server only | no | Defaults to `gemini-3.8-flash` |
| `RESEND_API_KEY` | server only | for `/api/send` | Resend API key |
| `DEMO_MODE` | server only | no | `true` sends every report to `DEMO_INBOX` instead of institutions |
| `DEMO_INBOX` | server only | with `DEMO_MODE` | Team inbox that receives demo emails |
| `SEND_FROM` | server only | no | Verified Resend sender; defaults to Resend's onboarding address |

Never add an API key as `VITE_*` — it would ship in the browser bundle.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server; also mounts the `/api/*` handlers (no `vercel dev` needed) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `vercel deploy` | Deploy the SPA and `api/*` functions |

## Server functions

`api/*.js` are Vercel serverless functions; the actual logic lives in `server/*.js` and is reused by the dev middleware in [`vite.config.js`](vite.config.js). The browser never holds the model or email keys.

| Endpoint | Request | Response |
| --- | --- | --- |
| `POST /api/stt` | `{ audio, mimeType }` (base64 WAV) | `{ text }` |
| `POST /api/analyze` | `{ story }` | Scam fields, detected institution slugs, missing fields |
| `POST /api/report` | `{ story, lang, form, institutions, templates }` | AI-rewritten statement + per-institution drafts (`source: "ai" \| "template"`) |
| `POST /api/lookup` | `{ institution_ids }` | `{ log, results }` — official fraud page per institution, registry fallback |
| `POST /api/send` | `{ user_email, reports, pdf_base64?, pdf_filename? }` | Per-institution `sent` / `failed` statuses |

Safety rules baked into the handlers:

- `/api/analyze` extracts only what the story says; unknown values stay `null`.
- `/api/lookup` accepts a URL only if its domain is in a hardcoded official allowlist; phone numbers and emails always come from the registry.
- `/api/send` resolves the recipient from the registry server-side, never from the browser. `DEMO_MODE=true` redirects every email to the team inbox with the intended recipient in the subject.

What the screens use today: all five endpoints are wired — analyze prefills intake, report rewrites the drafts, lookup fills the contact cards, send emails the PDF-attached reports. Steps, call script and template reports are built client-side by [`src/lib/plan.js`](src/lib/plan.js). `?demo=1` intercepts `tel:`/`mailto:` clicks and serves canned analyze/lookup results ([`src/lib/demo.js`](src/lib/demo.js), [`src/demoMode.js`](src/demoMode.js)).

## Project layout

```
.
├── api/                  # Vercel functions: stt, analyze, report, lookup, send
├── server/               # Shared handlers + registry reader + allowlist
├── db/
│   ├── schema.sql        # tables
│   └── seed.sql          # verified institution contacts
├── src/
│   ├── App.jsx           # welcome/app entry + stage machine (intake → pick → plan)
│   ├── WelcomeScreen.jsx # first screen: 997 bar + "Get help now"
│   ├── InstitutionPicker.jsx
│   ├── IntakeForm.jsx    # story, amount, time, contact details, voice
│   ├── VoiceDialog.jsx   # hold-to-talk recording → transcript
│   ├── ActionPlan.jsx    # checklist, call script, AI drafts, PDF, send, print report
│   ├── index.css         # Tailwind v4 entry, theme tokens, print CSS
│   └── lib/              # supabase, i18n, plan builder, report, pdf, stt, api wrappers
├── _DOCS/                # PRD, schema, API, tech stack, living snapshot
└── AGENTS.md             # hackathon rules
```

## Data model

| Table | Purpose |
| --- | --- |
| `institutions` | Registry: banks, e-wallets, platforms with hotline, report URL, support email |
| `incidents` | Legacy; the current app never writes incidents |
| `incident_institutions` | Legacy; unused |
| `action_steps` | Legacy; unused |
| `reports` | Legacy; unused |

Details: [01_DATA_SCHEMA.md](_DOCS/01_DATA_SCHEMA.md). Incidents, steps and reports are client-side only; the registry is the only table the app reads.

## Limitations

This is a hackathon demo, not a product:

- **RLS is off** in Supabase, so the anon key can read and write every table. The app only reads `institutions`, but the key still allows writes — do not ship this to production as-is.
- **Incidents are not stored.** They live in React state only and disappear on reload, so "we don't store your story" is accurate.
- **No money is frozen or recovered.** Every report is a draft; the police report is prepared, not filed.
- **Report emails** only work when `RESEND_API_KEY` is set. Use `DEMO_MODE=true` so real institutions are never emailed during the event.
- **Official contacts** come from `db/seed.sql`, checked by hand on 2026-11-19. Re-verify before trusting them.
- **Model note:** all AI paths (STT, analyze, report, lookup) use Gemini via `AI_STUDIO_API`. The Qoder Agent SDK experiment is local-only and gitignored; report text falls back to templates if the model is slow or invalid.

## Docs

| File | Covers |
| --- | --- |
| [00_STRUCTURE.md](_DOCS/00_STRUCTURE.md) | Repo map and app flow |
| [01_DATA_SCHEMA.md](_DOCS/01_DATA_SCHEMA.md) | Tables, columns, seed |
| [02_SERVERSIDE_API.md](_DOCS/02_SERVERSIDE_API.md) | Server functions, voice pipeline, data calls |
| [03_TECH_STACK.md](_DOCS/03_TECH_STACK.md) | Stack, commands, environment |
| [04_PRD.md](_DOCS/04_PRD.md) | Requirements and 90-second demo script |
| [06_PROJECT_SNAPSHOT.md](_DOCS/06_PROJECT_SNAPSHOT.md) | Living status and known gaps |
