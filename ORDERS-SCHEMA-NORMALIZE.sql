-- ORDERS-SCHEMA-NORMALIZE.sql
-- Purpose: Normalize purchase_orders table structure with company_id and standard columns

begin;

-- Add company_id column if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='purchase_orders' and column_name='company_id'
  ) then
    alter table public.purchase_orders add column company_id uuid references public.companies(id);
    raise notice 'Added company_id column';
  end if;
end $$;

-- Add created_by column if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='purchase_orders' and column_name='created_by'
  ) then
    alter table public.purchase_orders add column created_by uuid references auth.users(id);
    raise notice 'Added created_by column';
  end if;
end $$;

-- Ensure status column exists with proper constraint
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='purchase_orders' and column_name='status'
  ) then
    alter table public.purchase_orders add column status text default 'pending';
    raise notice 'Added status column';
  end if;
  
  -- Add/update constraint for valid statuses
  alter table public.purchase_orders drop constraint if exists purchase_orders_status_check;
  alter table public.purchase_orders add constraint purchase_orders_status_check 
    check (status in ('draft', 'pending', 'approved', 'rejected', 'ordered', 'completed', 'cancelled'));
end $$;

-- Add approval tracking columns
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='purchase_orders' and column_name='approved_by'
  ) then
    alter table public.purchase_orders add column approved_by uuid references auth.users(id);
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='purchase_orders' and column_name='approved_at'
  ) then
    alter table public.purchase_orders add column approved_at timestamptz;
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='purchase_orders' and column_name='rejected_by'
  ) then
    alter table public.purchase_orders add column rejected_by uuid references auth.users(id);
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='purchase_orders' and column_name='rejected_at'
  ) then
    alter table public.purchase_orders add column rejected_at timestamptz;
  end if;
end $$;

-- Add updated_at column if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='purchase_orders' and column_name='updated_at'
  ) then
    alter table public.purchase_orders add column updated_at timestamptz default now();
    raise notice 'Added updated_at column';
  end if;
end $$;

-- Create or replace trigger function for updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Add trigger for updated_at if not exists
drop trigger if exists set_purchase_orders_updated_at on public.purchase_orders;
create trigger set_purchase_orders_updated_at
  before update on public.purchase_orders
  for each row
  execute function public.set_updated_at();

-- Create useful indexes
create index if not exists idx_purchase_orders_company_created 
  on public.purchase_orders(company_id, created_at desc);

create index if not exists idx_purchase_orders_company_status 
  on public.purchase_orders(company_id, status);

create index if not exists idx_purchase_orders_project 
  on public.purchase_orders(project_id);

create index if not exists idx_purchase_orders_created_by 
  on public.purchase_orders(created_by);

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
