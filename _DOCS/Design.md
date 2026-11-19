# Design — ScamSOS

> **Status: PLACEHOLDER.** This file is a stub with section outlines only.
> Replace it with the real design document when the design work is written up.

## 1. Design principles

_To be written._

- Panic-first UX: one primary action per screen, no dead ends
- Trust cues: official sources, verified registry data, no bank credentials ever
- Fast on a phone, readable at arm's length

## 2. Screens

_To be written._ Screens map to the flow in [00_STRUCTURE.md](00_STRUCTURE.md):

1. Sign in (`AuthScreen`)
2. Institution picker (`InstitutionPicker`)
3. Intake (`IntakeForm`)
4. Action plan (`ActionPlan`)
5. Printable report (inside `ActionPlan`)

For each: layout, states (loading / empty / error / done), mobile behavior.

## 3. Components and states

_To be written._ Existing Tailwind component classes: `.field`, `.btn-primary`, `.link`, `.panel`, `.card` / `.card-selected`, `.action-btn`. Document their intended usage and visual states.

## 4. Visual language

_To be written._ Placeholder pointers:

- Theme tokens and values: [03_TECH_STACK.md](03_TECH_STACK.md#styling-tailwind-css)
- Print typography and layout: hand-written CSS at the bottom of `src/index.css`

## 5. Accessibility and mobile

_To be written._ Target: tap targets ≥ 44px, readable contrast on the dark theme, `tel:` actions reachable in one tap, works at 375px width.

## 6. Language

_To be written._ EN/BM copy conventions; see the i18n section of [03_TECH_STACK.md](03_TECH_STACK.md).

## 7. Open design questions

_To be written._

- Home screen: how prominent is the always-available "Call 997" action?
- Privacy wording vs Supabase storage (see [06_PROJECT_SNAPSHOT.md](06_PROJECT_SNAPSHOT.md) gap 1)
- Should the action checklist show a countdown ("golden hour")?
