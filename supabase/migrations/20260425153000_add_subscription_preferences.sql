-- Persist UI-level subscription flags in Supabase instead of localStorage

create table if not exists subscription_preferences (
  group_key text primary key,
  is_cancelled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table subscription_preferences enable row level security;

create policy "open access" on subscription_preferences
  for all
  using (true)
  with check (true);
