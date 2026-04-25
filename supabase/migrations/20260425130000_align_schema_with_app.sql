-- ============================================================
-- Align Supabase schema with the app's actual data model
-- ============================================================

-- ------------------------------------------------------------
-- Transactions: add category text column, relax constraints
-- ------------------------------------------------------------
alter table transactions add column if not exists category text;

-- Drop restrictive source check constraint
alter table transactions drop constraint if exists transactions_source_check;

-- ------------------------------------------------------------
-- Investments table (used by the app but never created)
-- ------------------------------------------------------------
create table if not exists investments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform text,
  category text default 'ETF',
  invested_amount numeric(12, 2) default 0,
  operations jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table investments enable row level security;
create policy "open access" on investments for all using (true) with check (true);

-- ------------------------------------------------------------
-- Budgets: add category text column, relax constraints
-- ------------------------------------------------------------
alter table budgets add column if not exists category text;
alter table budgets drop constraint if exists budgets_category_id_month_year_key;
alter table budgets alter column category_id drop not null;
alter table budgets alter column month drop not null;
alter table budgets alter column year drop not null;
