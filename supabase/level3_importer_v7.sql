-- Equinox Global Platform v7 — Level 3 Importer Support
-- Safe to run after the master schema.

alter table public.properties add column if not exists title text;
alter table public.properties add column if not exists source_url text;
alter table public.properties add column if not exists image_url text;

alter table public.source_searches add column if not exists status text default 'Active';
alter table public.source_searches add column if not exists new_matches integer default 0;
alter table public.source_searches add column if not exists import_mode text default 'saved_search';
alter table public.source_searches add column if not exists source text;
alter table public.source_searches add column if not exists url text;

-- Keep older v6/v7 frontend naming compatible with master schema naming.
update public.source_searches
set source_name = coalesce(source_name, source),
    source_url = coalesce(source_url, url)
where source_name is null or source_url is null;

alter table public.imported_listings add column if not exists import_status text default 'review_required';
alter table public.imported_listings add column if not exists review_notes text;
alter table public.imported_listings add column if not exists raw_data jsonb;

create index if not exists idx_source_searches_status on public.source_searches(status);
create index if not exists idx_source_searches_import_mode on public.source_searches(import_mode);
create index if not exists idx_imported_listings_import_status on public.imported_listings(import_status);

-- Optional view for import/review queue.
create or replace view public.import_review_queue as
select
  il.id,
  il.created_at,
  il.source_name,
  il.source_url,
  il.raw_title,
  il.raw_address,
  il.raw_price,
  il.import_status,
  il.review_notes,
  p.id as property_id,
  p.match_score,
  p.deal_grade,
  p.acquisition_stage
from public.imported_listings il
left join public.properties p on p.id = il.property_id
order by il.created_at desc;
