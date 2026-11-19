# 01 — Data Schema

Source of truth: [`db/schema.sql`](../db/schema.sql) (tables) and [`db/seed.sql`](../db/seed.sql) (registry data). Applied by pasting into the Supabase SQL editor against project **scamsos** (`cxmzutazrqrykpnjgqnd`).

## Tables at a glance

```
institutions
    │ 1
    │
    │ n
incident_institutions ── n ── incidents ── 1 ── n ── action_steps
                                   │
                                   └── 1 ── n ── reports
```

`incidents` is the centre: one row per victim incident. Institutions are linked many-to-many through `incident_institutions`. Steps and reports hang off the incident.

## `institutions`

Fallback registry of banks, e-wallets and platforms. Safe, public data only.

| Column | Type | Constraints / notes |
| --- | --- | --- |
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `slug` | `text` | `unique not null` — stable key, e.g. `maybank` |
| `name` | `text` | `not null` — display name, e.g. `Maybank` |
| `type` | `text` | `not null`, one of `bank` `ewallet` `platform` |
| `hotline` | `text` | Display format is fine (`03-5891 4744`); UI converts to `tel:` |
| `report_url` | `text` | Official fraud / card-block page |
| `support_email` | `text` | Optional; drives the `mailto:` step |
| `source` | `text` | `not null default 'fallback'`, one of `fallback` `live` |
| `created_at` | `timestamptz` | `not null default now()` |

Seeded rows (7): Maybank, CIMB, Public Bank, RHB, Hong Leong (banks); Touch 'n Go eWallet (e-wallet); Shopee (platform). Only RHB has a `support_email` in the seed.

## `incidents`

One victim incident.

| Column | Type | Constraints / notes |
| --- | --- | --- |
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `user_id` | `uuid` | FK → `auth.users.id` `on delete cascade`; set from the signed-in session |
| `created_at` | `timestamptz` | `not null default now()` |
| `status` | `text` | `not null default 'intake'`; `intake` `action` `reported` `closed`. The app inserts `action` |
| `victim_summary` | `text` | Free-text story from the intake form |
| `amount` | `numeric(12,2)` | Loss amount in MYR |
| `occurred_at` | `timestamptz` | When the scam happened |
| `contact_method` | `text` | `call` `whatsapp` `sms` `social` `marketplace` `other` (not enforced by a check) |
| `scammer_phone` | `text` | |
| `scammer_account` | `text` | |
| `transaction_ref` | `text` | |
| `urls` | `text[]` | `not null default '{}'`; not written by the current UI |
| `llm_summary` | `jsonb` | Holds `plan.summary` today (`amount`, `when`, `institutions`, `step_count`) |
| `call_script` | `text` | Rendered in the ActionPlan "what to say" panel |

## `incident_institutions`

Which institutions the money passed through. Many-to-many join.

| Column | Type | Constraints / notes |
| --- | --- | --- |
| `incident_id` | `uuid` | FK → `incidents.id` `on delete cascade` |
| `institution_id` | `uuid` | FK → `institutions.id` `on delete cascade` |
| — | — | PK is `(incident_id, institution_id)` |

## `action_steps`

Ordered checklist per incident, one row per step.

| Column | Type | Constraints / notes |
| --- | --- | --- |
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `incident_id` | `uuid` | FK → `incidents.id` `on delete cascade` |
| `step_order` | `int` | `not null`; `unique (incident_id, step_order)` |
| `title` | `text` | `not null` — e.g. `Call NSRC 997 (National Scam Response Centre)` |
| `action` | `text` | `not null`; one of `call` `open` `map` `email` `print` |
| `value` | `text` | `tel:` URL, report URL, `mailto:` URL, or maps link |
| `urgency` | `text` | `not null default 'now'`; `now` `soon` `later` |
| `done` | `boolean` | `not null default false`; toggled from the plan screen |

## `reports`

Draft reports generated per recipient. The table exists, but **no UI writes it yet** — the current app prints the police report client-side and uses `mailto:` drafts.

| Column | Type | Constraints / notes |
| --- | --- | --- |
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `incident_id` | `uuid` | FK → `incidents.id` `on delete cascade` |
| `institution_id` | `uuid` | FK → `institutions.id` `on delete set null` |
| `recipient_type` | `text` | `not null`; `police` `bank` `platform` |
| `subject` | `text` | |
| `body` | `text` | |
| `status` | `text` | `not null default 'draft'`; `draft` `sent` `printed` |
| `created_at` | `timestamptz` | `not null default now()` |

## Indexes

- `idx_incidents_created_at` on `incidents (created_at desc)`
- `idx_steps_incident` on `action_steps (incident_id, step_order)`
- `idx_reports_incident` on `reports (incident_id)`

## Security / RLS

RLS is **intentionally off** for the demo. Tables created via SQL have RLS disabled by default, so the public anon key can read **and write** every table. Acceptable for a 2-hour demo, never for production. See [02_SERVERSIDE_API.md](02_SERVERSIDE_API.md) for the exposure this creates.

## Known gaps (fix before relying on them)

1. **PRD schema drift.** [04_PRD.md](04_PRD.md) §8 describes `institutions` with `kind`, `fraud_hotline`, `fraud_page_url`, `report_email`, `official_domains`, `verified_at`, `color`, `initial`. The live table uses `type`, `hotline`, `report_url`, `support_email` and has none of the others. The SQL is what the app uses.
2. **Privacy claim vs reality.** PRD §9 says incident data is never stored, but `App.jsx` writes `incidents` (story, amount, scammer details) to Supabase with RLS off. If the demo shows a "nothing is stored" line, this contradicts it.
3. **`reports` and `urls` are unused** by the current UI.
