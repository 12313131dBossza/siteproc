-- Up: add new expense detail columns and backfill description
begin;
alter table public.expenses
  add column if not exists category text,
  add column if not exists vendor text,
  add column if not exists tax numeric(14,2),
  add column if not exists description text,
  add column if not exists status text default 'logged';

-- Backfill description from memo where missing
update public.expenses set description = coalesce(description, memo) where description is null;
commit;

-- Down: drop the columns added above
-- (Wrap in transaction; use if exists guards)
-- To rollback manually execute only the section below.
-- Down migration starts
-- Uncomment below to execute rollback manually if your migration runner expects separate files.
-- begin;
-- alter table public.expenses
--   drop column if exists status,
--   drop column if exists description,
--   drop column if exists tax,
--   drop column if exists vendor,
--   drop column if exists category;
-- commit;
