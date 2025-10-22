-- CHANGE-ORDERS-SCHEMA-NORMALIZE.sql
-- Purpose: Normalize change_orders table for consistent operation with app expectations.

begin;

-- 1) Ensure change_orders table exists with all necessary columns
create table if not exists public.change_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  project_id uuid references public.projects(id),
  order_id uuid,
  created_by uuid references auth.users(id),
  title text not null,
  description text,
  reason text,
  status text not null default 'pending',
  amount numeric(12,2) default 0,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  rejected_by uuid references auth.users(id),
  rejected_at timestamptz,
  approval_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Add missing columns if they don't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='change_orders' and column_name='company_id') then
    alter table public.change_orders add column company_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='change_orders' and column_name='created_by') then
    alter table public.change_orders add column created_by uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='change_orders' and column_name='status') then
    alter table public.change_orders add column status text not null default 'pending';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='change_orders' and column_name='approved_by') then
    alter table public.change_orders add column approved_by uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='change_orders' and column_name='approved_at') then
    alter table public.change_orders add column approved_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='change_orders' and column_name='rejected_by') then
    alter table public.change_orders add column rejected_by uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='change_orders' and column_name='rejected_at') then
    alter table public.change_orders add column rejected_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='change_orders' and column_name='approval_notes') then
    alter table public.change_orders add column approval_notes text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='change_orders' and column_name='updated_at') then
    alter table public.change_orders add column updated_at timestamptz not null default now();
  end if;
end $$;

-- 3) Status constraint
do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname='public' and t.relname='change_orders' and c.conname='change_orders_status_chk'
  ) then
    alter table public.change_orders
      add constraint change_orders_status_chk check (status in ('pending','approved','rejected','completed')) not valid;
    alter table public.change_orders validate constraint change_orders_status_chk;
  end if;
end $$;

-- 4) Updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists trg_change_orders_updated_at on public.change_orders;
create trigger trg_change_orders_updated_at
before update on public.change_orders
for each row execute function public.set_updated_at();

-- 5) Indexes
create index if not exists idx_change_orders_company_created on public.change_orders(company_id, created_at desc);
create index if not exists idx_change_orders_company_status on public.change_orders(company_id, status);
create index if not exists idx_change_orders_project on public.change_orders(project_id);
create index if not exists idx_change_orders_created_by on public.change_orders(created_by);

-- 6) FK constraints (best-effort)
do $$
begin
  begin
    alter table public.change_orders add constraint change_orders_company_fk foreign key (company_id) references public.companies(id);
  exception when duplicate_object then null; when undefined_table then null; when invalid_foreign_key then null; end;
  
  begin
    alter table public.change_orders add constraint change_orders_project_fk foreign key (project_id) references public.projects(id);
  exception when duplicate_object then null; when undefined_table then null; when invalid_foreign_key then null; end;
end $$;

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
