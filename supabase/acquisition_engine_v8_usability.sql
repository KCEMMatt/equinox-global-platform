-- Equinox Global Platform v8 — Acquisition Engine Usability + Level 3 Import Hardening
-- Safe to run multiple times.

create extension if not exists "pgcrypto";

alter table public.source_searches add column if not exists status text default 'Active';
alter table public.source_searches add column if not exists import_mode text default 'single_listing';
alter table public.source_searches add column if not exists new_matches integer default 0;
alter table public.source_searches add column if not exists last_error text;
alter table public.source_searches add column if not exists last_import_count integer default 0;

alter table public.imported_listings add column if not exists duplicate_key text;
alter table public.imported_listings add column if not exists duplicate_of_property_id uuid references public.properties(id) on delete set null;
alter table public.imported_listings add column if not exists confidence numeric default 0;
alter table public.imported_listings add column if not exists category_guess text;
alter table public.imported_listings add column if not exists matched_reasons text[];
alter table public.imported_listings add column if not exists warning_reasons text[];

alter table public.properties add column if not exists imported_duplicate_key text;
alter table public.properties add column if not exists source_url text;
alter table public.properties add column if not exists acquisition_stage text default 'New Lead';
alter table public.properties add column if not exists status text default 'New Lead';

create index if not exists idx_imported_listings_duplicate_key on public.imported_listings(duplicate_key);
create index if not exists idx_imported_listings_duplicate_of_property_id on public.imported_listings(duplicate_of_property_id);
create index if not exists idx_imported_listings_import_status on public.imported_listings(import_status);
create index if not exists idx_properties_imported_duplicate_key on public.properties(imported_duplicate_key);
create index if not exists idx_properties_source_url on public.properties(source_url);

create or replace view public.acquisition_import_health as
select
  (select count(*) from public.source_searches) as total_sources,
  (select count(*) from public.source_searches where coalesce(active, true) = true) as active_sources,
  (select count(*) from public.source_searches where last_checked_at is not null) as checked_sources,
  (select count(*) from public.imported_listings where import_status = 'failed') as failed_imports,
  (select count(*) from public.imported_listings where import_status in ('review_required', 'imported_to_properties')) as review_required,
  (select count(*) from public.imported_listings where import_status = 'duplicate' or duplicate_of_property_id is not null) as duplicates,
  (select count(*) from public.imported_listings where created_at::date = now()::date) as imported_today,
  (select max(last_checked_at) from public.source_searches) as last_checked_at;

-- Optional demo-friendly policies for new/changed workflow tables.
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'source_searches') then
    alter table public.source_searches enable row level security;
    drop policy if exists "Allow anon source update during build" on public.source_searches;
    create policy "Allow anon source update during build" on public.source_searches for update to anon using (true) with check (true);
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'imported_listings') then
    alter table public.imported_listings enable row level security;
    drop policy if exists "Allow anon imported read during build" on public.imported_listings;
    drop policy if exists "Allow anon imported insert during build" on public.imported_listings;
    drop policy if exists "Allow anon imported update during build" on public.imported_listings;
    create policy "Allow anon imported read during build" on public.imported_listings for select to anon using (true);
    create policy "Allow anon imported insert during build" on public.imported_listings for insert to anon with check (true);
    create policy "Allow anon imported update during build" on public.imported_listings for update to anon using (true) with check (true);
  end if;
end $$;
