-- Equinox Global Platform v9 — AI Acquisition Automation
-- Safe to run multiple times.

alter table public.properties add column if not exists ai_summary text;
alter table public.properties add column if not exists risk_flags text[] default '{}';
alter table public.properties add column if not exists opportunity_insights text[] default '{}';
alter table public.properties add column if not exists last_enriched_at timestamptz;
alter table public.properties add column if not exists last_price_seen numeric;
alter table public.properties add column if not exists last_seen_at timestamptz;

alter table public.source_searches add column if not exists import_mode text default 'saved_search';
alter table public.source_searches add column if not exists schedule_enabled boolean default true;
alter table public.source_searches add column if not exists schedule_frequency_minutes integer default 1440;
alter table public.source_searches add column if not exists last_error text;
alter table public.source_searches add column if not exists new_matches integer default 0;

alter table public.imported_listings add column if not exists duplicate_key text;
alter table public.imported_listings add column if not exists duplicate_of_property_id uuid references public.properties(id) on delete set null;
alter table public.imported_listings add column if not exists confidence numeric default 0;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  property_id uuid references public.properties(id) on delete cascade,
  title text not null,
  message text,
  priority text default 'medium',
  status text default 'unread'
);

create table if not exists public.property_price_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  property_id uuid references public.properties(id) on delete cascade,
  source_url text,
  price numeric,
  price_text text,
  change_type text default 'observed'
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  run_type text not null,
  status text default 'started',
  started_at timestamptz default now(),
  finished_at timestamptz,
  sources_checked integer default 0,
  imported_count integer default 0,
  failed_count integer default 0,
  details jsonb default '{}'::jsonb
);

alter table public.notifications enable row level security;
alter table public.property_price_history enable row level security;
alter table public.automation_runs enable row level security;

do $$
declare t text;
begin
  foreach t in array array['notifications', 'property_price_history', 'automation_runs'] loop
    execute format('drop policy if exists "Allow authenticated read" on public.%I', t);
    execute format('drop policy if exists "Allow authenticated insert" on public.%I', t);
    execute format('drop policy if exists "Allow authenticated update" on public.%I', t);
    execute format('drop policy if exists "Allow anon read during build" on public.%I', t);
    execute format('drop policy if exists "Allow anon insert during build" on public.%I', t);
    execute format('create policy "Allow authenticated read" on public.%I for select to authenticated using (true)', t);
    execute format('create policy "Allow authenticated insert" on public.%I for insert to authenticated with check (true)', t);
    execute format('create policy "Allow authenticated update" on public.%I for update to authenticated using (true) with check (true)', t);
    execute format('create policy "Allow anon read during build" on public.%I for select to anon using (true)', t);
    execute format('create policy "Allow anon insert during build" on public.%I for insert to anon with check (true)', t);
  end loop;
end $$;

create index if not exists idx_notifications_status on public.notifications(status);
create index if not exists idx_notifications_property_id on public.notifications(property_id);
create index if not exists idx_property_price_history_property_id on public.property_price_history(property_id);
create index if not exists idx_automation_runs_run_type on public.automation_runs(run_type);
