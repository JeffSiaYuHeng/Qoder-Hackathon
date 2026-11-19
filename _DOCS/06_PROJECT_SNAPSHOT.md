# 06 — Project Snapshot

> **Living status file.** Last updated: 2026-11-19.
> Keep this current — see [How to update](#how-to-update) and the rule in [AGENTS.md](../AGENTS.md).

## Status at a glance

| | |
| --- | --- |
| App | ScamSOS — React + Vite SPA backed by Supabase |
| Latest commit | `ec6cb56` — Tailwind CSS v4 adopted; UI restyled with utilities |
| Golden path | Sign in → pick institutions → intake → action plan → print |
| Build | `npm run build` configured; a `dist/` build exists |
| Deploy | Not confirmed in-repo; `vercel deploy` is available |
| Demo blockers recorded | None as of the latest commit |

## What works today

- **Auth gate** — Supabase email/password; one-click demo account (hardcoded `HACK` in `src/AuthScreen.jsx`).
- **Institution picker** — reads the `institutions` registry from Supabase; multi-select across banks, e-wallets and platforms.
- **Intake** — story, amount, time, contact method, suspect phone/account, transaction reference.
- **Action plan** — `src/lib/plan.js` builds ordered steps, a call script and `mailto:` drafts **client-side** (rule-based LLM stand-in), localized EN/BM.
- **Persistence** — on submit, writes `incidents`, `incident_institutions`, `action_steps`; ticking a step updates `action_steps.done`.
- **Outputs** — `tel:` / open / maps / email buttons, call script panel, printable police-ready report.
- **i18n** — EN/BM toggle in the topbar, persisted in `localStorage` (`scamsos.lang`).
- **Styling** — Tailwind CSS v4 via `@tailwindcss/vite`; theme tokens in `src/index.css`, printable-report and `@media print` CSS hand-written.

## Not built (PRD-only)

- `POST /api/analyze`, `/api/lookup`, `/api/send` — no LLM, no live agent lookup, no server-side email sending.
- One-click “send all reports” from a team inbox — email today is `mailto:` only.
- `?demo=1` fallback switch, voice intake, screenshot OCR, case tracking.

## Known gaps / decisions

1. **Privacy claim vs storage.** [04_PRD.md](04_PRD.md) §9 says incident data is never stored, but `src/App.jsx` writes full incidents to Supabase with RLS off. Fix the wording or the behavior before showing both on stage.
2. **PRD schema drift.** PRD §8 describes `institutions` with `kind`, `fraud_hotline`, `official_domains`, etc.; the live table uses `type`, `hotline`, `report_url`, `support_email`.
3. **`reports` table is unused** — the printable report is client-rendered, not persisted as a report row.
4. **`mockup.html` is linked from the PRD but missing** from the repo.
5. **Demo credentials are hardcoded** in `src/AuthScreen.jsx` and documented in [03_TECH_STACK.md](03_TECH_STACK.md) — demo only.
6. **RLS is off** — the anon key can read/write every table, including incident stories.

## Resolved

- `incidents.user_id` was missing from `db/schema.sql` while `src/App.jsx` inserted it. Fixed on 2026-11-19: the column now exists (`uuid` FK → `auth.users`, `on delete cascade`).

## Source of truth

| Area | Where |
| --- | --- |
| Repo map, flow | [00_STRUCTURE.md](00_STRUCTURE.md) |
| Tables, columns, seed | [01_DATA_SCHEMA.md](01_DATA_SCHEMA.md) / `db/schema.sql` |
| Auth and data calls | [02_SERVERSIDE_API.md](02_SERVERSIDE_API.md) |
| Stack, commands, env | [03_TECH_STACK.md](03_TECH_STACK.md) |
| Scope and demo script | [04_PRD.md](04_PRD.md) |

## Next steps (suggested)

1. Deploy to Vercel and run the golden path on a phone.
2. Decide the privacy wording (gap 1) depending on whether incidents stay in Supabase.
3. If time allows, build `/api/analyze` first, then `/api/lookup` with registry fallback, then `/api/send` — per [04_PRD.md](04_PRD.md) §7–§8.
4. Rehearse the 90-second demo and prepare offline fallbacks.

## How to update

After any task that changes app behavior, schema, or scope:

1. Edit the sections above — keep them short and factual.
2. Set **Last updated** to today's date.
3. Append **one** dated line under [Update log](#update-log). Append only — never rewrite or delete another agent's line.
4. If the work is left uncommitted, say so in the log line.

## Update log

- **2026-11-19** — All docs moved into `_DOCS/` and renamed to numbered uppercase files (`00_STRUCTURE` … `05_PRODUCT_PLAN`).
- **2026-11-19** — Auth gate and full incident flow committed (`bbd7adb`); `incidents.user_id` added to the schema.
- **2026-11-19** — EN/BM i18n added (`src/lib/i18n.js`), committed (`298f219`).
- **2026-11-19** — Created this snapshot; added the update rule to [AGENTS.md](../AGENTS.md). Note: at creation time teammates had an uncommitted Tailwind v4 restyle in flight (`package.json`, `vite.config.js`, `src/index.css`).
- **2026-11-19** — Tailwind v4 restyle finished: all screens converted to utilities, report/print CSS kept hand-written, committed (`ec6cb56`).
