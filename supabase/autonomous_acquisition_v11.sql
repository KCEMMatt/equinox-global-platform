-- Equinox Global Platform v11 — Autonomous Acquisition Assistant
-- Safe to run multiple times.

create extension if not exists "pgcrypto";

create table if not exists scheduled_import_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  source_search_id uuid references source_searches(id) on delete cascade,
  frequency_minutes integer default 60,
  active boolean default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_status text,
  last_error text
);

alter table scheduled_import_jobs add column if not exists updated_at timestamptz default now();
alter table scheduled_import_jobs add column if not exists source_search_id uuid references source_searches(id) on delete cascade;
alter table scheduled_import_jobs add column if not exists frequency_minutes integer default 60;
alter table scheduled_import_jobs add column if not exists active boolean default true;
alter table scheduled_import_jobs add column if not exists last_run_at timestamptz;
alter table scheduled_import_jobs add column if not exists next_run_at timestamptz;
alter table scheduled_import_jobs add column if not exists last_status text;
alter table scheduled_import_jobs add column if not exists last_error text;

create table if not exists ai_property_analysis (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  property_id uuid references properties(id) on delete cascade unique,
  executive_summary text,
  strengths text[],
  risks text[],
  strategic_fit text,
  dd_focus text[],
  ai_confidence numeric default 0
);

alter table ai_property_analysis add column if not exists updated_at timestamptz default now();
alter table ai_property_analysis add column if not exists property_id uuid references properties(id) on delete cascade;
alter table ai_property_analysis add column if not exists executive_summary text;
alter table ai_property_analysis add column if not exists strengths text[];
alter table ai_property_analysis add column if not exists risks text[];
alter table ai_property_analysis add column if not exists strategic_fit text;
alter table ai_property_analysis add column if not exists dd_focus text[];
alter table ai_property_analysis add column if not exists ai_confidence numeric default 0;

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  title text,
  message text,
  notification_type text,
  property_id uuid references properties(id) on delete cascade,
  read boolean default false
);

alter table notifications add column if not exists title text;
alter table notifications add column if not exists message text;
alter table notifications add column if not exists notification_type text;
alter table notifications add column if not exists property_id uuid references properties(id) on delete cascade;
alter table notifications add column if not exists read boolean default false;

create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  run_type text,
  status text,
  started_at timestamptz,
  finished_at timestamptz,
  sources_checked integer default 0,
  imported_count integer default 0,
  failed_count integer default 0,
  details jsonb
);

alter table automation_runs add column if not exists run_type text;
alter table automation_runs add column if not exists status text;
alter table automation_runs add column if not exists started_at timestamptz;
alter table automation_runs add column if not exists finished_at timestamptz;
alter table automation_runs add column if not exists sources_checked integer default 0;
alter table automation_runs add column if not exists imported_count integer default 0;
alter table automation_runs add column if not exists failed_count integer default 0;
alter table automation_runs add column if not exists details jsonb;

alter table properties add column if not exists priority_score numeric default 0;
alter table properties add column if not exists priority_status text default 'Monitor';
alter table properties add column if not exists analyst_confidence numeric default 0;

create or replace view priority_queue_view as
select
  p.*,
  coalesce(p.priority_score, p.match_score, 0) as queue_score,
  case
    when coalesce(p.priority_score, p.match_score, 0) >= 88 then 'Immediate Review'
    when coalesce(p.priority_score, p.match_score, 0) >= 72 then 'Review Today'
    else 'Monitor'
  end as urgency
from properties p
where coalesce(p.acquisition_stage, p.status, 'New Lead') not in ('Passed', 'Ignored')
order by coalesce(p.priority_score, p.match_score, 0) desc;

-- RLS policies for current no-login build. Tighten later when auth/team permissions are finalised.
alter table scheduled_import_jobs enable row level security;
alter table ai_property_analysis enable row level security;
alter table notifications enable row level security;
alter table automation_runs enable row level security;

do $$
declare t text;
begin
  foreach t in array array['scheduled_import_jobs','ai_property_analysis','notifications','automation_runs'] loop
    execute format('drop policy if exists "Allow authenticated read" on %I', t);
    execute format('drop policy if exists "Allow authenticated insert" on %I', t);
    execute format('drop policy if exists "Allow authenticated update" on %I', t);
    execute format('drop policy if exists "Allow authenticated delete" on %I', t);
    execute format('create policy "Allow authenticated read" on %I for select to authenticated using (true)', t);
    execute format('create policy "Allow authenticated insert" on %I for insert to authenticated with check (true)', t);
    execute format('create policy "Allow authenticated update" on %I for update to authenticated using (true) with check (true)', t);
    execute format('create policy "Allow authenticated delete" on %I for delete to authenticated using (true)', t);

    execute format('drop policy if exists "Allow anon read during build" on %I', t);
    execute format('drop policy if exists "Allow anon insert during build" on %I', t);
    execute format('drop policy if exists "Allow anon update during build" on %I', t);
    execute format('create policy "Allow anon read during build" on %I for select to anon using (true)', t);
    execute format('create policy "Allow anon insert during build" on %I for insert to anon with check (true)', t);
    execute format('create policy "Allow anon update during build" on %I for update to anon using (true) with check (true)', t);
  end loop;
end $$;

create index if not exists idx_scheduled_import_jobs_next_run on scheduled_import_jobs(next_run_at);
create index if not exists idx_ai_property_analysis_property_id on ai_property_analysis(property_id);
create index if not exists idx_notifications_read on notifications(read);
create index if not exists idx_notifications_property_id on notifications(property_id);
create index if not exists idx_automation_runs_created_at on automation_runs(created_at);

-- Seed scheduler rows for existing source searches that do not already have jobs.
insert into scheduled_import_jobs (source_search_id, frequency_minutes, active, next_run_at, last_status)
select id, 60, true, now(), 'ready'
from source_searches s
where not exists (
  select 1 from scheduled_import_jobs j where j.source_search_id = s.id
)
on conflict do nothing;
