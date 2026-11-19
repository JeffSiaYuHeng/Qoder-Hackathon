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
| [06_DESIGN.md](06_DESIGN.md) | Design system: colour, type, components, light/dark theme, copy rules, demo setup |
| [07_VOICE_INTAKE.md](07_VOICE_INTAKE.md) | Voice intake: the AI listens and fills the form — flow, states, `/api/voice-intake` contract |

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
│   ├── 06_DESIGN.md
│   └── 07_VOICE_INTAKE.md
├── AGENTS.md                 # hackathon rules for agents
├── db/
│   ├── schema.sql            # tables (apply in Supabase SQL editor)
│   └── seed.sql              # verified fallback institution contacts
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── .env.local                # real Supabase keys, gitignored
└── src/
    ├── main.jsx              # React entry
    ├── App.jsx               # stage state machine + Supabase writes
    ├── AuthScreen.jsx        # email/password sign-in (demo account hardcoded)
    ├── InstitutionPicker.jsx # reads the institutions registry
    ├── IntakeForm.jsx        # incident intake form
    ├── ActionPlan.jsx        # checklist, call script, print report, mailto drafts
    ├── ThemeToggle.jsx       # light/dark switch (top bar + sign-in screen)
    ├── Stepper.jsx           # flow progress: Where it went → What happened → Action plan
    ├── EmergencyBar.jsx      # Call 997 bar, before sign-in and on the first screen
    ├── demoMode.js           # ?demo=1: Call/Email show an in-app message instead of leaving the browser
    ├── index.css             # design tokens at the top, then component styles + print CSS
    └── lib/
        ├── supabase.js       # single Supabase client
        └── plan.js           # rule-based plan builder (LLM stand-in)
```

Planned but **not built yet** (see [04_PRD.md](04_PRD.md) §7): `api/analyze.js`, `api/lookup.js`, `api/send.js` as Vercel serverless functions.

## App flow

`App.jsx` is the whole state machine. It holds `session`, `stage`, `selected` institutions, and the saved `incident`.

```
AuthScreen ──sign in──► InstitutionPicker ──stage "pick"
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

## Data flow

1. **Institutions** are read from Supabase (`institutions` table) and rendered as pick cards.
2. On intake submit, `src/lib/plan.js` builds ordered steps, a call script, and a summary **in the browser** (rule-based, no LLM yet).
3. `App.jsx` writes one `incidents` row, the selected links in `incident_institutions`, and the ordered steps in `action_steps`.
4. The plan screen renders the returned steps; ticking a step updates its `action_steps.done` flag.
5. The police report is client-rendered and printed; institution emails are `mailto:` links built from the registry.

## Where to change what

| Want to change | Edit |
| --- | --- |
| Institution contacts (hotline, fraud page, email) | `db/seed.sql`, then re-run it in Supabase |
| Table columns / constraints | `db/schema.sql`, then re-run it in Supabase |
| Step order or email/call script wording | `src/lib/plan.js` |
| Screens and copy | `src/*.jsx` (copy rules: [06_DESIGN.md](06_DESIGN.md) §9) |
| Colours, fonts, spacing, light/dark values | Tokens at the top of `src/index.css` ([06_DESIGN.md](06_DESIGN.md) §3–5) |
| How a component looks | Component section of `src/index.css` ([06_DESIGN.md](06_DESIGN.md) §6) |
| Printed police report layout | `src/ActionPlan.jsx` + print CSS in `src/index.css` |
| Product scope | [04_PRD.md](04_PRD.md) |
