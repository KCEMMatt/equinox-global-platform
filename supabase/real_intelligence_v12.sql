
-- v12 Real Intelligence Layer

create table if not exists acquisition_memory (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  property_id uuid,
  event_type text,
  previous_value text,
  new_value text,
  notes text
);

create table if not exists import_retry_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  source_name text,
  source_url text,
  retry_count integer default 0,
  last_error text,
  next_retry_at timestamptz
);

alter table properties
add column if not exists logistics_score numeric default 0;

alter table properties
add column if not exists market_intelligence jsonb;

alter table properties
add column if not exists last_seen_price numeric;

alter table properties
add column if not exists relist_count integer default 0;
