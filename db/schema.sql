-- ScamSOS schema (demo). Apply with:
--   curl -X POST "$SUPABASE_API/v1/projects/<ref>/database/query" -d '{"query": "<this file>"}'
-- RLS is intentionally off for the 2-hour demo (tables created via SQL default to RLS disabled).

create table if not exists institutions (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  type          text not null check (type in ('bank', 'ewallet', 'platform')),
  hotline       text,
  report_url    text,
  support_email text,
  source        text not null default 'fallback' check (source in ('fallback', 'live')),
  created_at    timestamptz not null default now()
);

create table if not exists incidents (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users (id) on delete cascade,
  created_at        timestamptz not null default now(),
  status            text not null default 'intake' check (status in ('intake', 'action', 'reported', 'closed')),
  victim_summary    text,
  amount            numeric(12, 2),
  occurred_at       timestamptz,
  contact_method    text,          -- call | whatsapp | sms | social | marketplace
  scammer_phone     text,
  scammer_account   text,
  transaction_ref   text,
  urls              text[] not null default '{}',
  llm_summary       jsonb,         -- steps/institutions/report_fields payload from the LLM
  call_script       text
);

create table if not exists incident_institutions (
  incident_id    uuid not null references incidents (id) on delete cascade,
  institution_id uuid not null references institutions (id) on delete cascade,
  primary key (incident_id, institution_id)
);

create table if not exists action_steps (
  id          uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents (id) on delete cascade,
  step_order  int not null,
  title       text not null,
  action      text not null check (action in ('call', 'open', 'map', 'email', 'print')),
  value       text,                -- tel: URL, report URL, mailto:, etc.
  urgency     text not null default 'now' check (urgency in ('now', 'soon', 'later')),
  done        boolean not null default false,
  unique (incident_id, step_order)
);

create table if not exists reports (
  id             uuid primary key default gen_random_uuid(),
  incident_id    uuid not null references incidents (id) on delete cascade,
  institution_id uuid references institutions (id) on delete set null,
  recipient_type text not null check (recipient_type in ('police', 'bank', 'platform')),
  subject        text,
  body           text,
  status         text not null default 'draft' check (status in ('draft', 'sent', 'printed')),
  created_at     timestamptz not null default now()
);

create index if not exists idx_incidents_created_at on incidents (created_at desc);
create index if not exists idx_steps_incident on action_steps (incident_id, step_order);
create index if not exists idx_reports_incident on reports (incident_id);
