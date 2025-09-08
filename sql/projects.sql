-- Projects module: schema, indexes, and RLS (idempotent)

-- Helper: admin check if not already present
do $$ begin
  if not exists (
    select 1 from pg_proc where proname = 'is_admin' and pronamespace = 'public'::regnamespace
  ) then
    create or replace function public.is_admin() returns boolean
    language sql stable as $$
      select exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('owner','admin')
      );
    $$;
  end if;
end $$;

-- Table: projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique null,
  budget numeric(14,2) not null default 0,
  status text not null default 'active' check (status in ('active','on_hold','closed')),
  company_id uuid not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Ensure columns exist (idempotent)
alter table public.projects add column if not exists name text;
alter table public.projects add column if not exists code text;
alter table public.projects add column if not exists budget numeric(14,2);
alter table public.projects alter column budget set default 0;
alter table public.projects add column if not exists status text;
alter table public.projects alter column status set default 'active';
alter table public.projects add column if not exists company_id uuid;
alter table public.projects add column if not exists created_by uuid;
alter table public.projects add column if not exists created_at timestamptz;
alter table public.projects alter column created_at set default now();

-- Indexes
create index if not exists idx_projects_company_status on public.projects(company_id, status);

-- Add project_id to related tables
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='orders') then
    alter table public.orders add column if not exists project_id uuid null;
    create index if not exists idx_orders_project on public.orders(project_id);
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='expenses') then
    alter table public.expenses add column if not exists project_id uuid null;
    create index if not exists idx_expenses_project on public.expenses(project_id);
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='deliveries') then
    alter table public.deliveries add column if not exists project_id uuid null;
    create index if not exists idx_deliveries_project on public.deliveries(project_id);
  end if;
end $$;

-- RLS
alter table public.projects enable row level security;

-- Policies (drop/create to be idempotent)
drop policy if exists projects_select_company on public.projects;
create policy projects_select_company
on public.projects
for select to authenticated
using (
  company_id = (select company_id from public.profiles where id = auth.uid())
);

drop policy if exists projects_insert_company on public.projects;
create policy projects_insert_company
on public.projects
for insert to authenticated
with check (
  company_id = (select company_id from public.profiles where id = auth.uid())
);

drop policy if exists projects_update_admin on public.projects;
create policy projects_update_admin
on public.projects
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists projects_delete_admin on public.projects;
create policy projects_delete_admin
on public.projects
for delete to authenticated
using (public.is_admin());

-- Backfill no-op: project_id columns are nullable, so existing rows remain untouched
