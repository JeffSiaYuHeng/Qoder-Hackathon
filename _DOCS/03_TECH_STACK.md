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
│   ├── ActionPlan.jsx    # checklist, script, print report, mailto drafts
│   ├── index.css
│   └── lib/
│       ├── supabase.js   # single client export
│       ├── i18n.js       # EN/BM dictionary + useI18n
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
```

Vite only exposes `VITE_*` vars to the browser. The anon/publishable key is public by design; never put the `service_role`/`sb_secret_*` key in the frontend.

## Commands

```bash
npm install          # install deps
npm run dev          # dev server → http://localhost:5173
npm run build        # production build
vercel deploy        # preview deploy
```

## User flow

1. **Sign in** — Supabase Auth (email/password). "Use demo account" signs in with one click.
2. **Pick institutions** — banks / e-wallets / platforms (multi-select, loaded from `institutions`).
3. **Intake** — free-text story + amount, time, contact method, suspect details.
4. **Action plan** — rule-based builder (`src/lib/plan.js`) writes `incidents`, `incident_institutions` and `action_steps`; the screen renders `tel:` / web / map buttons, a call script, email drafts and a printable police report.
5. Step checkboxes persist `action_steps.done`.

## Language (i18n)

- Hand-rolled EN/BM dictionary in `src/lib/i18n.js` — no dependency.
- `LangContext` + `useI18n()` expose `lang`, `setLang`, `t`; choice persists in `localStorage` (`scamsos.lang`).
- The toggle is in the topbar (auth screen included). Dates use `en-MY` / `ms-MY`.
- Plan generation is localized at build time: step titles, call script and `mailto:` drafts are generated in the active language and stored that way.

## Auth

- Supabase Auth email/password; `incidents.user_id` references `auth.users`.
- Demo credential (created via admin API, email confirmed): **demo@scamsos.my / ScamSOS2026!**
- HACK: the demo credential is hardcoded in `src/AuthScreen.jsx` so the on-stage login is one click.

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
