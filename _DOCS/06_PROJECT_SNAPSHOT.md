# 06 — Project Snapshot

> **Living status file.** Last updated: 2026-11-20 (live verification).
> Keep this current — see [How to update](#how-to-update) and the rule in [AGENTS.md](../AGENTS.md).

## Status at a glance

| | |
| --- | --- |
| App | ScamSOS — guest-only React + Vite SPA; Supabase is read-only (institutions registry) |
| Latest commit | `ab094e0` — auth remnants removed (no login strings, no dead `.badge` CSS, README/design docs synced); builds on `ebc6149` welcome + Gemini AI reports + PDF |
| Golden path | Welcome → "Get help now" → tell story (voice or text) → AI autofill + detected institutions → confirm → action plan with AI report drafts → download PDF → email reports → print |
| Build | `npm run build` passes |
| Deploy | **Live: https://scamsos.vercel.app** (Vercel CLI, prod env vars set; welcome → intake → picker → plan verified on the deployed URL, including AI report bodies and the AI police statement via `/api/report`) |
| Demo blockers recorded | None in-repo. All AI paths use Gemini (`AI_STUDIO_API`); the Qoder SDK experiment stays in gitignored `Qoder SDK/` |

## What works today

- **No auth** — no sign-in, no form, no demo login, no Supabase session. `AuthScreen` is deleted and no login strings or CSS remain; `src/lib/supabase.js` is used only to read the institutions registry.
- **Welcome screen** — `WelcomeScreen.jsx` opens the app: 997 bar, headline, one "Get help now" CTA, the three-step flow and a trust line. Entry choice persists in `sessionStorage` (`scamsos.entry`); there is no login button.
- **Story-first flow** — intake → confirm institutions → action plan (`Stepper.jsx` FLOW). `/api/analyze` (Gemini `gemini-3.8-flash`, structured JSON) autofills amount/time/method/suspect details and detects institutions (badged in the picker); user confirms/edits before the plan is built.
- **Institution picker** — reads the `institutions` registry from Supabase; multi-select by slug across banks, e-wallets and platforms; shows AI-extracted summary + detected chips.
- **Intake** — story, amount, time, contact method, suspect phone/account, transaction reference.
- **Voice intake** — "Speak instead of typing" opens a hold-to-talk dialog (`VoiceDialog.jsx`): hold the mic to record (pulsing ring + equalizer bars), release to transcribe via `/api/stt` (Google AI Studio / Gemini); the transcript appends straight into the story box, with Record again / Done. Auto-stops at 60 s; Escape/backdrop cancels; the key stays server-side. `vite.config.js` mounts the same handler in dev.
- **Action plan** — `src/lib/plan.js` builds ordered steps, a call script and **one template report per institution** (mailto draft for every institution, even without a known address) client-side, localized EN/BM.
- **AI report drafts** — `/api/report` (Gemini `gemini-3.8-flash`, structured JSON, 20 s deadline) rewrites the report bodies and produces a cleaned police statement. Each body is validated (institution name, supplied suspect fields verbatim, amount unchanged, disclaimer kept); any failure keeps the templates, so the screen renders instantly and never blocks.
- **Live lookup** — `/api/lookup` (Gemini `gemini-3.5-flash-lite` + Google Search grounding, official-domain whitelist, live URL verification, 8 s timeout → registry fallback). UI shows the agent log and verified contact cards with live/registry badges.
- **Send reports** — `/api/send` via Resend; `DEMO_MODE=true` redirects all mail to `DEMO_INBOX` with a `[DEMO for …]` subject prefix (never emails real banks). Per-report sent/failed status; mailto drafts remain as fallback. Real delivery tested.
- **Privacy** — incidents live only in React state (`crypto.randomUUID()` id); nothing is written to Supabase. Incident tables are now unused.
- **Outputs** — `tel:` / open / maps / email buttons, call script panel, printable police-ready report (prints `statement` when AI drafted it).
- **PDF report** — `src/lib/pdf.js` (pdf-lib, A4, lazy-loaded chunk) builds one incident PDF (police report + checklist status + every institution draft); "Download PDF" button on the action plan, and the same PDF is attached to the Resend emails when "Send all reports" runs (`server/send.js` validates base64 + ≤ 4 MB).
- **i18n** — EN/BM toggle in the topbar, persisted in `localStorage` (`scamsos.lang`); includes the `stepsDone` progress label.
- **Theme** — light/dark via `ThemeToggle.jsx`: device preference by default, a manual pick sets `data-theme` on `<html>`. All colours are design tokens at the top of `src/index.css`.
- **Flow chrome** — `Stepper.jsx` (Tell us → Confirm → Action plan) and `EmergencyBar.jsx` (Call 997 on every screen).
- **Demo mode** — `?demo` (`src/demoMode.js` intercepts `tel:`/`mailto:` clicks with toasts; `src/lib/demo.js` serves canned analyze/lookup results and a one-click demo story). Both trigger on any `?demo` value.
- **Styling** — Tailwind CSS v4 (`@tailwindcss/vite`, `@import "tailwindcss"` + a `@theme` bridge to the design-system tokens at the top of `src/index.css`), **plus** the design-system CSS: light/dark token sets and component classes (`.card`, `.panel`, `.step`, `.action-btn`, `.primary`, `.link`, `.card-grid`, voice dialog, print CSS). Component classes are unlayered, so they win over utilities. Spec in [06_DESIGN.md](06_DESIGN.md).

## Not built (PRD-only)

- Screenshot OCR, case tracking.
- Voice input is implemented and the hold/release flow was verified in-browser with a fake mic stream (speech WAV → transcript appended to the form); a real microphone still needs one manual permission-prompt check.
- The guest-only story-first golden path (analyze → picker → plan → AI reports → PDF) was verified in-browser on 2026-11-19; the deployed URL still needs a phone smoke test.

## Known gaps / decisions

1. **Privacy claim vs storage — RESOLVED 2026-11-19.** Incidents are no longer written to Supabase; they live only in React state, matching PRD §9. Incident tables remain in the schema but are unused.
2. **PRD schema drift.** PRD §8 describes `institutions` with `kind`, `fraud_hotline`, `official_domains`, etc.; the live table uses `type`, `hotline`, `report_url`, `support_email`.
3. **`reports` table is unused** — reports are client-rendered per institution and sent via Resend/mailto, not persisted.
4. **`mockup.html`** is linked from the PRD but lives at `_DOCS/mockup.html` (not the repo root; the earlier "missing" note was wrong).
5. **Demo credentials** are gone with the auth screen; there is nothing to sign in to.
6. **RLS is off**, but the app now only reads the `institutions` registry with the anon key; no incident data reaches the database.

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

1. Browser-test the new golden path end to end (incl. `?demo`), then deploy to Vercel with env vars and run it on a phone.
2. Fix PRD §8 schema drift to match the live `institutions` table.
3. Rehearse the 90-second demo and prepare offline fallbacks (`?demo`).

## How to update

After any task that changes app behavior, schema, or scope:

1. Edit the sections above — keep them short and factual.
2. Set **Last updated** to today's date.
3. Append **one** dated line under [Update log](#update-log). Append only — never rewrite or delete another agent's line.
4. If the work is left uncommitted, say so in the log line.

## Update log

- **2026-11-19** — Merged follow-up `origin/main` docs commits before push: `07_VOICE_INTAKE.md` spec, doc-list and PRD intake updates; conflicts in `00_STRUCTURE.md` and `04_PRD.md` resolved.
- **2026-11-19** — All docs moved into `_DOCS/` and renamed to numbered uppercase files (`00_STRUCTURE` … `05_PRODUCT_PLAN`).
- **2026-11-19** — Auth gate and full incident flow committed (`bbd7adb`); `incidents.user_id` added to the schema.
- **2026-11-19** — EN/BM i18n added (`src/lib/i18n.js`), committed (`298f219`).
- **2026-11-19** — Created this snapshot; added the update rule to [AGENTS.md](../AGENTS.md). Note: at creation time teammates had an uncommitted Tailwind v4 restyle in flight (`package.json`, `vite.config.js`, `src/index.css`).
- **2026-11-19** — Tailwind v4 restyle finished: all screens converted to utilities, report/print CSS kept hand-written, committed (`ec6cb56`).
- **2026-11-19** — Guest mode added: "Continue as guest" on `AuthScreen`, `sessionStorage` flag in `App.jsx`, guest incidents save with `user_id = null`. Verified the guest golden path in the browser (INSERT succeeded) and deleted the test row. Docs updated; uncommitted at the time of writing.
- **2026-11-19** — Voice intake added via Google AI Studio (Gemini): `src/lib/stt.js`, `server/stt.js`, `api/stt.js`, dev middleware in `vite.config.js`, mic UI in `IntakeForm.jsx`, EN/BM voice strings. Endpoint verified through the dev server; mic capture needs a manual browser check. Docs updated; uncommitted at the time of writing.
- **2026-11-19** — Voice UI rebuilt as a hold-to-talk dialog (`src/VoiceDialog.jsx`): press-and-hold mic with pulse/equalizer animation, release-to-transcribe, spinner, transcript appended directly to the form, Record again / Done, Escape/backdrop cancel. Verified end to end in-browser with a fake mic stream; docs updated; uncommitted at the time of writing.
- **2026-11-19** — Merge of `origin/main` in progress (merge commit pending): landed the light/dark design system (`06_DESIGN.md`, `src/index.css` tokens), `ThemeToggle`, `Stepper`, `EmergencyBar` and `?demo=1` (`src/demoMode.js`) alongside guest mode, EN/BM i18n (`stepsDone`) and voice intake. Tailwind v4 kept by owner decision, coexisting with the design-system CSS (token bridge in `@theme`; design classes unlayered and win over utilities; old `.grid` renamed `.card-grid`). Resolved conflicts in `00_STRUCTURE.md` and `03_TECH_STACK.md`. Still uncommitted: teammate edits to `api/analyze.js` + `server/analyze.js` swapping Gemini for the Qoder Agent SDK (local `qodercli`, env-var stripping) — excluded from the merge commit.
- **2026-11-19** — Privacy + story-first flow shipped: no Supabase incident writes (React state only), guest by default, intake→confirm→plan order, Gemini analyze autofill + detected institutions, live lookup panel and per-institution reports with Resend send-all (DEMO_MODE inbox) in `ActionPlan.jsx`; `?demo` unified across `demoMode.js`/`lib/demo.js`; Gemini analyze restored from HEAD (SDK experiment kept in gitignored `Qoder SDK/analyze-experiment/`). Build passes; browser golden-path check and Vercel deploy still pending.
- **2026-11-19** — Deployed to Vercel production via CLI: **https://scamsos.vercel.app** (project `scamsos`, GitHub repo connected, six prod env vars set). Deployed from the working tree, so it includes teammates' in-flight report/PDF pipeline (uncommitted). Smoke-tested deployed `/api/analyze` (correct extraction + detection), `/api/lookup` (registry fallback exercised) and `/api/send` (delivered to DEMO_INBOX, never the bank). Local git is ahead 1 / behind 3 of origin — merge+push of teammate work still pending.
- **2026-11-20** — Workflow D: incident PDF via pdf-lib (`src/lib/pdf.js`, lazy `import()` → separate `pdf-*.js` chunk), "Download PDF" button + PDF build inside `sendAll` (`src/ActionPlan.jsx`), `pdf_base64`/`pdf_filename` forwarded `src/lib/agent.js` → `api/send.js` → `server/send.js` (validated, `attachments` per Resend payload; DEMO_MODE still routes to `DEMO_INBOX`). `reportsBusy` prop stub added; `downloadPdf`/`pdfBuilding` keys are provisional (another agent is adding theirs — merge on conflict). Build passes; download + send payload checked in-browser, `server/send.js` checked in Node. Uncommitted at the time of writing.
- **2026-11-19** — Removed sign-in: deleted `AuthScreen.jsx`, auth/session/guest state and topbar account controls; app opens straight into intake. Reports now drafted by Gemini through `/api/report` (`server/report.js`, `src/lib/report.js`, strict validation, 20 s deadline → templates) instead of the local-only Qoder SDK; `src/App.jsx` merges the AI bodies + statement in the background. Verified locally and on https://scamsos.vercel.app (`/api/report` → `source:"ai"`); build passes. Docs updated; uncommitted at the time of writing.
- **2026-11-19** — Merged the welcome-screen commit but dropped its UI-only login per owner request: `WelcomeScreen` keeps the 997 bar, one "Get help now" CTA and the flow steps; `AuthScreen`, the `login` entry state and the fake user are gone. LangSwitch + zh dictionary preserved. Verified welcome → intake → plan with AI reports in-browser; build passes. Uncommitted at the time of writing.
- **2026-11-20** — Live golden path re-verified on https://scamsos.vercel.app with two institutions selected (Maybank, Shopee): `/api/report` → 200, AI bodies render in both report panels (suspect account + RM amount verbatim, disclaimer kept) and the AI statement replaces the raw story in the police report. (An earlier scripted test hit a 400 by continuing with zero institutions — the picker itself blocks that; no app bug.) Docs updated; committed.
- **2026-11-20** — Auth cleanup: removed unused `login.note`/`login.back` strings from all three locales, the dead `.badge` CSS (and its `.topbar .badge` override), and "sign-in" wording in `EmergencyBar`/CSS comments; README and design docs synced to the no-account, in-memory flow. Build passes; committed (`ab094e0`).
