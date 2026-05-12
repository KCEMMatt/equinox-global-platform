
-- v10 Acquisition Intelligence Upgrade

alter table properties
add column if not exists acquisition_confidence numeric default 0;

alter table properties
add column if not exists ai_summary text;

alter table properties
add column if not exists ai_investment_notes text;

alter table properties
add column if not exists why_this_matters text;

alter table properties
add column if not exists opportunity_flags text[];

alter table imported_listings
add column if not exists duplicate_confidence numeric default 0;

alter table imported_listings
add column if not exists relisted boolean default false;
