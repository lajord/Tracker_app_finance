-- ============================================================
-- Subscriptions — recurring monthly expenses
-- ============================================================

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(12, 2) not null,
  billing_day int not null check (billing_day between 1 and 31),
  category_id uuid references categories(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  start_date date not null default current_date,
  end_date date,
  active boolean not null default true,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_subscriptions_active on subscriptions(active);

-- RLS — open policy (single user app)
alter table subscriptions enable row level security;
create policy "open access" on subscriptions for all using (true) with check (true);
