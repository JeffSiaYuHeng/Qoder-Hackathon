# 06 — Design

How ScamSOS looks and behaves, and why. The code lives in `src/index.css` (tokens at the top, components below) and `src/ThemeToggle.jsx`. Short rules for agents are in the "UI rules" section of [AGENTS.md](../AGENTS.md).

## 1. Design goal

The user has just been scammed. They are panicking, probably on a phone, possibly older, possibly in sunlight. Every design choice serves one thing: **make the next action obvious and easy to hit.**

- Calm, not alarming: no red everywhere. One warm accent marks what to tap.
- The most urgent action (calling) is the strongest thing on the screen.
- Big text and big targets. Nothing important is shown by colour alone.

## 2. Principles

| # | Rule | Where it shows |
|---|---|---|
| 1 | **One accent colour, for tappable actions only** (60% base, 30% surface, 10% accent) | Primary buttons, call buttons, selected cards, the current step |
| 2 | **Status never relies on colour alone** | Done step = tick + strike-through + green tint. Warning = amber box with "!" markers. Selected = tick badge + border |
| 3 | **Only sizes from the type scale.** Body text is 16 px minimum | Also stops iOS Safari zooming in when a field is tapped |
| 4 | **Spacing from the 8-point scale.** Every tap target is at least 44 px tall | Buttons, links, inputs, checkboxes (via their label), theme toggle |
| 5 | **Motion is short and optional**: 180 ms ease-out, off when the user asks for reduced motion | Hover, selection, step state changes |
| 6 | **Tokens, not hardcoded values.** Components only use `var(--…)` | Changing the accent or a theme is a one-place edit |

## 3. Colour

Tokens are defined on `:root` in `src/index.css`. The dark theme reuses the same names with dark values.

| Token | Role | Light | Dark |
|---|---|---|---|
| `--bg` | Page background (60%) | `#f6f5f1` | `#0b0f14` |
| `--surface` | Cards, panels, inputs (30%) | `#ffffff` | `#141b24` |
| `--surface-2` | Subtle fills (call script) | `#eef0f4` | `#1d2732` |
| `--line` | Borders | `#dadde3` | `#2a3440` |
| `--ink` | Main text (soft navy, never pure black) | `#15213b` | `#e8edf2` |
| `--ink-2` | Secondary text | `#4a5468` | `#a9b6c4` |
| `--ink-3` | Labels, hints | `#5f6878` | `#93a1b0` |
| `--accent` | Tappable actions (10%) | `#c2410c` | `#ff8a4c` |
| `--accent-hover` | Hover, "Do now" label | `#9a3412` | `#ffa36f` |
| `--accent-ink` | Text on accent | `#ffffff` | `#1a0d05` |
| `--accent-soft` | Selected card fill, current-step halo | `#fff1e8` | `#2a1a10` |
| `--ok` / `--ok-soft` | Done step | `#166534` / `#e8f5ec` | `#4ade80` / `#12261a` |
| `--warn-ink` / `--warn-soft` / `--warn-line` | Missing-info box | `#7c2d12` / `#fef3c7` / `#f59e0b` | `#fcd34d` / `#2a2210` / `#d97706` |
| `--danger` | Error text | `#b91c1c` | `#ff8a8e` |

**Contrast:** every text/background pair above passes WCAG AA (4.5:1). Text on the accent button is 5.2:1 in light and 8.2:1 in dark. If you add a colour, check its contrast against the background it sits on before using it.

The printed police report always uses fixed black-on-white colours, whatever the theme.

## 4. Typography

| Use | Font | Weights |
|---|---|---|
| Headings, logo | Plus Jakarta Sans | 700, 800 |
| Everything else | Inter | 400–700 |

Both load from Google Fonts in `index.html` with `display=swap`. If the venue network blocks them, the system font takes over and nothing breaks.

**Scale (Major Third, ×1.25):**

| Token | Size | Used for |
|---|---|---|
| `--fs-sm` | 13 px | Labels, section headings (uppercase), status lines |
| `--fs-md` | 16 px | Body, inputs, buttons, step titles |
| `--fs-lg` | 20 px | Logo, incident summary line |
| `--fs-xl` | 25 px | Page title on phones (≤ 560 px) |
| `--fs-2xl` | 31 px | Page title on wider screens |

Amounts, phone numbers, dates and the report table use tabular figures (`font-variant-numeric: tabular-nums`) so digits line up and don't jump.

## 5. Space, shape, motion

| Token | Values |
|---|---|
| Spacing `--s-1` … `--s-7` | 4, 8, 12, 16, 24, 32, 48 px |
| Radius `--r-sm` / `--r-md` / `--r-lg` / `--r-pill` | 8 / 12 / 16 px / 999 px |
| Tap target `--tap` | 44 px minimum (primary buttons are 52 px) |
| Shadow `--shadow` | `0 8px 16px` navy at 6% (none in dark) |
| Focus `--focus` | 3 px accent ring on `:focus-visible` |
| Motion `--dur` / `--ease` | 180 ms, `cubic-bezier(0.2, 0.8, 0.2, 1)` |

## 6. Components

All class names come from the existing JSX, so restyling never needs a component change.

| Class | What it is | Behaviour |
|---|---|---|
| `.logo` | Wordmark | Navy text with an accent dot |
| `.theme-toggle` | ☾ / ☀ button | 44 px circle. See §8 |
| `.card` / `.card.selected` | Institution tile | Selected = accent border, soft fill and a ✓ badge |
| `.primary` | Main button of a screen | Solid accent, 52 px. Disabled = grey, not faded accent |
| `.link` | Secondary action | Underlined text, still 44 px tall |
| `.action-btn` | Step action (open page, map, email) | Outlined |
| `.action-btn[href^="tel:"]` | Call button | **Solid accent with a phone glyph**: the most important action on the plan screen. Turns quiet once its step is done |
| `.step` | Checklist row | The **first unticked step is highlighted automatically** (accent outline + halo). Done = green tint, tick, strike-through. Never faded, so it stays readable |
| `.hints` | Missing information | Amber box, "!" marker per line |
| `.panel` | Grouped section | White card on the page background |
| `.report` | Police report preview | Looks like a sheet of paper on screen; the only thing that prints |
| `.status.error` | Error line | Danger colour with a "!" prefix |
| `.badge` | Signed-in email | Hidden on phones (≤ 560 px) to keep the header on one line |
| `.topbar` | App bar | Sticky, translucent with blur, like a native app header |
| `.step + .step::before` | Timeline connector | Thin line between checklist rows; turns green after a done step (parcel-tracking style) |

## 7. Responsive layout

One codebase adapts to the device; the CSS is mobile-first in spirit, with three bands:

| Width | Layout |
|---|---|
| Phone (≤ 560 px) | App-style. Sticky app bar on top; the screen's main button sits in a **sticky bottom action bar** under the thumb (picker "Continue", intake "Get my action plan"). Single column, full-width step buttons |
| Tablet (561–1023 px) | Wider single column, more institution tiles per row, sign-in form shown as a card |
| Desktop (≥ 1024 px) | Content up to 1080 px. **Action plan in two columns**: checklist on the left; incident summary, call script, email and print on the right. Intake form capped at a readable 720 px |

- Screens ease in (220 ms) when the flow moves on; off with reduced motion.
- `scroll-padding` keeps a focused field clear of the sticky bars.
- Checked at 393×852, 768×1024 and 1280×800 in both themes: no horizontal scroll, the last tile is never covered by the bottom bar, print still shows only the report.

## 8. Light and dark theme

- **Default:** follows the device setting (`prefers-color-scheme`).
- **Toggle:** `ThemeToggle` sits in the top bar and on the sign-in screen. It sets `data-theme="light|dark"` on `<html>` and remembers the choice in `localStorage` on that device.
- **No flash:** an inline script in `index.html` applies the saved choice before the first paint.
- **CSS:** dark values are declared twice: under `@media (prefers-color-scheme: dark)` for `:root:not([data-theme='light'])`, and under `:root[data-theme='dark']`. Edit both blocks together.
- **Print:** always light.

## 9. Copy rules

- Plain words, short sentences. Say what to do, not how the system works.
- Never show raw technical errors to the victim. Say what happened and what to do next.
- Only state facts we can source. The official guidance is to **call NSRC 997 within 24 hours** of discovering the scam ([malaysia.gov.my](https://www.malaysia.gov.my/en/topics/nsrc-997-hotline)). The Home Minister has said the first one to two hours are crucial. There is no official "first hour" or "60-minute golden hour" figure, so we don't claim one.
- Bank Negara's advice is to call "their banks or 997" immediately, so either order is correct. Both lines run 24 hours.

## 10. How it was checked

- Contrast computed for every token pair in both themes (all ≥ 4.5:1).
- Golden path (sign in → pick → intake → plan) clicked through in Chrome at 390 px (phone) and 1280 px (laptop), in light and dark. No console errors.
- Tap-target audit on all four screens: nothing under 44 px.
- Print emulation: only the police report prints.
- Theme toggle: device dark → toggle to light → survives reload → toggles back.

Supabase was mocked at the network layer for these runs, so they cover the UI, not the data.

## 11. Demo on stage (phone simulated in a browser)

- Chrome DevTools → device toolbar → **iPhone 14 Pro** (393 px). The layout was tested at 390 px, so this matches.
- Undock DevTools into its own window so only the phone frame is projected.
- Tap the ☾ / ☀ button once to show both themes.
- **Careful with Call and Email on a laptop.** A `tel:` link asks to open an outside app (likely FaceTime on a Mac) and a `mailto:` link opens Mail.app. Until the `?demo=1` mode from [04_PRD.md](04_PRD.md) §9 exists, tick the step's checkbox instead of tapping those buttons.
- "Print police-ready report" is safe and looks good: it opens Chrome's print preview.

## 12. UX backlog (needs component changes, not CSS)

| # | Issue | Why it matters | Suggested fix |
|---|---|---|---|
| 1 | The sign-in screen sits in front of a panic flow | Breaks PRD F1 ("call 997 with a single tap, without entering any data"); costs the victim time | Show the 997 and bank call actions before sign-in, or drop sign-in for the victim flow |
| 2 | Plan screen says "the first hour is when money is still recoverable" | Not supported by an official source (see §9) | "Call now. Reporting within 24 hours gives the best chance to freeze the money." |
| 3 | `tel:` / `mailto:` leave the browser in the stage demo | System dialogs on stage | `?demo=1`: show "Calling 997…" / "Email draft ready" in the app instead |
| 4 | Raw Supabase error messages are shown to users | Jargon at the worst moment | Map errors to plain sentences; keep the raw message in the console |
| 5 | Report shows `whatsapp` (raw value) and `RM 4800.00` | Looks unfinished on the printed report | Use the same labels as the intake form and `en-MY` number formatting |

## 13. Sources

- Team design rules: the saved UI/UX notes report ("uiux-tips") — 60/30/10 colour, Major Third type scale, 8-point spacing, 44–48 px targets, nested radius, tinted shadows, tabular figures, status not by colour alone, 150–250 ms ease-out motion, reduced motion.
- Contrast thresholds: WCAG 2.x AA (4.5:1 for body text).
- Copy facts: malaysia.gov.my NSRC 997 page, Bank Negara Malaysia NSRC launch speech, Malay Mail (3 Mar 2026).
