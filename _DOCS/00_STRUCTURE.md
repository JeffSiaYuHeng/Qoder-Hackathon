# 00 — Structure

Map of the repo and how the pieces connect. Product background is in [04_PRD.md](04_PRD.md); the original scoping notes are in [05_PRODUCT_PLAN.md](05_PRODUCT_PLAN.md).

## Documents

| File | Covers |
| --- | --- |
| [00_STRUCTURE.md](00_STRUCTURE.md) | This file: repo map, app flow, where to change what |
| [01_DATA_SCHEMA.md](01_DATA_SCHEMA.md) | Supabase tables, columns, relationships, seed data |
| [02_SERVERSIDE_API.md](02_SERVERSIDE_API.md) | Auth, Supabase queries, and planned `/api` functions |
| [03_TECH_STACK.md](03_TECH_STACK.md) | Stack choices, project ref, commands |
| [04_PRD.md](04_PRD.md) | Requirements, screens, demo script |
| [05_PRODUCT_PLAN.md](05_PRODUCT_PLAN.md) | Earlier 2-hour plan (background) |
| [06_PROJECT_SNAPSHOT.md](06_PROJECT_SNAPSHOT.md) | Living status: what works, gaps, next steps, update log |
| [Design.md](Design.md) | Visual/UX design doc — **placeholder**, to be replaced |

`AGENTS.md` stays at the repo root, not here — agent tooling auto-loads it from there.

## Repo layout (current)

```
.
├── _DOCS/                    # these docs
│   ├── 00_STRUCTURE.md
│   ├── 01_DATA_SCHEMA.md
│   ├── 02_SERVERSIDE_API.md
│   ├── 03_TECH_STACK.md
│   ├── 04_PRD.md
│   ├── 05_PRODUCT_PLAN.md
│   ├── 06_PROJECT_SNAPSHOT.md
│   └── Design.md             # placeholder UX/design doc
├── AGENTS.md                 # hackathon rules for agents
├── api/
│   └── stt.js                # Vercel function: speech-to-text
├── server/
│   └── stt.js                # Gemini transcription core (dev + prod)
├── db/
│   ├── schema.sql            # tables (apply in Supabase SQL editor)
│   └── seed.sql              # verified fallback institution contacts
├── index.html
├── package.json
├── vite.config.js            # React + Tailwind plugins, dev /api/stt middleware
├── .env.example
├── .env.local                # real Supabase + AI Studio keys, gitignored
└── src/
    ├── main.jsx              # React entry
    ├── App.jsx               # stage state machine + Supabase writes
    ├── AuthScreen.jsx        # email/password sign-in (demo account hardcoded)
    ├── InstitutionPicker.jsx # reads the institutions registry
    ├── IntakeForm.jsx        # incident intake form, opens the voice dialog
    ├── VoiceDialog.jsx       # hold-to-talk mic dialog, appends transcript to the form
    ├── ActionPlan.jsx        # checklist, call script, print report, mailto drafts
    ├── index.css             # Tailwind v4 entry, theme tokens, print CSS
    └── lib/
        ├── supabase.js       # single Supabase client
        ├── i18n.js           # EN/BM dictionary, context hook, localStorage persistence
        ├── stt.js            # mic recording → 16 kHz WAV → /api/stt
        └── plan.js           # rule-based plan builder (LLM stand-in)
```

Planned but **not built yet** (see [04_PRD.md](04_PRD.md) §7): `api/analyze.js`, `api/lookup.js`, `api/send.js` as Vercel serverless functions.

## App flow

`App.jsx` is the whole state machine. It holds `session`, `guest`, `stage`, `selected` institutions, and the saved `incident`.

```
AuthScreen ──sign in──────────┐
          └─continue as guest─┴─► InstitutionPicker ──stage "pick"
                                         │ select 1+ institutions
                                         ▼
                                   IntakeForm ────────stage "intake"
                                         │ buildActionPlan() + save to Supabase
                                         ▼
                                   ActionPlan ────────stage "plan"
                                         ├─ tick steps → update action_steps.done
                                         ├─ call / open / map / email buttons
                                         ├─ window.print() police report
                                         └─ "Start a new incident" → reset to "pick"
```

**Guest mode** skips sign-in entirely: no session, no profile, same flow and reports. The choice persists in `sessionStorage` (`scamsos.guest`) and is cleared when a real session appears. Guests can switch to sign-in from the topbar.

## Data flow

1. **Institutions** are read from Supabase (`institutions` table) and rendered as pick cards.
2. On intake submit, `src/lib/plan.js` builds ordered steps, a call script, and a summary **in the browser** (rule-based, no LLM yet).
3. `App.jsx` writes one `incidents` row, the selected links in `incident_institutions`, and the ordered steps in `action_steps`. `user_id` is the signed-in user's id, or `null` for guest incidents.
4. The plan screen renders the returned steps; ticking a step updates its `action_steps.done` flag.
5. The police report is client-rendered and printed; institution emails are `mailto:` links built from the registry.
6. **Voice input** (intake): `VoiceDialog.jsx` is a hold-to-talk modal — hold the mic to record (pulse + equalizer animation), release to transcribe. `src/lib/stt.js` resamples to 16 kHz mono WAV and POSTs base64 to `/api/stt`; `server/stt.js` calls Google AI Studio (Gemini); the transcript appends directly to the story box. `vite.config.js` mounts the same handler in dev so `npm run dev` alone is enough. Full step-by-step control flow (phases, timers, limits, failure modes) is in [02_SERVERSIDE_API.md](02_SERVERSIDE_API.md) § Speech-to-text.

## Where to change what

| Want to change | Edit |
| --- | --- |
| Institution contacts (hotline, fraud page, email) | `db/seed.sql`, then re-run it in Supabase |
| Table columns / constraints | `db/schema.sql`, then re-run it in Supabase |
| Step order or email/call script wording | `src/lib/plan.js` |
| Screens and copy | `src/*.jsx` |
| Sign-in / guest mode | `src/AuthScreen.jsx` + `session` / `guest` state in `src/App.jsx` |
| Voice input (recording, resampling, transcription) | `src/lib/stt.js` (browser), `server/stt.js` (Gemini call), `api/stt.js` (Vercel) |
| STT model or prompt | `server/stt.js` (`AI_STUDIO_MODEL` overrides the default model) |
| Printed police report layout | `src/ActionPlan.jsx` + print CSS in `src/index.css` |
| Product scope | [04_PRD.md](04_PRD.md) |
