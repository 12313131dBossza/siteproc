-- CONTRACTORS-SCHEMA-NORMALIZE.sql
-- Purpose: Normalize contractors table structure with company isolation

begin;

-- Add company_id column if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='contractors' and column_name='company_id'
  ) then
    alter table public.contractors add column company_id uuid references public.companies(id);
    raise notice 'Added company_id column';
  end if;
end $$;

-- Add created_by column if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='contractors' and column_name='created_by'
  ) then
    alter table public.contractors add column created_by uuid references auth.users(id);
    raise notice 'Added created_by column';
  end if;
end $$;

-- Ensure status column exists
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='contractors' and column_name='status'
  ) then
    alter table public.contractors add column status text default 'active';
  end if;
  
  alter table public.contractors drop constraint if exists contractors_status_check;
  alter table public.contractors add constraint contractors_status_check 
    check (status in ('active', 'inactive', 'suspended'));
end $$;

-- Add updated_at column if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='contractors' and column_name='updated_at'
  ) then
    alter table public.contractors add column updated_at timestamptz default now();
  end if;
end $$;

-- Add trigger for updated_at
drop trigger if exists set_contractors_updated_at on public.contractors;
create trigger set_contractors_updated_at
  before update on public.contractors
  for each row
  execute function public.set_updated_at();

-- Create indexes
create index if not exists idx_contractors_company on public.contractors(company_id);
create index if not exists idx_contractors_status on public.contractors(status);
create index if not exists idx_contractors_created_by on public.contractors(created_by);

commit;

notify pgrst, 'reload schema';
