-- Equinox Global Platform v6
-- Acquisition Engine source searches + automated matching foundation

create table if not exists source_searches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  company_id uuid references companies(id) on delete set null,
  category_id text not null,
  name text not null,
  source text,
  url text not null,
  status text default 'Active',
  last_checked timestamptz,
  new_matches numeric default 0,
  notes text
);

create table if not exists import_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  source_search_id uuid references source_searches(id) on delete cascade,
  status text default 'Queued',
  imported_count numeric default 0,
  matched_count numeric default 0,
  error_message text
);

create table if not exists imported_listings_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  source_search_id uuid references source_searches(id) on delete set null,
  category_id text,
  title text,
  address text,
  state text,
  asking_price numeric default 0,
  yield numeric default 0,
  land_size numeric default 0,
  building_size numeric default 0,
  wale numeric default 0,
  listing_url text,
  source text,
  raw_payload jsonb,
  match_score numeric default 0,
  match_grade text,
  review_status text default 'Needs Review'
);

alter table properties add column if not exists source_search_id uuid references source_searches(id) on delete set null;
alter table properties add column if not exists listing_url text;
alter table properties add column if not exists imported_at timestamptz;
alter table properties add column if not exists criteria_category text;
alter table properties add column if not exists match_reasons text[];
alter table properties add column if not exists match_warnings text[];

alter table source_searches enable row level security;
alter table import_runs enable row level security;
alter table imported_listings_queue enable row level security;

create policy if not exists "Allow source search reads" on source_searches for select using (true);
create policy if not exists "Allow source search inserts" on source_searches for insert with check (true);
create policy if not exists "Allow source search updates" on source_searches for update using (true) with check (true);
create policy if not exists "Allow import run reads" on import_runs for select using (true);
create policy if not exists "Allow import run inserts" on import_runs for insert with check (true);
create policy if not exists "Allow queue reads" on imported_listings_queue for select using (true);
create policy if not exists "Allow queue inserts" on imported_listings_queue for insert with check (true);
create policy if not exists "Allow queue updates" on imported_listings_queue for update using (true) with check (true);

insert into source_searches (category_id, name, source, url, status, notes)
values
('core-industrial', 'Core Industrial — QLD $2M–$15M', 'RealCommercial / CommercialRealEstate', 'Paste saved search URL here', 'Ready for saved URL', 'Starter source for stabilised industrial deals'),
('value-add', 'Value-Add Industrial — National', 'Commercial portals + agent alerts', 'Paste saved search URL here', 'Ready for saved URL', 'Starter source for value-add deals'),
('hardstand-sites', 'Hardstand / Yard Assets — East Coast', 'Keyword searches', 'Paste saved search URL here', 'Ready for saved URL', 'Starter source for hardstand and yard deals'),
('development-land', 'Industrial Development Land — Growth Corridors', 'Saved portal searches', 'Paste saved search URL here', 'Ready for saved URL', 'Starter source for development land')
on conflict do nothing;
