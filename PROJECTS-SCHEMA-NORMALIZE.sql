-- PROJECTS-SCHEMA-NORMALIZE.sql
-- Purpose: Normalize projects table structure with standard columns

begin;

-- Add created_by column if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='projects' and column_name='created_by'
  ) then
    alter table public.projects add column created_by uuid references auth.users(id);
    raise notice 'Added created_by column';
  end if;
end $$;

-- Ensure company_id column exists
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='projects' and column_name='company_id'
  ) then
    alter table public.projects add column company_id uuid references public.companies(id);
    raise notice 'Added company_id column';
  end if;
end $$;

-- Ensure status column exists with proper constraint
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='projects' and column_name='status'
  ) then
    alter table public.projects add column status text default 'active';
    raise notice 'Added status column';
  end if;
  
  -- Add/update constraint for valid statuses
  alter table public.projects drop constraint if exists projects_status_check;
  alter table public.projects add constraint projects_status_check 
    check (status in ('planning', 'active', 'on_hold', 'completed', 'cancelled'));
end $$;

-- Add budget and actuals tracking columns
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='projects' and column_name='budget'
  ) then
    alter table public.projects add column budget numeric(15,2) default 0;
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='projects' and column_name='actual_cost'
  ) then
    alter table public.projects add column actual_cost numeric(15,2) default 0;
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='projects' and column_name='orders_total'
  ) then
    alter table public.projects add column orders_total numeric(15,2) default 0;
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='projects' and column_name='expenses_total'
  ) then
    alter table public.projects add column expenses_total numeric(15,2) default 0;
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='projects' and column_name='deliveries_total'
  ) then
    alter table public.projects add column deliveries_total numeric(15,2) default 0;
  end if;
end $$;

-- Add updated_at column if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='projects' and column_name='updated_at'
  ) then
    alter table public.projects add column updated_at timestamptz default now();
    raise notice 'Added updated_at column';
  end if;
end $$;

-- Add trigger for updated_at if not exists
drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
  before update on public.projects
  for each row
  execute function public.set_updated_at();

-- Create useful indexes
create index if not exists idx_projects_company 
  on public.projects(company_id);

create index if not exists idx_projects_company_status 
  on public.projects(company_id, status);

create index if not exists idx_projects_created_by 
  on public.projects(created_by);

create index if not exists idx_projects_status 
  on public.projects(status);

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
