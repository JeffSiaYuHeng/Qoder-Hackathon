# 02 — Server-Side API

There is **no custom server today**. The browser talks straight to Supabase (PostgREST + Auth) with the public anon key. The planned `/api` functions in [04_PRD.md](04_PRD.md) are not built yet.

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

Vite inlines `VITE_*` into the client bundle — treat them as public. Never put the `service_role` / `sb_secret_*` key in a `VITE_*` var or anywhere in `src/`.

Server-only vars planned but unused today: `ANTHROPIC_API_KEY` (or other LLM), `RESEND_API_KEY` (or other email service), `DEMO_MODE`, `DEMO_INBOX`.

## Auth (Supabase Auth)

| Call | Where | Notes |
| --- | --- | --- |
| `supabase.auth.getSession()` | `src/App.jsx` | Restores the session on load |
| `supabase.auth.onAuthStateChange(cb)` | `src/App.jsx` | Keeps `session` in sync; unsubscribed on unmount |
| `supabase.auth.signInWithPassword({ email, password })` | `src/AuthScreen.jsx` | Email/password sign-in |
| `supabase.auth.signOut()` | `src/App.jsx` | Topbar "Sign out" |

`src/AuthScreen.jsx` has a hardcoded demo account behind a "Use demo account" button (marked `HACK`). Do not reuse that pattern outside the demo.

There is no sign-up flow and no password reset. Users must already exist in Supabase Auth.

## Data calls (PostgREST via supabase-js)

| Operation | Where | Equivalent |
| --- | --- | --- |
| Load registry | `src/InstitutionPicker.jsx` | `select * from institutions order by name` |
| Create incident | `src/App.jsx` `submitIntake()` | `insert into incidents (...) returning *` |
| Link institutions | `src/App.jsx` `submitIntake()` | `insert into incident_institutions (...)` for each selected |
| Save steps | `src/App.jsx` `submitIntake()` | `insert into action_steps (...) returning *` |
| Tick a step | `src/App.jsx` `toggleStep()` | `update action_steps set done = $1 where id = $2` |

Payloads match the columns in [01_DATA_SCHEMA.md](01_DATA_SCHEMA.md), including `user_id` (FK to `auth.users`).

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
- No Supabase Edge Functions, no database RPCs, no custom CORS config in the repo.
- The only "server-side" secret today is none — everything is public client code.
