-- Equinox Global Platform v5
-- Live Supabase Integration helper
-- Run this in Supabase SQL Editor before using live property saving.

create extension if not exists pgcrypto;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null default 'Equinox Global',
  company_type text,
  website text,
  phone text,
  email text,
  notes text
);

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  company_id uuid references companies(id) on delete set null,

  title text,
  address text,
  suburb text,
  state text,
  postcode text,
  property_type text,

  asking_price numeric default 0,
  yield numeric default 0,
  land_size numeric default 0,
  building_size numeric default 0,
  wale numeric default 0,

  zoning text,
  occupancy numeric,
  latitude numeric,
  longitude numeric,

  agent_name text,
  agent_phone text,
  agent_email text,

  listing_source text,
  source_url text,
  image_url text,

  status text default 'New Lead',
  acquisition_stage text default 'New Lead',
  match_score numeric default 0,
  deal_grade text,

  is_sold boolean default false,
  is_featured boolean default false,
  sale_date date,

  notes text,
  suburb_growth_score numeric default 0,
  infrastructure_score numeric default 0
);

alter table properties add column if not exists title text;
alter table properties add column if not exists company_id uuid references companies(id) on delete set null;
alter table properties add column if not exists property_type text;
alter table properties add column if not exists asking_price numeric default 0;
alter table properties add column if not exists yield numeric default 0;
alter table properties add column if not exists land_size numeric default 0;
alter table properties add column if not exists building_size numeric default 0;
alter table properties add column if not exists wale numeric default 0;
alter table properties add column if not exists agent_name text;
alter table properties add column if not exists agent_phone text;
alter table properties add column if not exists agent_email text;
alter table properties add column if not exists listing_source text;
alter table properties add column if not exists source_url text;
alter table properties add column if not exists image_url text;
alter table properties add column if not exists status text default 'New Lead';
alter table properties add column if not exists acquisition_stage text default 'New Lead';
alter table properties add column if not exists match_score numeric default 0;
alter table properties add column if not exists deal_grade text;
alter table properties add column if not exists is_sold boolean default false;
alter table properties add column if not exists is_featured boolean default false;
alter table properties add column if not exists sale_date date;
alter table properties add column if not exists notes text;
alter table properties add column if not exists suburb_growth_score numeric default 0;
alter table properties add column if not exists infrastructure_score numeric default 0;

alter table properties enable row level security;

drop policy if exists "Allow public property reads during platform build" on properties;
drop policy if exists "Allow public property inserts during platform build" on properties;
drop policy if exists "Allow public property updates during platform build" on properties;
drop policy if exists "Allow public property deletes during platform build" on properties;

create policy "Allow public property reads during platform build"
on properties for select
using (true);

create policy "Allow public property inserts during platform build"
on properties for insert
with check (true);

create policy "Allow public property updates during platform build"
on properties for update
using (true)
with check (true);

create policy "Allow public property deletes during platform build"
on properties for delete
using (true);

create index if not exists properties_created_at_idx on properties(created_at desc);
create index if not exists properties_state_idx on properties(state);
create index if not exists properties_stage_idx on properties(acquisition_stage);
