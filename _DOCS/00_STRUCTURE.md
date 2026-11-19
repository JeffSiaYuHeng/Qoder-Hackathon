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
| [06_DESIGN.md](06_DESIGN.md) | Design system: colour, type, components, light/dark theme, copy rules, demo setup |
| [Design.md](Design.md) | Superseded by 06_DESIGN.md — earlier placeholder notes |
| [07_VOICE_INTAKE.md](07_VOICE_INTAKE.md) | "Talk to ScamSOS": a short call-style AI conversation that fills the intake form — screens, states, spoken lines, `/api/voice-intake` contract |

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
│   ├── 06_DESIGN.md
│   ├── 07_VOICE_INTAKE.md
│   ├── Design.md             # superseded placeholder
│   └── mockup.html           # static mockup linked from the PRD
├── AGENTS.md                 # hackathon rules for agents
├── api/
│   ├── stt.js                # Vercel function: speech-to-text
│   ├── analyze.js            # Vercel function: story → incident fields + detected institutions
│   ├── report.js             # Vercel function: template reports → AI-rewritten reports
│   ├── lookup.js             # Vercel function: per-institution contact lookup
│   └── send.js               # Vercel function: one-click email with PDF (Resend)
├── server/
│   ├── stt.js                # Gemini transcription core (dev + prod)
│   ├── analyze.js            # Gemini field extraction core
│   ├── report.js             # Gemini report rewriting + strict validation, template fallback
│   ├── lookup.js             # live page check, registry fallback
│   ├── send.js               # email core; DEMO_MODE reroutes to the team inbox
│   └── registry.js           # reads institutions server-side
├── db/
│   ├── schema.sql            # tables (apply in Supabase SQL editor)
│   └── seed.sql              # verified fallback institution contacts
├── index.html
├── package.json
├── vite.config.js            # React + Tailwind plugins, dev middleware for /api/stt, /analyze, /lookup, /send
├── .env.example
├── .env.local                # real Supabase + AI Studio keys, gitignored
└── src/
    ├── main.jsx              # React entry: LangContext provider, imports demoMode.js
    ├── App.jsx               # entry (welcome | app) + stage state machine + local incident state
    ├── WelcomeScreen.jsx     # first screen: 997 bar, one "Get help now" CTA, flow steps
    ├── InstitutionPicker.jsx # reads the institutions registry
    ├── IntakeForm.jsx        # incident intake form, opens the voice dialog
    ├── VoiceDialog.jsx       # hold-to-talk mic dialog, appends transcript to the form
    ├── ActionPlan.jsx        # checklist, call script, print report, mailto drafts
    ├── ThemeToggle.jsx       # light/dark switch (top bar)
    ├── Stepper.jsx           # flow progress: Where it went → What happened → Action plan
    ├── EmergencyBar.jsx      # Call 997 bar, on every screen
    ├── demoMode.js           # ?demo: Call/Email show an in-app message instead of leaving the browser
    ├── index.css             # Tailwind import + @theme bridge, design tokens, components, voice dialog, print CSS
    └── lib/
        ├── supabase.js       # single Supabase client (institutions read only)
        ├── i18n.js           # EN/BM dictionary, context hook, localStorage persistence
        ├── stt.js            # mic recording → 16 kHz WAV → /api/stt
        ├── agent.js          # /api/analyze, /api/lookup, /api/send wrappers
        ├── report.js         # /api/report wrapper (AI report rewriting)
        ├── pdf.js            # pdf-lib A4 incident PDF (lazy-loaded)
        ├── demo.js           # canned API responses for ?demo (analyze/lookup/story)
        └── plan.js           # rule-based steps + template reports (AI rewrites on top)
```

**Server handlers are built** (`api/stt.js`, `api/analyze.js`, `api/report.js`, `api/lookup.js`, `api/send.js`, plus the `server/*.js` cores and `server/registry.js`) and the client calls them: analyze autofills and detects institutions, lookup verifies official channels, report rewrites the template drafts with Gemini, send emails them via Resend with the PDF attached. PRD intent: [04_PRD.md](04_PRD.md) §7.

## App flow

`App.jsx` is the whole state machine. `entry` is `welcome` or `app`; inside the app it holds `stage`, `selected`, `detected`, `form`, and the in-memory `incident`. There is no sign-in.

```
WelcomeScreen ──"Get help now"──► entry "app"
                                         │
IntakeForm ──stage "intake"              │
     │ story → /api/analyze (fields + detected institutions)
     ▼
InstitutionPicker ──stage "pick"
     │ user confirms 1+ institutions
     ▼
ActionPlan ──stage "plan"
     ├─ buildActionPlan() → steps, call script, template reports (in memory)
     ├─ /api/report rewrites report wording (kicked off in the background)
     ├─ tick steps → local state only
     ├─ call / open / map / email / live lookup
     ├─ Download PDF (client-side, pdf-lib)
     ├─ Send all reports → /api/send (text + PDF attachment)
     ├─ window.print() police report
     └─ "Start a new incident" → reset to "intake"
```

## Data flow

1. **Institutions** are read from Supabase (`institutions` table) and rendered as pick cards. It is the only Supabase read.
2. The story goes to `/api/analyze` (Gemini); the returned fields prefill the form and detected institutions are pre-selected.
3. On confirm, `src/lib/plan.js` builds ordered steps, a call script, and template reports **in the browser**. `crypto.randomUUID()` gives the incident an id.
4. `/api/report` (Gemini) rewrites the report bodies and returns a cleaned statement; invalid or slow output keeps the templates. The police report shows the AI statement when present.
5. Nothing is written to Supabase: the incident lives in React state for the session only.
6. The PDF is built client-side (`src/lib/pdf.js`, lazy-loaded). Sending posts text + PDF to `/api/send`; recipients come from the server-side registry, and `DEMO_MODE` redirects to `DEMO_INBOX`.
7. **Voice input** (intake): `VoiceDialog.jsx` is a hold-to-talk modal — hold the mic to record (pulse + equalizer animation), release to transcribe. `src/lib/stt.js` resamples to 16 kHz mono WAV and POSTs base64 to `/api/stt`; `server/stt.js` calls Google AI Studio (Gemini); the transcript appends directly to the story box. `vite.config.js` mounts the same handlers in dev. Full control flow: [02_SERVERSIDE_API.md](02_SERVERSIDE_API.md) § Speech-to-text.

## Where to change what

| Want to change | Edit |
| --- | --- |
| Institution contacts (hotline, fraud page, email) | `db/seed.sql`, then re-run it in Supabase |
| Table columns / constraints | `db/schema.sql`, then re-run it in Supabase |
| Step order or email/call script wording | `src/lib/plan.js` |
| AI report prompt, validation, model | `server/report.js` (`AI_STUDIO_MODEL` overrides the default model) |
| PDF layout and content | `src/lib/pdf.js` |
| Screens and copy | `src/*.jsx` (copy rules: [06_DESIGN.md](06_DESIGN.md) §9) |
| Colours, fonts, spacing, light/dark values | Tokens at the top of `src/index.css` ([06_DESIGN.md](06_DESIGN.md) §3–5); Tailwind utilities follow them via the `@theme` bridge |
| How a component looks | Design-system component classes in `src/index.css` ([06_DESIGN.md](06_DESIGN.md) §6) |
| Voice input (recording, resampling, transcription) | `src/lib/stt.js` (browser), `server/stt.js` (Gemini call), `api/stt.js` (Vercel) |
| STT model or prompt | `server/stt.js` (`AI_STUDIO_MODEL` overrides the default model) |
| Printed police report layout | `src/ActionPlan.jsx` + print CSS in `src/index.css` |
| Light/dark default | `ThemeToggle.jsx` (`data-theme` on `<html>`); device preference otherwise |
| Stage demo (`?demo`) | `src/demoMode.js` (intercepts `tel:`/`mailto:` clicks) |
| Product scope | [04_PRD.md](04_PRD.md) |
