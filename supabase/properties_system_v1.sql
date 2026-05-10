-- Equinox Global Platform - Properties System v1
-- Run this after the base companies/properties setup if you have not already added these columns.

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  company_id uuid references companies(id) on delete set null,
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
  occupancy numeric default 0,
  latitude numeric,
  longitude numeric,
  listing_source text,
  source_url text,
  image_url text,
  agent_name text,
  agent_phone text,
  agent_email text,
  notes text,
  status text default 'New Lead',
  acquisition_stage text default 'New Lead',
  match_score numeric default 0,
  deal_grade text,
  is_sold boolean default false,
  sale_date date,
  is_featured boolean default false,
  suburb_growth_score numeric default 0,
  infrastructure_score numeric default 0
);

alter table properties add column if not exists address text;
alter table properties add column if not exists suburb text;
alter table properties add column if not exists state text;
alter table properties add column if not exists postcode text;
alter table properties add column if not exists property_type text;
alter table properties add column if not exists asking_price numeric default 0;
alter table properties add column if not exists yield numeric default 0;
alter table properties add column if not exists land_size numeric default 0;
alter table properties add column if not exists building_size numeric default 0;
alter table properties add column if not exists wale numeric default 0;
alter table properties add column if not exists zoning text;
alter table properties add column if not exists occupancy numeric default 0;
alter table properties add column if not exists latitude numeric;
alter table properties add column if not exists longitude numeric;
alter table properties add column if not exists listing_source text;
alter table properties add column if not exists source_url text;
alter table properties add column if not exists image_url text;
alter table properties add column if not exists agent_name text;
alter table properties add column if not exists agent_phone text;
alter table properties add column if not exists agent_email text;
alter table properties add column if not exists notes text;
alter table properties add column if not exists status text default 'New Lead';
alter table properties add column if not exists acquisition_stage text default 'New Lead';
alter table properties add column if not exists match_score numeric default 0;
alter table properties add column if not exists deal_grade text;
alter table properties add column if not exists is_sold boolean default false;
alter table properties add column if not exists sale_date date;
alter table properties add column if not exists is_featured boolean default false;
alter table properties add column if not exists suburb_growth_score numeric default 0;
alter table properties add column if not exists infrastructure_score numeric default 0;
