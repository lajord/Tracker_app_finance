-- ============================================================
-- Tracker Finance App — Initial schema
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Categories
-- ------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('income', 'expense')),
  color text default '#6366f1',
  icon text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Accounts
-- ------------------------------------------------------------
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('perso', 'pro', 'stripe', 'bank', 'cash')),
  currency text default 'EUR',
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Transactions
-- ------------------------------------------------------------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  amount numeric(12, 2) not null,
  currency text default 'EUR',
  date date not null,
  label text not null,
  notes text,
  source text default 'manual' check (source in ('manual', 'csv', 'stripe', 'revolut', 'credit_agricole')),
  external_id text,
  created_at timestamptz default now()
);

create index if not exists idx_transactions_date on transactions(date desc);
create index if not exists idx_transactions_category on transactions(category_id);
create index if not exists idx_transactions_account on transactions(account_id);

-- ------------------------------------------------------------
-- Budgets (monthly cap per category)
-- ------------------------------------------------------------
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  month int not null check (month between 1 and 12),
  year int not null,
  amount_limit numeric(12, 2) not null,
  created_at timestamptz default now(),
  unique (category_id, month, year)
);

-- ------------------------------------------------------------
-- Row Level Security — open policies (single user app, no auth)
-- ------------------------------------------------------------
alter table categories enable row level security;
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;

create policy "open access" on categories for all using (true) with check (true);
create policy "open access" on accounts for all using (true) with check (true);
create policy "open access" on transactions for all using (true) with check (true);
create policy "open access" on budgets for all using (true) with check (true);

-- ------------------------------------------------------------
-- Seed data (default categories + default accounts)
-- ------------------------------------------------------------
insert into categories (name, kind, color, icon) values
  ('Salaire', 'income', '#10b981', '💰'),
  ('Freelance', 'income', '#059669', '💼'),
  ('Stripe', 'income', '#6366f1', '💳'),
  ('Autres revenus', 'income', '#14b8a6', '📈'),
  ('Alimentation', 'expense', '#f59e0b', '🛒'),
  ('Restaurants', 'expense', '#ef4444', '🍽️'),
  ('Transport', 'expense', '#8b5cf6', '🚗'),
  ('Logement', 'expense', '#3b82f6', '🏠'),
  ('Loisirs', 'expense', '#ec4899', '🎮'),
  ('Santé', 'expense', '#06b6d4', '⚕️'),
  ('Abonnements', 'expense', '#a855f7', '📱'),
  ('Shopping', 'expense', '#f43f5e', '🛍️')
on conflict do nothing;

insert into accounts (name, type, currency) values
  ('Compte perso', 'perso', 'EUR'),
  ('Compte pro', 'pro', 'EUR')
on conflict do nothing;
