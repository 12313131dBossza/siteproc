-- PAYMENTS-SCHEMA-NORMALIZE.sql
-- Purpose: Normalize payments table structure with standard columns

begin;

-- Add company_id column if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='payments' and column_name='company_id'
  ) then
    alter table public.payments add column company_id uuid references public.companies(id);
    raise notice 'Added company_id column';
  end if;
end $$;

-- Add created_by column if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='payments' and column_name='created_by'
  ) then
    alter table public.payments add column created_by uuid references auth.users(id);
    raise notice 'Added created_by column';
  end if;
end $$;

-- Ensure status column exists with proper constraint
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='payments' and column_name='status'
  ) then
    alter table public.payments add column status text default 'unpaid';
    raise notice 'Added status column';
  end if;
  
  -- Add/update constraint for valid statuses
  alter table public.payments drop constraint if exists payments_status_check;
  alter table public.payments add constraint payments_status_check 
    check (status in ('unpaid', 'pending', 'paid', 'cancelled', 'failed'));
end $$;

-- Add approval tracking columns
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='payments' and column_name='approved_by'
  ) then
    alter table public.payments add column approved_by uuid references auth.users(id);
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='payments' and column_name='approved_at'
  ) then
    alter table public.payments add column approved_at timestamptz;
  end if;
end $$;

-- Add updated_at column if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='payments' and column_name='updated_at'
  ) then
    alter table public.payments add column updated_at timestamptz default now();
    raise notice 'Added updated_at column';
  end if;
end $$;

-- Add trigger for updated_at if not exists
drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
  before update on public.payments
  for each row
  execute function public.set_updated_at();

-- Create useful indexes
create index if not exists idx_payments_company 
  on public.payments(company_id);

create index if not exists idx_payments_company_status 
  on public.payments(company_id, status);

create index if not exists idx_payments_project 
  on public.payments(project_id);

create index if not exists idx_payments_created_by 
  on public.payments(created_by);

create index if not exists idx_payments_payment_date 
  on public.payments(payment_date desc);

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
