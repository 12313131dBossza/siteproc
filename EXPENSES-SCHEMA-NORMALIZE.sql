-- EXPENSES-SCHEMA-NORMALIZE.sql
-- Purpose: Normalize the expenses table shape across environments so app APIs work consistently.
-- Safe-guards: Use IF EXISTS/IF NOT EXISTS and DO blocks to avoid failing if already applied.

begin;

-- 1) Ensure expenses table exists
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  project_id uuid references public.projects(id),
  user_id uuid references auth.users(id),
  vendor text,
  category text,
  amount numeric(12,2) not null default 0,
  description text,
  memo text,
  status text not null default 'pending',
  approval_notes text,
  spent_at date,
  spent_on date,
  receipt_url text,
  decided_by uuid references auth.users(id), -- compatibility
  decided_at timestamptz,                    -- compatibility
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  tax numeric(12,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Add missing columns if they don't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'company_id') then
    alter table public.expenses add column company_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'user_id') then
    alter table public.expenses add column user_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'vendor') then
    alter table public.expenses add column vendor text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'category') then
    alter table public.expenses add column category text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'amount') then
    alter table public.expenses add column amount numeric(12,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'description') then
    alter table public.expenses add column description text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'memo') then
    alter table public.expenses add column memo text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'status') then
    alter table public.expenses add column status text not null default 'pending';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'approval_notes') then
    alter table public.expenses add column approval_notes text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'spent_at') then
    alter table public.expenses add column spent_at date;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'spent_on') then
    alter table public.expenses add column spent_on date;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'receipt_url') then
    alter table public.expenses add column receipt_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'approved_by') then
    alter table public.expenses add column approved_by uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'approved_at') then
    alter table public.expenses add column approved_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'decided_by') then
    alter table public.expenses add column decided_by uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'decided_at') then
    alter table public.expenses add column decided_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'tax') then
    alter table public.expenses add column tax numeric(12,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'created_at') then
    alter table public.expenses add column created_at timestamptz not null default now();
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'updated_at') then
    alter table public.expenses add column updated_at timestamptz not null default now();
  end if;
end $$;

-- 3) Constrain status values to known set without breaking existing data
do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname='public' and t.relname='expenses' and c.conname='expenses_status_chk'
  ) then
    alter table public.expenses
      add constraint expenses_status_chk check (status in ('pending','approved','rejected')) not valid;
    alter table public.expenses validate constraint expenses_status_chk;
  end if;
end $$;

-- 4) Ensure updated_at auto-updates
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists trg_expenses_updated_at on public.expenses;
create trigger trg_expenses_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

-- 5) Helpful indexes
create index if not exists idx_expenses_company_created on public.expenses(company_id, created_at desc);
create index if not exists idx_expenses_company_status on public.expenses(company_id, status);
create index if not exists idx_expenses_user on public.expenses(user_id);

-- 6) FK wiring where possible (skip if references missing)
do $$
begin
  -- company_id -> companies(id)
  begin
    alter table public.expenses
      add constraint expenses_company_fk foreign key (company_id) references public.companies(id);
  exception when duplicate_object then null; when undefined_table then null; when invalid_foreign_key then null; end;

  -- user_id -> auth.users(id) cannot be referenced across schemas in some setups; best-effort only
  null;
end $$;

-- 7) Backfill vendor/category from memo if missing (optional safe-op)
update public.expenses
set vendor = coalesce(vendor, split_part(coalesce(memo,''), ' - ', 1))
where vendor is null;

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
