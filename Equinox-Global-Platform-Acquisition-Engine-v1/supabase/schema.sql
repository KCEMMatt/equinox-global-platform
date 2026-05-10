-- Equinox Capital V2 safe schema patch
-- Run this once in Supabase SQL Editor. It does NOT delete existing data.

alter table public.properties add column if not exists status text default 'Currently Owned';
alter table public.properties add column if not exists buying_settlement_date date;
alter table public.properties add column if not exists selling_settlement_date date;

update public.properties
set status = case
  when is_sold = true then 'Sold'
  else coalesce(status, 'Currently Owned')
end
where status is null or status = '';

update public.properties
set selling_settlement_date = coalesce(selling_settlement_date, sale_date)
where sale_date is not null;

create table if not exists public.lenders (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  company_name text not null,
  contact_name text,
  contact_number text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.lenders enable row level security;

drop policy if exists "members select lenders" on public.lenders;
drop policy if exists "members insert lenders" on public.lenders;
drop policy if exists "members update lenders" on public.lenders;
drop policy if exists "members delete lenders" on public.lenders;

create policy "members select lenders" on public.lenders for select using (public.is_company_member(company_id));
create policy "members insert lenders" on public.lenders for insert with check (public.is_company_member(company_id));
create policy "members update lenders" on public.lenders for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "members delete lenders" on public.lenders for delete using (public.is_company_member(company_id));

alter table public.loans add column if not exists lender_id uuid references public.lenders(id) on delete set null;

create index if not exists lenders_company_idx on public.lenders(company_id);
create index if not exists properties_status_idx on public.properties(company_id, status);
