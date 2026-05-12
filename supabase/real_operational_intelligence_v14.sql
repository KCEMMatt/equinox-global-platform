-- Equinox Global Platform v14 — Real Operational Intelligence
-- Safe to run multiple times.

create extension if not exists "pgcrypto";

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),

  source_name text,
  source_url text,

  status text default 'queued',
  records_imported integer default 0,
  duplicates_detected integer default 0,

  started_at timestamptz,
  completed_at timestamptz,

  error_message text
);

alter table public.imported_listings
add column if not exists import_job_id uuid references public.import_jobs(id) on delete set null;

alter table public.imported_listings
add column if not exists normalized_address text;

alter table public.imported_listings
add column if not exists duplicate_of_property_id uuid references public.properties(id) on delete set null;

alter table public.imported_listings
add column if not exists operational_status text default 'review_required';

create table if not exists public.property_price_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),

  property_id uuid references public.properties(id) on delete cascade,

  previous_price numeric,
  new_price numeric,

  detected_at timestamptz default now()
);

create table if not exists public.dd_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  property_id uuid references public.properties(id) on delete cascade,

  title text,
  description text,
  status text default 'open',

  assigned_to text,
  due_date date
);

alter table public.properties
add column if not exists deal_conviction text;

alter table public.properties
add column if not exists operational_priority numeric default 0;

alter table public.properties
add column if not exists dd_status text default 'not_started';

alter table public.properties
add column if not exists last_imported_at timestamptz;

alter table public.properties
add column if not exists duplicate_group_key text;

create or replace view public.operational_command_summary as
select
  (select count(*) from public.properties) as total_properties,
  (select count(*) from public.imported_listings where coalesce(operational_status, import_status) = 'review_required') as review_required,
  (select count(*) from public.import_jobs where status = 'failed') as failed_imports,
  (select count(*) from public.imported_listings where duplicate_confidence >= 80) as likely_duplicates,
  (select count(*) from public.properties where deal_conviction = 'High Conviction Opportunity') as high_conviction;

alter table public.import_jobs enable row level security;
alter table public.property_price_history enable row level security;
alter table public.dd_tasks enable row level security;

drop policy if exists "Allow authenticated read" on public.import_jobs;
drop policy if exists "Allow authenticated insert" on public.import_jobs;
drop policy if exists "Allow authenticated update" on public.import_jobs;
drop policy if exists "Allow authenticated delete" on public.import_jobs;

create policy "Allow authenticated read" on public.import_jobs for select to authenticated using (true);
create policy "Allow authenticated insert" on public.import_jobs for insert to authenticated with check (true);
create policy "Allow authenticated update" on public.import_jobs for update to authenticated using (true) with check (true);
create policy "Allow authenticated delete" on public.import_jobs for delete to authenticated using (true);

drop policy if exists "Allow anon read during build" on public.import_jobs;
drop policy if exists "Allow anon insert during build" on public.import_jobs;
create policy "Allow anon read during build" on public.import_jobs for select to anon using (true);
create policy "Allow anon insert during build" on public.import_jobs for insert to anon with check (true);

drop policy if exists "Allow authenticated read" on public.property_price_history;
drop policy if exists "Allow authenticated insert" on public.property_price_history;
drop policy if exists "Allow authenticated update" on public.property_price_history;
drop policy if exists "Allow authenticated delete" on public.property_price_history;

create policy "Allow authenticated read" on public.property_price_history for select to authenticated using (true);
create policy "Allow authenticated insert" on public.property_price_history for insert to authenticated with check (true);
create policy "Allow authenticated update" on public.property_price_history for update to authenticated using (true) with check (true);
create policy "Allow authenticated delete" on public.property_price_history for delete to authenticated using (true);

drop policy if exists "Allow authenticated read" on public.dd_tasks;
drop policy if exists "Allow authenticated insert" on public.dd_tasks;
drop policy if exists "Allow authenticated update" on public.dd_tasks;
drop policy if exists "Allow authenticated delete" on public.dd_tasks;

create policy "Allow authenticated read" on public.dd_tasks for select to authenticated using (true);
create policy "Allow authenticated insert" on public.dd_tasks for insert to authenticated with check (true);
create policy "Allow authenticated update" on public.dd_tasks for update to authenticated using (true) with check (true);
create policy "Allow authenticated delete" on public.dd_tasks for delete to authenticated using (true);

drop policy if exists "Allow anon read during build" on public.dd_tasks;
drop policy if exists "Allow anon insert during build" on public.dd_tasks;
create policy "Allow anon read during build" on public.dd_tasks for select to anon using (true);
create policy "Allow anon insert during build" on public.dd_tasks for insert to anon with check (true);

create index if not exists idx_import_jobs_status on public.import_jobs(status);
create index if not exists idx_imported_listings_import_job_id on public.imported_listings(import_job_id);
create index if not exists idx_dd_tasks_property_id on public.dd_tasks(property_id);
create index if not exists idx_property_price_history_property_id on public.property_price_history(property_id);
