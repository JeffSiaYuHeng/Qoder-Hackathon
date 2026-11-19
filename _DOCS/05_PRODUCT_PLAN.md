# Scam Response App: Hackathon Plan (Draft for Discussion)

> **Working names:** ScamSOS · Golden Hour · KenaScam · FirstMove
> **Time budget:** 2 hours
> **Status:** idea / scoping

---

## 1. Verdict

**Build it, but cut it down to one flow.**

The problem is real and urgent, and it demos well. In the first hour after a scam, victims panic and don't know what to do or in what order. The original idea has 6 features and we only have 2 hours, so we pick the one flow that wins the demo.

## 2. Pitch

> "Scammed? Hit one button. In 60 seconds you have a police-ready report, the numbers to call, and your bank's freeze page open."

It's a **panic-to-action agent**, not a scammer database.

---

## 2b. Locked 2-Hour Scope (v2: decided after discussion)

**Principle:** One incident, one source of truth, multiple reports. Build *one* happy path that never breaks on stage.

| Build (P0) | How | Fake / skip |
|---|---|---|
| Intake (textarea + 3 quick fields) | One LLM call → incident JSON | Screenshot/OCR upload |
| Detected summary + "missing info" flags | Same LLM call | Asking follow-up questions |
| Institution picker | Hardcoded registry JSON (~4 banks, TNG, Shopee) | Full list of banks |
| Action checklist + call buttons | Rules (997 first, then bank), `tel:` links | Real calling |
| Agent lookup "moment" | One live search for the bank's fraud page, only official domains accepted; falls back to the registry | Multi-agent architecture (slide only) |
| Reports: Police + Bank (+ Shopee if time) | Templates filled from incident JSON, LLM only writes the narrative | Case tracking, database |
| Print + email draft | `window.print()` + `mailto:` | Sending emails, PDF attachments |

**Hour 1:** intake → LLM JSON → summary screen → picker → checklist.
**Hour 2:** report templates + print/email → agent lookup (with fallback) → rehearse.

Clickable mockup of this flow: [`mockup.html`](mockup.html)

---

## 3. Core User Flow (updated with our ideas)

```
[1] Pick your bank / e-wallet / platform
        ↓
[2] Tell us what happened (form or chat)
        ↓
[3] Agent looks up the right contacts live
    → fraud hotline (tap-to-call)
    → official fraud report page (open in one tap)
        ↓
[4] Ordered action checklist ("do these in order")
        ↓
[5] Generate a proper report
    → printable / PDF for police
    → ready-to-send email to the bank, e-wallet or platform (TNG, Shopee, etc.)
```

### Step 1: Select your bank or platform
- A page with logos/buttons: Maybank, CIMB, Public Bank, RHB, Hong Leong, plus e-wallets and platforms (Touch 'n Go eWallet, Shopee/ShopeePay, Grab, Boost, etc.).
- Multi-select is allowed, since the money may have moved through more than one (e.g. a bank transfer to a scammer *and* a Shopee listing).

### Step 2: Intake
Fields: what happened, amount, date/time, how they were contacted (call / WhatsApp / SMS / social media / marketplace), the scammer's phone number, account number, URLs, and transaction reference.

### Step 3: Agent finds bank/platform contacts
- For each selected institution the agent returns:
  - **Fraud hotline** → `tel:` link (one tap to call)
  - **Official fraud report / card-block page URL** → opens in a new tab or the app
  - **Official support email** (if one exists), used for the email report
- **Approach:** live lookup by the agent + **hardcoded fallback for the top ~5 banks and the main e-wallets** (so the demo never breaks).
- **Hard rule:** the agent **never logs in, never handles credentials, never blocks anything itself.** It opens the page and the user acts. (Handling bank credentials kills you with judges and is a real security problem.)

> 💬 **To discuss:** "URL (I'm thinking SDK)". What do we mean here?
> - (a) Just deep links / web URLs to the official fraud pages (simplest, works for the demo)
> - (b) App deep links that open the bank's mobile app directly (e.g. `maybank2u://`); these are often undocumented or unreliable
> - (c) An AI agent SDK (e.g. Claude Agent SDK / AI SDK with a web-search or browser tool) that powers the live lookup
> - Likely answer: **(c) to find the pages, (a) to hand them to the user.**

### Step 4: Action plan UI
- A countdown-style "do these in order" checklist, for example:
  1. Call your bank's fraud line now → [Call] button
  2. Call NSRC **997** (Malaysia) → [Call] button
  3. Open your bank's fraud report page → [Open] button
  4. Make a police report → nearest station link (geolocation + Google Maps)
  5. Report to the platform (Shopee / TNG / etc.) → [Send email] button
- A **call script** for each call: what to say, which details to have ready, and an explicit request to freeze or recall the transaction.

### Step 5: Report generation
Two outputs from the same data:
1. **Police-ready printable report**: timeline, amounts, scammer's account, phone number and URLs, transaction refs, and a space for screenshots. Built with `window.print()` and print CSS, or a PDF.
2. **Pre-filled email** to each selected institution (TNG, Shopee, bank):
   - Subject line + body generated by the LLM
   - Opened via a `mailto:` link (user's own email client, so the user sends it and we don't)
   - The printable report attached manually by the user, or summarised inline

> ⚠️ Note: TNG, Shopee and banks are **platforms**, not **authorities**. Authorities = PDRM / NSRC 997 / CCID / BNM. The report should go to both groups, worded differently: the platforms get a freeze/recall request and the authorities get the incident report.

---

## 4. Feature Scope

| Idea | Keep? | Why |
|---|---|---|
| Bank / platform selection page | ✅ Core | Entry point. Drives the lookups and who the emails go to. |
| Guided intake → action plan | ✅ Core | The LLM turns intake into ordered steps. The heart of the app. |
| Agent finds bank hotlines + report pages | ✅ Core (changed) | Live lookup + hardcoded fallback. Agent opens pages, never logs in. |
| One-click printable report | ✅ Core | Easy to build and looks great in a demo. |
| Email report to platforms (TNG, Shopee, banks) | ✅ Keep, simple | `mailto:` with a pre-filled subject/body. No email-sending backend. |
| Nearest police station + hotline | ✅ Keep, simple | Geolocation + Google Maps link. Hardcode NSRC 997 (MY) / 1799 ScamShield (SG). |
| Phone call script | ✅ Keep as text | No real calling (Twilio etc.) in 2 hours. |
| Shared scammer list | ❌ Cut / link out | Defamation and false-report risk, plus an empty DB on demo day. Link to official lookups instead (e.g. CCID **Semak Mule**). |

---

## 5. Suggested LLM Output Shape

```json
{
  "steps": [
    { "order": 1, "title": "Call Maybank fraud line", "action": "call", "value": "tel:..." , "urgency": "now" }
  ],
  "institutions": [
    {
      "name": "Maybank",
      "type": "bank",
      "hotline": "...",
      "report_url": "https://...",
      "email": "...",
      "source": "live | fallback"
    }
  ],
  "call_script": "Hi, I'm calling to report a fraudulent transfer...",
  "report_fields": {
    "victim_summary": "...",
    "timeline": [{ "time": "...", "event": "..." }],
    "amount": "RM 4,800",
    "scammer_contacts": { "phone": "...", "account": "...", "urls": [] },
    "transaction_refs": []
  },
  "emails": [
    { "to": "...", "subject": "...", "body": "..." }
  ]
}
```

---

## 6. 2-Hour Build Plan

| Time | Task |
|---|---|
| 0:00–0:15 | Scaffold a Next.js app: one page + one LLM endpoint |
| 0:15–0:30 | Bank/platform selection page + hardcoded fallback contact data |
| 0:30–0:55 | Intake form → LLM returns the structured JSON above |
| 0:55–1:15 | Action plan UI: checklist, `tel:` buttons, "open page" buttons, police station map link |
| 1:15–1:35 | Printable report (print CSS) + `mailto:` email drafts |
| 1:35–1:50 | Agent live lookup of the chosen bank's fraud page (with fallback) |
| 1:50–2:00 | Rehearse the demo |

---

## 7. Demo Script (90 seconds)

1. "Ahmad just transferred **RM 4,800** to a scammer posing as a parcel courier. What does he do?" Nobody in the audience knows.
2. He picks **Maybank** + **Shopee**, then types what happened.
3. The app instantly shows: ① Call Maybank (button) ② Call 997 ③ Report printed ④ Police station 1.2 km away ⑤ Email Shopee.
4. The agent opens Maybank's fraud page **live**.
5. Click **Print report** → police-ready PDF. Click **Email Shopee** → pre-filled email opens.
6. Close with the stat: "Every hour of delay cuts recovery chances." (**Verify the real figure first.**)

---

## 8. Risks / Judge Questions

| Question | Answer |
|---|---|
| "Is the advice correct?" | Steps are based on official guidance (NSRC / PDRM / BNM), cited in the UI. |
| "Privacy?" | Nothing is stored. The report is generated client-side. Emails are sent from the user's own client. |
| "What if the agent finds a fake bank page?" | Allow-list of official domains; fall back to hardcoded verified contacts. Show a "source" label. |
| "Why not just Google it?" | Panicked people can't. We give them order, speed and a finished document. |
| "Do you touch bank accounts?" | No. We never log in or take credentials. We only open official pages. |

---

## 9. Open Questions

- [ ] What exactly does "SDK" mean for the URL piece (see Step 3)?
- [ ] Malaysia only, or Malaysia + Singapore?
- [ ] Which banks, e-wallets and platforms go in the hardcoded fallback list?
- [ ] Do we have verified fraud hotlines/emails for TNG, Shopee, Grab, Boost?
- [ ] Chat intake or form intake? (A form is faster to build; chat demos better.)
- [ ] Which LLM / agent framework? Do we need a web-search or browser tool for the live lookup?
- [ ] Should the email include the PDF as an attachment? (`mailto:` can't attach files, so we'd need a "download then attach" step or a send backend.)
- [ ] Bahasa Malaysia support?
- [x] Real recovery-time statistic for the closing line. **Answer:** there is no official measured figure. Use the official guidance: "call NSRC 997 within 24 hours" (malaysia.gov.my), and the Home Minister's "the first one to two hours are crucial" (Malay Mail, 3 Mar 2026). See [06_DESIGN.md](06_DESIGN.md) §8.
