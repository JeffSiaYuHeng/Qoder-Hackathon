# PRD: ScamSOS (Hackathon MVP)

> **From panic to action.** A scam victim says what happened once. ScamSOS tells them who to call first, finds each institution's official fraud channels, and sends each one a report written for it.

| | |
|---|---|
| **Status** | Draft v1, for the 2-hour hackathon build |
| **Stack** | React (JS) + Vite · Supabase · Vercel. See [03_TECH_STACK.md](03_TECH_STACK.md) |
| **Mockup** | [mockup.html](mockup.html) (the source of truth for screens and copy) |
| **Background** | [05_PRODUCT_PLAN.md](05_PRODUCT_PLAN.md) |
| **Market** | Malaysia first (NSRC 997, PDRM, Malaysian banks, e-wallets and platforms) |

---

## 1. Problem

In the first hour after a scam, victims panic. They don't know:
- **who** to contact (their bank, NSRC 997, the police, the e-wallet, the shopping platform),
- **in what order** (calling the bank to freeze the money matters most, and every minute counts),
- **what to send** (each institution needs different details in a different format).

So they Google phone numbers (and sometimes land on fake "recovery" sites), type the same story four times, and lose the window to freeze the money.

## 2. Solution

One incident in, one source of truth, many actions out:

1. The victim describes the incident **by voice or text**.
2. The AI extracts structured incident data and flags what's missing.
3. The victim confirms which **banks, e-wallets and platforms** are involved.
4. The app shows an **ordered action plan**: call buttons, a call script, and a **live agent lookup** of each institution's official fraud channels.
5. The app generates **a report for each institution** and sends them all with **one click**, with the victim in CC. The police report is printed.

## 3. Goals and non-goals

**Goals (demo day)**
- G1: From opening the app to the first call button in **under 60 seconds**.
- G2: The full happy path (voice → analysis → plan → lookup → send) runs live on stage with no breakages.
- G3: Judges see three visible results: a **live agent lookup**, an **email that actually arrives in an inbox**, and a **printable police report**.

**Non-goals**
- Logging into, or acting inside, any bank or e-wallet account. We never handle credentials.
- A public scammer database (defamation and false-report risk).
- Promising that money will be frozen or recovered.
- Filing the police report for the user. They lodge it themselves; we prepare the document.
- User accounts, case tracking, multiple languages in the UI, a native app.

## 4. Users

| Persona | Context | Needs |
|---|---|---|
| **Victim** (primary), e.g. "Ahmad, 52", just lost RM4,800 to a fake courier | Panicking, on a phone, possibly unable to type properly | To be told exactly what to do next, big buttons, no forms |
| **Helper**, e.g. a family member helping the victim | Calmer, may be on a laptop | To check details and send the reports |
| **Judge** (demo audience) | 90 seconds of attention | A clear before/after, something live, something they can check |

## 5. User flow

```
Home ──► What happened (voice / text) ──► AI analysis + pick institutions
                                                │
                                                ▼
             Reports + one-click send ◄── Action plan + live agent lookup
```

Screens map 1:1 to [mockup.html](mockup.html). A 60-minute "golden hour" countdown runs from the moment the user starts.

---

## 6. Functional requirements

Priority: **P0** = must work on stage · **P1** = build if time allows · **P2** = mock or describe on a slide.

### F1. Home (P0)
- A big "I've been scammed. Help me now" button.
- A secondary **Call NSRC 997** button (`tel:997`), always reachable without going through the flow.
- "Nothing is stored" privacy line (must be true; see §9).

**Done when:** the user can call 997 with a single tap, without entering any data.

### F2. What happened: voice + text intake (P0)
- **Voice input** with the browser's built-in speech-to-text (Web Speech API, `webkitSpeechRecognition`, `lang = 'en-MY'`, interim results shown live in the text box).
- **Fallback:** if the browser doesn't support it (Firefox) or permission is denied, hide the mic button and type instead. **Demo fallback:** a pre-recorded transcript plays in with the same animation as the mockup.
- The text box can always be edited.
- Quick fields: payment method chips, amount, when.
- "Analyse my case" → calls `POST /api/analyze`.

**Done when:** speaking the demo scenario into Chrome fills the text box, and the user can edit it before submitting.

### F3. AI analysis + institution picker (P0)
- Shows the extracted data: scam type, amount, contact channel, scammer account, transaction ID, and urgency.
- **Missing fields are shown as "To add"**, never guessed (e.g. transaction ID).
- Institution grid comes from the Supabase `institutions` table. Detected institutions are pre-selected with a "Detected" label; the user can add or remove any.

**Done when:** the demo story detects Maybank and Shopee, the amount is RM 4,800, and the transaction ID shows as "To add".

### F4. Action plan (P0)
Ordered checklist built by **rules, not the LLM**:
1. Call the victim's bank fraud line (`tel:` from the registry) + an expandable **call script** (LLM-written, filled with the incident data).
2. Call NSRC 997.
3. Live agent lookup of official channels (F5).
4. Make a police report: nearest station via a Google Maps search link (`https://www.google.com/maps/search/balai+polis` + geolocation if allowed).
5. Report to the platforms: jumps to F6.

Each item can be ticked off.

**Done when:** steps always show in this order, and every phone number comes from the registry, never from the LLM.

### F5. Live agent lookup (P0 with fallback)
- "Run live agent lookup" → `POST /api/lookup` with the selected institution IDs.
- For each institution, the agent searches the web for its official fraud hotline, fraud report page and complaint email.
- **Safety rules (non-negotiable):**
  - Accept a result only if its domain is in that institution's `official_domains` list in the registry.
  - **Registry beats agent:** phone numbers and emails shown to the user always come from the registry. The agent may only add or refresh a **fraud page URL**, and only on an official domain.
  - Show the rejected domains in the log ("not official, skipped"). This is part of the demo.
  - If the agent fails or times out after **8 seconds**, show the registry data marked "From verified registry".
- UI: a streaming log (as in the mockup), then a "Verified" card for each institution.

**Done when:** at least one real live lookup succeeds on stage, and turning off the network still shows the registry cards.

### F6. Reports + one-click send (P0)
- One incident → one report per recipient:
  - **Police incident report:** timeline, amounts, scammer details, evidence checklist. **Print only** (`window.print()` with print CSS). Not emailed.
  - **Bank:** asks for an urgent freeze or recall of the transfer and a case reference number.
  - **E-wallet:** asks them to investigate the transaction and restrict the receiving account.
  - **Platform (Shopee etc.):** reports the link, seller or order and asks them to keep the records for the police.
- Templates are **fixed in code**. The LLM writes only the narrative paragraph and the subject line. Missing fields show a highlighted `[to add]`.
- User enters their email once.
- **"Send all reports in one click"** → `POST /api/send` → one email per institution:
  - `To`: the institution's `report_email` from the registry (**in demo mode, our team's inbox instead**, see §9)
  - `CC` and `Reply-To`: the user's email, so the institution replies to the victim
  - Each card shows Sending… → Sent ✓ / Failed
- Backup for each report: an **"Open in my email app"** link (`mailto:`).

**Done when:** pressing Send on stage delivers a real email to the demo inbox within 10 seconds, and the judges see it arrive.

### F7. Nice-to-haves
| ID | Feature | Priority |
|---|---|---|
| F7.1 | Upload a screenshot of the transfer receipt → extract the transaction ID | P1 |
| F7.2 | Malay input and reports | P1 |
| F7.3 | CCID Semak Mule link to check the scammer's account or number (link out only) | P1 |
| F7.4 | Case tracking (save the reference numbers institutions reply with) | P2 (slide) |
| F7.5 | Native "Report a scam" button inside a bank's app (partner version) | P2 (slide) |

---

## 7. Architecture

The tech stack is a Vite SPA. **The browser must never hold the LLM, search or email API keys**, so we add a few **Vercel serverless functions in `/api`** to the same repo. It is still one app and one deploy; Vercel runs `api/*.js` alongside the Vite build with no extra config.

```
Browser (React + Vite)
  ├─ Web Speech API (STT, on the device)
  ├─ supabase-js (anon key) ──► Supabase: institutions (read-only)
  └─ fetch ──► Vercel functions (/api)
                 ├─ /api/analyze  → LLM: story → incident JSON
                 ├─ /api/lookup   → LLM + web search → official channels
                 └─ /api/send     → email service: one email per institution
```

> ⚠️ **Change to TECH_STACK.md:** add `api/` (Vercel functions) to the layout and the server-only env vars below. Without it, the API keys would be exposed in the browser.

### Planned layout (updated)
```
.
├── index.html
├── api/
│   ├── analyze.js
│   ├── lookup.js
│   └── send.js
├── src/
│   ├── main.jsx
│   ├── App.jsx                 # screen state machine: home → intake → analysis → plan → reports
│   ├── screens/                # Home, Intake, Analysis, Plan, Reports
│   ├── lib/supabase.js
│   ├── lib/reports.js          # report templates (pure functions: incident → text)
│   └── lib/plan.js             # rules: incident + institutions → ordered steps
├── .env.local
├── _DOCS/                      # 03_TECH_STACK.md, 04_PRD.md, …
└── AGENTS.md
```

### Environment variables
| Var | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Browser | Read the registry |
| `ANTHROPIC_API_KEY` (or chosen LLM provider's key) | Server only | `/api/analyze`, `/api/lookup` |
| `RESEND_API_KEY` (or other email service) | Server only | `/api/send` |
| `DEMO_MODE=true`, `DEMO_INBOX=<team inbox>` | Server only | Send all emails to our inbox instead of real institutions |

### Model choice
- `/api/analyze`: a fast model with structured JSON output (e.g. Claude Haiku 5.5 or Sonnet 5.5). Must answer in under 4 seconds.
- `/api/lookup`: a model with a web search tool, or a search API plus a model. Hard 8-second timeout, then fall back to the registry.

---

## 8. Data

### Supabase table: `institutions` (registry, read-only, public data only)
| Column | Type | Example |
|---|---|---|
| `id` | text (PK) | `maybank` |
| `name` | text | `Maybank` |
| `kind` | text | `bank` \| `ewallet` \| `platform` |
| `fraud_hotline` | text | (verified by hand before demo) |
| `fraud_page_url` | text | official URL |
| `report_email` | text | official address, if one exists |
| `official_domains` | text[] | `{maybank2u.com.my, maybank.com}` |
| `verified_at` | date | `2026-11-19` |
| `color`, `initial` | text | for the logo tile |

Seed for the demo: Maybank, CIMB, Public Bank, TNG eWallet, Shopee, Grab. **Every number and email is checked by hand on the official website before the demo.**

### Incident data (in the browser only, never stored)
```json
{
  "id": "SC-2026-001",
  "scam_type": "parcel_courier",
  "urgency": "critical",
  "amount": { "value": 4800, "currency": "MYR" },
  "occurred_at": "2026-11-19T14:15:00+08:00",
  "contact_channel": "whatsapp",
  "narrative": "…",
  "victim": { "name": null, "phone": null, "email": "…" },
  "scammer": { "account_no": "5123 4567 8901", "account_name": "ABC Logistik", "phone": null, "urls": [] },
  "transactions": [{ "institution_id": "maybank", "ref": null, "amount": 4800 }],
  "detected_institutions": ["maybank", "shopee"],
  "timeline": [{ "time": "13:40", "event": "WhatsApp message from fake J&T courier" }],
  "missing": ["transactions[0].ref", "victim.name", "victim.phone"]
}
```
`null` means unknown, and the UI shows "To add". The LLM prompt forbids guessing values.

### API contracts
| Endpoint | Request | Response |
|---|---|---|
| `POST /api/analyze` | `{ story, quick_fields }` | `{ incident, call_script }` |
| `POST /api/lookup` | `{ institution_ids }` | streamed log lines, then `[{ id, fraud_page_url, source: "live" \| "registry", rejected_domains[] }]` |
| `POST /api/send` | `{ user_email, reports: [{ institution_id, subject, body }] }` | `[{ institution_id, status: "sent" \| "failed" }]` |

`/api/send` looks up the `To` address from the registry **on the server**. It never trusts an address sent from the browser.

---

## 9. Non-functional requirements

| Area | Requirement |
|---|---|
| **Privacy** | Incident data stays in the browser and in function memory only. **No incident tables in Supabase** (RLS is off, so anything stored there could be read by anyone with the anon key). No analytics on story text. |
| **Safety** | Phone numbers and emails come from the registry only. Live links are limited to official domains. Every screen with a report says "Draft, check before sending · recovery not guaranteed". |
| **Demo mode** | `DEMO_MODE=true` sends **all** emails to the team inbox, with the intended recipient written in the subject. **We never email real banks during the hackathon.** |
| **Speed** | Analyze < 4 s; lookup < 8 s (then fallback); send < 10 s. |
| **Resilience** | Every live step has an offline fallback: canned transcript, canned incident JSON, registry lookup, `mailto:`. A hidden `?demo=1` switch forces all fallbacks. |
| **Mobile** | Phone-first layout; buttons at least 44 px; works in Chrome on Android and iOS Safari (voice works in Chrome first). |
| **Accessibility** | Large type, high contrast; actions never shown by colour alone. |

---

## 10. Build plan (2 hours, 3–4 people)

| Time | Frontend (A) | Frontend (B) | Backend / AI (C) | Data + demo (D) |
|---|---|---|---|---|
| 0:00–0:15 | Vite scaffold, screen state machine | Port mockup CSS | `api/` setup, env vars on Vercel | Create `institutions` table, start checking numbers by hand |
| 0:15–0:50 | Home + Intake + Web Speech | Analysis screen + picker (Supabase) | `/api/analyze` prompt + JSON schema | Finish registry seed, demo inbox |
| 0:50–1:20 | Plan screen + `plan.js` rules | Reports screen + `reports.js` templates + print CSS | `/api/send` (email service, demo mode) | Write the canned fallbacks |
| 1:20–1:45 | Wire lookup log streaming | Wire send statuses, mailto fallback | `/api/lookup` + domain allow-list + timeout | Deploy to Vercel, test on a phone |
| 1:45–2:00 | **Freeze code.** Full run-through twice on the deployed URL, once with `?demo=1` | | | |

If behind at 1:20: cut live lookup to registry-only with a fake log (F5 fallback), and keep send.

---

## 11. Demo script (90 s)

1. "Ahmad just lost **RM4,800** to a fake courier. What does he do?" (Silence.)
2. Open ScamSOS → **speak** the story → the text appears.
3. Analysis: Maybank + Shopee detected, transaction ID flagged "To add".
4. Action plan: "Call Maybank" and "Call 997" at the top → run the **live agent lookup**: it skips a fake site and verifies the official one.
5. Reports → **Send all** → switch to the team inbox: the emails have arrived.
6. Print the police report.
7. Close: "Free for victims, always. Banks and e-wallets pay to receive clean, structured reports."

## 12. Success criteria

- [ ] The happy path runs end-to-end on the deployed Vercel URL, on a phone.
- [ ] A real email arrives in the demo inbox during the demo.
- [ ] Zero phone numbers or links that weren't checked by hand appear on screen.
- [ ] Every live step has a working fallback.

## 13. Risks

| Risk | Mitigation |
|---|---|
| Venue Wi-Fi fails | `?demo=1` fallbacks; phone hotspot |
| Speech-to-text mishears Malaysian English | The text box is editable; canned transcript fallback |
| The LLM invents a phone number or URL | Numbers only come from the registry; domain allow-list; prompt forbids guessing |
| Emails go to spam / sender domain not verified | Set up the email service's verified sender domain early; demo inbox is ours |
| Judges ask "do you actually email banks?" | "Not in the demo. In production it needs each bank's agreement on which address and format to use, and that's our B2B model." |

## 14. Open questions

- [ ] LLM provider and model: confirm the key and the account's rate limits.
- [ ] Email service: Resend or another? Who owns the sending domain?
- [ ] Which team inbox is the demo recipient?
- [ ] Do banks and platforms actually accept scam reports by email? (For many, the real channel is the hotline or an in-app form. Check for each institution and set `report_email` to null where there isn't one; those show as "Open fraud page" instead of being emailed.)
- [ ] Does PDRM accept any reports online, or is it only at a station? (This affects the police step's wording.)
