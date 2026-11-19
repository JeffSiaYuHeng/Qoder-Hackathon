# Tech Stack

Hackathon demo stack. One app, one process, boring tech — see [AGENTS.md](AGENTS.md).

## Core

| Layer | Choice | Notes |
| --- | --- | --- |
| Frontend | React (plain JavaScript, no TypeScript) | Single-page app |
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
│   ├── main.jsx
│   ├── App.jsx           # institution picker (first flow step)
│   ├── index.css
│   └── lib/supabase.js   # single client export
├── .env.local            # real keys, never committed
├── .env.example
└── TECH_STACK.md
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

## Data model

| Table | Purpose |
| --- | --- |
| `institutions` | Fallback registry: banks, e-wallets, platforms + hotline, report URL, support email |
| `incidents` | One victim incident; `llm_summary` jsonb holds the LLM's steps/actions payload |
| `incident_institutions` | Which institutions the money went through |
| `action_steps` | Ordered checklist per incident (`call` / `open` / `map` / `email` / `print`) |
| `reports` | Police/bank/platform report drafts generated from an incident |

- Schema source of truth: [db/schema.sql](db/schema.sql); seed: [db/seed.sql](db/seed.sql).
- Contacts in the seed were verified against official pages (Nov 2026).
- RLS is intentionally off for the demo. Tables are created through SQL, so the anon key can read/write freely — acceptable for a 2-hour demo, never for production.
- No ORM and no migration tooling; edit the SQL files and re-run them in the Supabase SQL editor.

## Deliberately out of scope

TypeScript, Next.js/SSR, state management libraries, ORMs, custom auth flows, background jobs.
