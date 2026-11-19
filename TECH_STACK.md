# Tech Stack

Hackathon demo stack. One app, one process, boring tech — see [AGENTS.md](AGENTS.md).

## Core

| Layer | Choice | Notes |
| --- | --- | --- |
| Frontend | React (plain JavaScript, no TypeScript) | Single-page app |
| Build tool | Vite | Instant dev server, zero config |
| Database | Supabase (hosted Postgres) | Accessed via `@supabase/supabase-js` |
| Hosting | Vercel | Already authenticated locally |

Supabase project already exists: ref `dnzuxidxonvfyhjaifbo` (org `aiaplrqdrhaodruugtbq`, Singapore).

## Planned layout

```
.
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   └── lib/supabase.js   # single client export
├── .env.local            # never committed
└── TECH_STACK.md
```

## Environment variables

```bash
VITE_SUPABASE_URL=https://dnzuxidxonvfyhjaifbo.supabase.co
VITE_SUPABASE_ANON_KEY=<from Supabase dashboard → Settings → API>
```

Vite only exposes `VITE_*` vars to the browser. The anon key is public by design; never use the service-role key in the frontend.

## Commands (once scaffolded)

```bash
npm create vite@latest . -- --template react   # scaffold
npm install @supabase/supabase-js               # db client
npm run dev                                     # dev server
npm run build                                   # production build
vercel deploy                                   # preview deploy
```

## Data

- Tables created directly in the Supabase dashboard for the demo — no ORM, no migration tooling.
- One shared `src/lib/supabase.js` client, imported anywhere it is needed.
- Row Level Security left off for the demo unless a table needs a policy to work.

## Deliberately out of scope

TypeScript, Next.js/SSR, state management libraries, ORMs, custom auth flows, background jobs.
