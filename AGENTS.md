# AGENTS.md — Hackathon Project

## Context

This is a **2-hour hackathon project**. It exists to produce a working demo, fast. Judge criteria is a live demo that works, not code quality.

**Current status:** see [_DOCS/06_PROJECT_SNAPSHOT.md](_DOCS/06_PROJECT_SNAPSHOT.md). Keep it current — see "Project snapshot" below.

## Hard Rules

1. **No deep or complex architecture.** No microservices, no message queues, no event sourcing, no plugin systems, no DI containers, no layered/hexagonal patterns.
2. **One app, one process** unless a second process is unavoidable. A single server + single frontend is the maximum.
3. **Boring tech only.** Use whatever is already installed or one `npx`/`pip`/`brew` command away. No tooling evaluation.
4. **No abstractions invented for the future.** Three duplicated lines beats one premature helper. There is no "later" — the repo dies in 2 hours.
5. **No new dependencies without a clear demo payoff.** Each dependency costs minutes of setup; spend minutes only where the demo shows it.
6. **Hardcode anything non-essential.** API keys via `.env`, but user IDs, config, and content can be literal values.
7. **Fake what is slow.** If an integration takes more than ~10 minutes, stub it behind the same function signature and note it.

## Time Budget

- 0:00–0:15 — agree on demo script (what the judge sees), pick stack, scaffold
- 0:15–1:30 — build the golden path end to end (ugly is fine)
- 1:30–1:50 — fix only demo-blocking bugs, add one polish pass
- 1:50–2:00 — freeze code, rehearse demo, prepare fallback (screenshots/video)

**If behind schedule at any point:** cut scope from the demo script, never from working-ness.

## CLIs

List every CLI installed/useable for this project here. Add entries as you install them — agents should check this list before reaching for `npx`, `pipx`, `brew`, etc.

<!-- Format: `name` — version/install — what it is used for -->
- `node` / `npm` — Node 24 — app runtime and package manager
- `gh` — installed — GitHub repo operations
- `supabase` — v2.122.0 — DB queries and project management (auth via macOS keychain)
- `vercel` — v59.20.0 — hosting/deploy

## Commands

Fill these in once the stack is chosen. Agents use these; do not guess alternatives.

```bash
# install
npm install
# dev / run → http://localhost:5173
npm run dev
# test (optional — only if tests already exist)
# build
npm run build
```

## Project snapshot

`_DOCS/06_PROJECT_SNAPSHOT.md` is the live status file. When you finish any task that changes app behavior, schema, or scope:

1. Update the affected sections there — keep them short and factual.
2. Set **Last updated** to today's date.
3. Append **one** dated line under **Update log**. Append only — never rewrite or delete another agent's line.
4. If the work is left uncommitted, say so in that log line.

## Conventions

- Match existing style of the file being edited; do not reformat untouched code.
- Commit small and often on the hackathon branch. Never rewrite history mid-event.
- If a change would take more than ~10 minutes, stop and ask whether it is demo-critical.
- Leave a one-line `# HACK:` comment only when something is deliberately stubbed or hardcoded for the demo.
