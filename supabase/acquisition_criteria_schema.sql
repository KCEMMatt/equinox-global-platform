-- Equinox Global Platform — Acquisition Criteria Engine
-- Run this in Supabase SQL Editor when you are ready to make the Criteria Engine persistent.

create extension if not exists pgcrypto;

create table if not exists public.acquisition_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  description text,
  active boolean not null default true
);

create table if not exists public.acquisition_criteria (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  profile_id uuid not null references public.acquisition_profiles(id) on delete cascade,
  property_types text[] not null default '{}',
  states text[] not null default '{}',
  min_price numeric,
  max_price numeric,
  min_yield numeric,
  min_land_size numeric,
  min_building_size numeric,
  min_wale numeric,
  zoning text[] not null default '{}',
  require_full_occupancy boolean not null default false
);

create table if not exists public.acquisition_properties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  address text,
  suburb text,
  state text,
  postcode text,
  property_type text,
  asking_price numeric,
  yield numeric,
  land_size numeric,
  building_size numeric,
  wale numeric,
  zoning text,
  occupancy numeric,
  latitude numeric,
  longitude numeric,
  listing_source text,
  agent_name text,
  agent_phone text,
  agent_email text,
  status text not null default 'New Lead',
  notes text
);

create table if not exists public.property_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  property_id uuid not null references public.acquisition_properties(id) on delete cascade,
  profile_id uuid not null references public.acquisition_profiles(id) on delete cascade,
  score numeric not null,
  grade text,
  positives text[] not null default '{}',
  negatives text[] not null default '{}',
  unique(property_id, profile_id)
);

create index if not exists acquisition_criteria_profile_idx on public.acquisition_criteria(profile_id);
create index if not exists acquisition_properties_state_idx on public.acquisition_properties(state);
create index if not exists acquisition_properties_status_idx on public.acquisition_properties(status);
create index if not exists property_scores_profile_idx on public.property_scores(profile_id, score desc);

alter table public.acquisition_profiles enable row level security;
alter table public.acquisition_criteria enable row level security;
alter table public.acquisition_properties enable row level security;
alter table public.property_scores enable row level security;

-- Temporary open policies for early private testing.
-- Tighten these once login/company permissions are connected.
drop policy if exists "allow all acquisition profiles" on public.acquisition_profiles;
drop policy if exists "allow all acquisition criteria" on public.acquisition_criteria;
drop policy if exists "allow all acquisition properties" on public.acquisition_properties;
drop policy if exists "allow all property scores" on public.property_scores;

create policy "allow all acquisition profiles" on public.acquisition_profiles for all using (true) with check (true);
create policy "allow all acquisition criteria" on public.acquisition_criteria for all using (true) with check (true);
create policy "allow all acquisition properties" on public.acquisition_properties for all using (true) with check (true);
create policy "allow all property scores" on public.property_scores for all using (true) with check (true);
