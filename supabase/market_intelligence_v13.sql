
-- v13 Market Intelligence Layer

create table if not exists market_intelligence (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),

  suburb text,
  state text,

  vacancy_rate numeric default 0,
  rental_growth numeric default 0,
  supply_constraint_score numeric default 0,
  logistics_score numeric default 0,

  commentary text
);

alter table properties
add column if not exists market_score numeric default 0;

alter table properties
add column if not exists heatmap_score numeric default 0;

alter table properties
add column if not exists logistics_corridor text;

alter table properties
add column if not exists ai_market_commentary text;
