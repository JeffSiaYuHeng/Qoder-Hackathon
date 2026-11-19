# 07 — Voice intake (AI fills the form)

On the "What happened" step the victim **speaks** their story. The AI turns the recording into text and fills every intake field: amount, time, how they were contacted, the scammer's phone and account, and the transaction reference. The victim checks the result and continues.

Visual rules (colours, sizes, badges) follow [06_DESIGN.md](06_DESIGN.md). This doc covers the flow, the states, and the contract between the screen and the AI.

## 1. Flow

```
What happened?
  ( 🎤  Tap and tell us what happened )      ← big primary button
  Type instead
        │ tap
        ▼
Listening… 0:12   (level meter, live words if available)
  ( ■ Done )   Cancel
        │ Done
        ▼
Reading your story…
  "Finding the amount, the time and the scammer's details…"
        │
        ▼
Check what we heard
  each field pre-filled and marked:
    ✓ From your voice     filled
    ? Please check        filled, but the AI is unsure (numbers: always)
    + Not mentioned       empty, fill in if you know
  [Show what we heard ▾]   [🎤 Add more]
  ( Looks right — get my action plan )
```

## 2. Rules

1. **The AI never guesses.** If something wasn't said, the field stays empty and shows "Not mentioned" (PRD F3).
2. **Everything stays editable.** The AI fills the form; the victim confirms it with one button.
3. **Numbers are always "Please check".** That covers the amount, the scammer's phone and account, and the transaction reference. Speech-to-text often mishears strings of digits. A wrong account number on a police report points the police at the wrong person. Show numbers large, with digits grouped (`5140 0000 1234`).
4. **Times are made absolute and readable.** The AI turns "yesterday about 3.40" into a full timestamp, and the screen shows it as "Wed 18 Nov, 3:40 pm" so a mistake is easy to spot.
5. **Mentioned institutions are suggested, not added silently.** "You mentioned CIMB. Add it?" works as a one-tap chip.
6. **Any language.** English, Malay or a mix. The fields come back in English; the transcript stays as spoken.
7. **"Add more" never overwrites the victim's edits.** A second recording adds to the story and fills only fields that are empty or marked "Please check".
8. **Typing is always available.** "Type instead" opens the normal text box, and the form works with no voice at all.

## 3. States to design

| State | What the victim sees | Notes |
|---|---|---|
| Ready | Large mic button (accent, at least 64 px), "Tap and tell us what happened", "Type instead" link | Tap to start and tap to stop. No press-and-hold, which is hard when panicking or for older users |
| Asking for the mic | The browser's permission prompt, with our line above it: "Allow the microphone so we can listen" | |
| Mic blocked or missing | "Your microphone is off. Type your story instead." The text box opens and gets focus | Never a dead end |
| Listening | "● Listening 0:12" (text and dot, not colour alone), level meter, big "Done" button, "Cancel" | Stops on its own after 90 s. Live words go in an `aria-live` region |
| Reading | "Reading your story…" with the steps being worked on | Show something within 400 ms |
| Check | Pre-filled form with a badge on each field, a collapsible transcript, "Add more" | Primary button: "Looks right — get my action plan" |
| AI failed | "We couldn't read that one. Here's what we heard — check it and carry on." The transcript goes into the story box and the other fields stay empty | Never lose what they said |
| Demo | With `?demo=1`, a "Use demo recording" button plays a canned story through the same Listening → Reading → Check animation | Backup for a noisy hall (PRD §9) |

**Field badge classes** (build with design tokens, icon plus text):

| Class | Label | Look |
|---|---|---|
| `.field-ai` | ✓ From your voice | `--ok` text |
| `.field-check` | ? Please check | Amber, like `.hints` (`--warn-*`) |
| `.field-missing` | + Not mentioned | `--ink-3` text |

## 4. Contract: screen ↔ AI

**Endpoint:** `POST /api/voice-intake`, a Vercel function. `AI_STUDIO_API` (a Gemini key) is read on the server only. Never prefix it with `VITE_`.

**Request**

```json
{
  "audio": "<base64>",
  "mime_type": "audio/webm",
  "now": "2026-11-19T13:40:00+08:00",
  "existing": { "victim_summary": "…", "amount": 4800 }
}
```

- `audio` is the `MediaRecorder` output. Chrome gives `audio/webm`; Safari gives `audio/mp4`.
- `now` lets the AI resolve "yesterday" or "this morning".
- `existing` is only sent for "Add more".

**Response**

```json
{
  "transcript": "Yesterday around 3.40 I got a WhatsApp from…",
  "fields": {
    "victim_summary": "I received a WhatsApp message from someone claiming to be a courier…",
    "amount": 4800,
    "occurred_at": "2026-11-18T15:40:00+08:00",
    "contact_method": "whatsapp",
    "scammer_phone": "011-0000 1234",
    "scammer_account": "5140 0000 1234",
    "transaction_ref": null
  },
  "institutions": ["maybank", "shopee"],
  "unsure": ["scammer_account"]
}
```

- `fields` uses **the same keys as the form state in `src/IntakeForm.jsx`**, so the response can go straight into `setForm`.
- `contact_method` uses the values in `IntakeForm.jsx`'s `METHODS`: `call`, `whatsapp`, `sms`, `social`, `marketplace`, `other`.
- `institutions` are registry slugs from `db/seed.sql`.
- `null` means "not mentioned".

**Suggested approach:** one Gemini call that takes the audio and returns this JSON, using a response schema so the shape is fixed. Pin a specific Flash model version that the key can use (for example `gemini-2.5-flash`). Avoid `-latest` aliases during the event, because they can change underneath you.

**Not measured yet:** response time and accuracy on Malaysian English and Malay. Measure both with the real story before relying on it on stage. If one call is too slow, use two steps instead:

1. The browser's own speech recognition shows live words while the victim speaks. That looks good in a demo, but it only works in Chrome.
2. A text-only Gemini call then fills the fields.

## 5. Privacy line

Show this on the screen: "Your voice is sent to Google's Gemini to turn it into text. We don't keep the recording."

It must stay true, so **never store the audio**. Incidents are currently saved in Supabase, with RLS off. That means the older "nothing is stored" line must not be used anywhere.

## 6. Demo tips

- Stage noise is the biggest risk. Use a headset mic or hold the laptop close, and rehearse the exact story.
- Keep `?demo=1` → "Use demo recording" as the backup.
- Script beat: speak the story → the fields fill in front of the judges → point at "Please check" on the account number → "we never trust AI with the numbers that matter."

## 7. Open questions

- [ ] Who builds `/api/voice-intake`, and who builds the recording UI?
- [ ] Should voice come **before** the institution picker? The AI can detect the banks and platforms from the story, so the picker could follow as a pre-ticked confirmation. On screen that is a one-line change to `FLOW` in `src/Stepper.jsx`, plus the stage order in `App.jsx`.
