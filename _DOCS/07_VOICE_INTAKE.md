# 07 — Voice intake: "Talk to ScamSOS"

On the "What happened" step the victim can **talk to ScamSOS** instead of typing. A short, call-style conversation with an AI assistant collects the story, and the AI fills every intake field: amount, time, how they were contacted, the scammer's phone and account, and the transaction reference. The victim checks the result and continues to the action plan.

Visual rules (colours, sizes, badges) follow [06_DESIGN.md](06_DESIGN.md). This doc covers the flow, the screens and states, and the contract between the screen and the AI.

> **Naming:** the button is **"Talk to ScamSOS"**, never "Call". "Call 997" and the bank "Call" buttons are real phone calls. A panicking user must never confuse talking to the app with phoning for help.

## 1. Flow

```
What happened?
  ( 🎙  Talk to ScamSOS )        ← primary
  Type instead                    ← always available
        │
        ▼
Talk screen (call-style)
  AI:  "Hi, I'm the ScamSOS assistant. Tell me what happened, in your own words.
        Tap Done when you finish."
  You: (speak)                    [Done]
  …    Reading…                   fields fill in live: ✓ Amount  ✓ Maybank  ? Account
  AI:  "Which account number did the money go to? It's on your transfer receipt."
  You: (answer, or say "skip")    [Done]
  AI:  "Thanks. Please check what I filled in, then I'll show you who to call first."
        │  (at most 2 follow-up questions; End at any time)
        ▼
Check what we heard
  each field pre-filled and marked:
    ✓ From your voice     filled
    ? Please check        filled, but the AI is unsure (numbers: always)
    + Not mentioned       empty, fill in if you know
  [Show the conversation ▾]   [🎙 Add more]
  ( Looks right — get my action plan )
```

**Why two turns and not a live conversation:** a real-time, two-way voice call (streaming audio both ways) is the hardest thing to build in the time left, and if it fails on stage the judges hear silence. Taking turns with a **Done** button looks almost the same, reuses one endpoint, and fails gracefully. A live call is a stretch goal only (§8).

## 2. Rules

1. **The AI never guesses.** If something wasn't said, the field stays empty and shows "Not mentioned" (PRD F3).
2. **The AI collects facts; it never advises.** It never promises recovery or tells the victim what the bank will do. Its spoken lines are **fixed templates** in code (§5), not free text from the model.
3. **At most 2 follow-up questions,** about the details that matter most for freezing money (§5). Panicking people can't sit through an interview.
4. **Everything stays editable.** The AI fills the form; the victim confirms with one button. **End** at any time goes straight to the check screen with whatever was filled so far.
5. **Numbers are always "Please check":** the amount, the scammer's phone and account, and the transaction reference. Speech-to-text often mishears strings of digits. A wrong account number on a police report points the police at the wrong person. Show numbers large, with digits grouped (`5140 0000 1234`).
6. **Times are made absolute and readable.** The AI turns "yesterday about 3.40" into a full timestamp, and the screen shows it as "Wed 18 Nov, 3:40 pm" so a mistake is easy to spot.
7. **Mentioned institutions are suggested, not added silently.** "You mentioned CIMB. Add it?" works as a one-tap chip.
8. **Any language.** The victim can speak English, Malay or a mix. If they answer in Malay, the assistant's next line is in Malay. Fields come back in English; the transcript stays as spoken.
9. **Captions always on.** Every line, the AI's and the victim's, is shown as text: the hall is noisy, and some users can't hear well.
10. **Typing is always available.** "Type instead" opens the normal text box, and the form works with no voice at all.

## 3. The talk screen

```
┌──────────────────────────────┐
│ ScamSOS Assistant      0:24  │
│                              │
│           ( ◉ )              │  avatar: speaking / listening / reading
│        Your turn             │  state in words, not colour alone
│                              │
│ "Which account number did    │  current AI line, large
│  the money go to?"           │
│ ─── conversation ─────────── │
│ ScamSOS: Hi, I'm the…        │  captions (aria-live)
│ You: Yesterday I got a…      │
│ ─── filled so far ────────── │
│ ✓ RM 4,800  ✓ Maybank        │  live field chips
│ ? Account   + Reference      │
│                              │
│ [ 🔇 Mute voice ]  [ End ]   │
│ ( ■ Done — I've finished )   │  primary, at least 56 px
└──────────────────────────────┘
```

| State | Avatar label | Primary button | Notes |
|---|---|---|---|
| Assistant speaking | "ScamSOS is speaking" | Disabled, or "Skip" to cut the line short | Line also shown as text |
| Your turn | "Your turn — listening 0:12" | **Done** | Tap to finish speaking (no press-and-hold). Stops on its own after 90 s |
| Reading | "Reading what you said…" | None | Show something within 400 ms; chips fill in when the reply arrives |
| Finished | "All done" | **Check what I filled in** | Goes to the check screen |
| Mic blocked or missing | — | **Type instead** | "Your microphone is off. You can type your story instead." Never a dead end |
| AI failed | — | **Continue** | "I couldn't read that one. Here's what I heard — check it and carry on." The transcript goes into the story box |
| Muted | Same as above | Same | The assistant's voice is off; captions still show every line |

**Classes to build** (design tokens only, see [06_DESIGN.md](06_DESIGN.md)):

| Class | What it is |
|---|---|
| `.talk` | The talk screen container (full height on phones, card on desktop) |
| `.talk-avatar` + `.is-speaking` / `.is-listening` / `.is-reading` | Round avatar. A gentle pulse while listening; **no pulse with reduced motion**, the label carries the state |
| `.talk-line` | The current assistant line, `--fs-lg` |
| `.talk-captions` | Conversation log, `aria-live="polite"` |
| `.talk-fields` | Live chips, reusing the field badges below |
| `.talk-controls` | Mute, End, and the primary Done button |
| `.field-ai` | "✓ From your voice", `--ok` text |
| `.field-check` | "? Please check", amber like `.hints` (`--warn-*`) |
| `.field-missing` | "+ Not mentioned", `--ink-3` text |

**Assistant voice:** use the browser's built-in text-to-speech (`speechSynthesis`) for the fixed lines in §5. It's instant, free and needs no network. Use a Malay voice for Malay lines when the device has one; otherwise show the caption only.

## 4. Contract: screen ↔ AI

**Endpoint:** `POST /api/voice-intake`, a Vercel function, called once per turn. `AI_STUDIO_API` (a Gemini key) is read on the server only. Never prefix it with `VITE_`.

**Request**

```json
{
  "audio": "<base64>",
  "mime_type": "audio/webm",
  "now": "2026-11-19T13:40:00+08:00",
  "turn": 1,
  "answering": null,
  "existing": null
}
```

- `audio` is the `MediaRecorder` output. Chrome gives `audio/webm`; Safari gives `audio/mp4`.
- `now` lets the AI resolve "yesterday" or "this morning".
- `turn` is 1 for the story and 2–3 for follow-up answers.
- `answering` is the field the last question asked about (e.g. `"scammer_account"`), or `null`.
- `existing` is the fields gathered so far (turn 2+). The server only fills fields that are empty or unsure, and never overwrites the victim's edits.

**Response**

```json
{
  "transcript": "Yesterday around 3.40 I got a WhatsApp from…",
  "lang": "en",
  "fields": {
    "victim_summary": "I received a WhatsApp message from someone claiming to be a courier…",
    "amount": 4800,
    "occurred_at": "2026-11-18T15:40:00+08:00",
    "contact_method": "whatsapp",
    "scammer_phone": "011-0000 1234",
    "scammer_account": null,
    "transaction_ref": null
  },
  "institutions": ["maybank", "shopee"],
  "unsure": ["amount"],
  "next_question": { "field": "scammer_account", "text": "Which account number did the money go to? It's on your transfer receipt." }
}
```

- `fields` uses **the same keys as the form state in `src/IntakeForm.jsx`**, so it can go straight into `setForm`.
- `contact_method` uses the values in `IntakeForm.jsx`'s `METHODS`: `call`, `whatsapp`, `sms`, `social`, `marketplace`, `other`.
- `institutions` are registry slugs from `db/seed.sql`.
- `null` means "not mentioned".
- `lang` is `"en"` or `"ms"`, the language the victim spoke. It picks the template language for the next line.
- `next_question` is `null` when there is nothing left to ask or 2 questions have already been asked. The screen then says the closing line.

**Suggested approach:** one Gemini call per turn that takes the audio and returns this JSON, using a response schema so the shape is fixed. **The server, not the model, picks `next_question`** using the rules in §5. Pin a specific Flash model version that the key can use (for example `gemini-2.5-flash`). Avoid `-latest` aliases during the event, because they can change underneath you.

**Not measured yet:** response time and accuracy on Malaysian English and Malay. Measure both with the real story before relying on it on stage.

## 5. What the assistant says (fixed templates)

The assistant only ever says these lines. The model never writes spoken text.

**Follow-up order.** Ask about the first field in this list that is still empty or unsure, at most twice. This is the order that matters for freezing money:

1. `scammer_account`
2. `amount`
3. `occurred_at`
4. `transaction_ref`

| Line | English | Bahasa Malaysia |
|---|---|---|
| Greeting | Hi, I'm the ScamSOS assistant. Tell me what happened, in your own words. Tap Done when you finish. | Hai, saya pembantu ScamSOS. Ceritakan apa yang berlaku, dengan kata-kata anda sendiri. Tekan Selesai apabila habis. |
| `scammer_account` | Which account number did the money go to? It's on your transfer receipt. | Duit dipindahkan ke nombor akaun mana? Ada pada resit pemindahan anda. |
| `amount` | How much money did you send, in ringgit? | Berapa ringgit yang anda pindahkan? |
| `occurred_at` | When did you make the transfer? Roughly is fine. | Bila anda buat pemindahan itu? Anggaran pun tak apa. |
| `transaction_ref` | Do you have the transaction reference? It's on your bank's receipt. Say "skip" if not. | Ada nombor rujukan transaksi? Ada pada resit bank. Sebut "langkau" jika tiada. |
| Closing | Thanks. Please check what I filled in, then I'll show you who to call first. | Terima kasih. Sila semak apa yang saya isi, kemudian saya tunjukkan siapa yang perlu dihubungi dahulu. |
| Didn't catch it | Sorry, I didn't catch that. You can say it again, or tap End and type it instead. | Maaf, saya tak dapat tangkap. Boleh sebut sekali lagi, atau tekan Tamat dan taip. |

The Malay lines need a quick proofread by a native speaker on the team.

If the victim says "skip" or "langkau", the field stays empty and the assistant moves on.

## 6. Privacy line

Show this on the talk screen: "Your voice is sent to Google's Gemini to turn it into text. We don't keep the recording."

It must stay true, so **never store the audio**. Incidents are currently saved in Supabase, with RLS off. That means the older "nothing is stored" line must not be used anywhere.

## 7. Demo

- **Timing:** greeting (4 s) + story (~20 s) + reading + one question + answer + closing comes to roughly 45–60 s of a 3-minute pitch. Rehearse with a stopwatch. If it's too long, use only one follow-up question on stage.
- **Noise** is the biggest risk. Use a headset mic or hold the laptop close, and rehearse the exact story.
- **Backup:** with `?demo=1`, a "Use demo conversation" button plays a scripted conversation (the same lines, captions and filling chips) with no mic and no network.
- **Script beat:** talk to ScamSOS → the fields fill in front of the judges → the assistant asks for the account number → point at "Please check" on it → "we never trust AI with the numbers that matter."

## 8. Stretch: live conversation

A real-time voice call (the AI listens and replies continuously, and can be interrupted) needs streaming audio both ways and a server relay to keep the key off the browser. Only attempt it if the two-turn version is finished and someone on the team has built streaming audio before. Keep the two-turn version as the fallback either way.

## 9. Open questions

- [ ] Who builds `/api/voice-intake`, and who builds the talk screen?
- [ ] Should talking come **before** the institution picker? The AI can detect the banks and platforms from the story, so the picker could follow as a pre-ticked confirmation. On screen that is a one-line change to `FLOW` in `src/Stepper.jsx`, plus the stage order in `App.jsx`.
- [ ] Malay lines: proofread by a native speaker.
