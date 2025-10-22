-- PRODUCTS-SCHEMA-NORMALIZE.sql
-- Purpose: Normalize products table structure with standard columns

begin;

-- Add company_id column if missing (already exists based on API code)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='products' and column_name='company_id'
  ) then
    alter table public.products add column company_id uuid references public.companies(id);
    raise notice 'Added company_id column';
  end if;
end $$;

-- Add created_by column if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='products' and column_name='created_by'
  ) then
    alter table public.products add column created_by uuid references auth.users(id);
    raise notice 'Added created_by column';
  end if;
end $$;

-- Ensure status column exists with proper constraint
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='products' and column_name='status'
  ) then
    alter table public.products add column status text default 'active';
    raise notice 'Added status column';
  end if;
  
  -- Add/update constraint for valid statuses
  alter table public.products drop constraint if exists products_status_check;
  alter table public.products add constraint products_status_check 
    check (status in ('active', 'inactive', 'discontinued', 'out_of_stock'));
end $$;

-- Ensure inventory tracking columns exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='products' and column_name='stock_quantity'
  ) then
    alter table public.products add column stock_quantity numeric(15,2) default 0;
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='products' and column_name='min_stock_level'
  ) then
    alter table public.products add column min_stock_level numeric(15,2) default 10;
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='products' and column_name='reorder_point'
  ) then
    alter table public.products add column reorder_point numeric(15,2) default 15;
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='products' and column_name='reorder_quantity'
  ) then
    alter table public.products add column reorder_quantity numeric(15,2) default 50;
  end if;
end $$;

-- Add updated_at column if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='products' and column_name='updated_at'
  ) then
    alter table public.products add column updated_at timestamptz default now();
    raise notice 'Added updated_at column';
  end if;
end $$;

-- Add trigger for updated_at if not exists
drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();

-- Create useful indexes
create index if not exists idx_products_company 
  on public.products(company_id);

create index if not exists idx_products_company_status 
  on public.products(company_id, status);

create index if not exists idx_products_category 
  on public.products(category);

create index if not exists idx_products_created_by 
  on public.products(created_by);

create index if not exists idx_products_stock_level 
  on public.products(stock_quantity) where stock_quantity <= min_stock_level;

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
