-- Add missing account types used by the app (checking, savings, investment)
alter table accounts drop constraint if exists accounts_type_check;
alter table accounts add constraint accounts_type_check
  check (type in ('perso', 'pro', 'stripe', 'bank', 'cash', 'checking', 'savings', 'investment'));

-- Add initial_balance column used by the app
alter table accounts add column if not exists initial_balance numeric(12, 2) default 0;
