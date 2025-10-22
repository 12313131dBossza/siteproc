-- ============================================================================
-- COMPREHENSIVE DATABASE FIX - RUN ALL AT ONCE
-- ============================================================================
-- This script applies all pending fixes for Projects, Payments, Products,
-- Contractors, and Clients modules in the correct order.
-- 
-- TIME ESTIMATE: ~2-3 minutes to execute
-- 
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

\echo '🚀 Starting comprehensive database fix...'
\echo ''

-- ============================================================================
-- 1. PROJECTS MODULE
-- ============================================================================
\echo '📦 Fixing Projects module...'

-- Schema normalize
do $$
begin
  -- Add columns
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='created_by') then
    alter table public.projects add column created_by uuid references auth.users(id);
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='company_id') then
    alter table public.projects add column company_id uuid references public.companies(id);
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='updated_at') then
    alter table public.projects add column updated_at timestamptz default now();
  end if;
  
  -- Status constraint
  alter table public.projects drop constraint if exists projects_status_check;
  alter table public.projects add constraint projects_status_check check (status in ('planning','active','on_hold','completed','cancelled'));
  
  -- Budget columns
  alter table public.projects add column if not exists budget numeric(15,2) default 0;
  alter table public.projects add column if not exists actual_cost numeric(15,2) default 0;
  alter table public.projects add column if not exists orders_total numeric(15,2) default 0;
  alter table public.projects add column if not exists expenses_total numeric(15,2) default 0;
  alter table public.projects add column if not exists deliveries_total numeric(15,2) default 0;
end $$;

-- Trigger
drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at before update on public.projects for each row execute function public.set_updated_at();

-- Indexes
create index if not exists idx_projects_company on public.projects(company_id);
create index if not exists idx_projects_company_status on public.projects(company_id, status);

-- RLS
alter table public.projects enable row level security;

do $$
declare r record;
begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='projects') loop
    execute format('drop policy if exists %I on public.projects;', r.policyname);
  end loop;
end $$;

create policy projects_select_company on public.projects for select to authenticated using (company_id = public.profile_company_id(auth.uid()) or created_by = auth.uid());
create policy projects_insert_own on public.projects for insert to authenticated with check (created_by = auth.uid() and company_id = public.profile_company_id(auth.uid()));
create policy projects_update_own on public.projects for update to authenticated using (company_id = public.profile_company_id(auth.uid()));
create policy projects_delete_own on public.projects for delete to authenticated using (company_id = public.profile_company_id(auth.uid()) and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner')));

-- Backfill
update public.projects p set created_by = (select pr.id from public.profiles pr where pr.company_id = p.company_id and pr.role in ('admin','owner') limit 1) where p.created_by is null;
update public.projects set status = 'active' where status is null or status = '';
update public.projects set updated_at = created_at where updated_at is null;
update public.projects set budget = 0 where budget is null;
update public.projects set actual_cost = 0 where actual_cost is null;
update public.projects set orders_total = 0 where orders_total is null;
update public.projects set expenses_total = 0 where expenses_total is null;
update public.projects set deliveries_total = 0 where deliveries_total is null;

\echo '✅ Projects module fixed'
\echo ''

-- ============================================================================
-- 2. PAYMENTS MODULE
-- ============================================================================
\echo '💰 Fixing Payments module...'

do $$
begin
  -- Add columns
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='company_id') then
    alter table public.payments add column company_id uuid references public.companies(id);
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='created_by') then
    alter table public.payments add column created_by uuid references auth.users(id);
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='updated_at') then
    alter table public.payments add column updated_at timestamptz default now();
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='approved_by') then
    alter table public.payments add column approved_by uuid references auth.users(id);
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='approved_at') then
    alter table public.payments add column approved_at timestamptz;
  end if;
  
  -- Status constraint
  alter table public.payments drop constraint if exists payments_status_check;
  alter table public.payments add constraint payments_status_check check (status in ('unpaid','pending','paid','cancelled','failed'));
end $$;

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at before update on public.payments for each row execute function public.set_updated_at();

create index if not exists idx_payments_company on public.payments(company_id);
create index if not exists idx_payments_company_status on public.payments(company_id, status);

alter table public.payments enable row level security;

do $$
declare r record;
begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='payments') loop
    execute format('drop policy if exists %I on public.payments;', r.policyname);
  end loop;
end $$;

create policy payments_select_company on public.payments for select to authenticated using (company_id = public.profile_company_id(auth.uid()));
create policy payments_insert_authorized on public.payments for insert to authenticated with check (company_id = public.profile_company_id(auth.uid()) and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner','manager','bookkeeper','accountant')));
create policy payments_update_creator on public.payments for update to authenticated using (company_id = public.profile_company_id(auth.uid()) and created_by = auth.uid() and status in ('unpaid','pending'));
create policy payments_update_approver on public.payments for update to authenticated using (company_id = public.profile_company_id(auth.uid()) and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner','bookkeeper','accountant')));
create policy payments_delete_admin on public.payments for delete to authenticated using (company_id = public.profile_company_id(auth.uid()) and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner')));

update public.payments p set created_by = (select pr.id from public.profiles pr where pr.company_id = p.company_id and pr.role in ('admin','owner','bookkeeper','accountant') limit 1) where p.created_by is null;
update public.payments set status = 'unpaid' where status is null or status = '';
update public.payments set updated_at = created_at where updated_at is null;

\echo '✅ Payments module fixed'
\echo ''

-- ============================================================================
-- 3. PRODUCTS MODULE
-- ============================================================================
\echo '📦 Fixing Products module...'

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='company_id') then
    alter table public.products add column company_id uuid references public.companies(id);
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='created_by') then
    alter table public.products add column created_by uuid references auth.users(id);
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='updated_at') then
    alter table public.products add column updated_at timestamptz default now();
  end if;
  
  alter table public.products drop constraint if exists products_status_check;
  alter table public.products add constraint products_status_check check (status in ('active','inactive','discontinued','out_of_stock'));
  
  alter table public.products add column if not exists stock_quantity numeric(15,2) default 0;
  alter table public.products add column if not exists min_stock_level numeric(15,2) default 10;
  alter table public.products add column if not exists reorder_point numeric(15,2) default 15;
  alter table public.products add column if not exists reorder_quantity numeric(15,2) default 50;
end $$;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at before update on public.products for each row execute function public.set_updated_at();

create index if not exists idx_products_company on public.products(company_id);
create index if not exists idx_products_company_status on public.products(company_id, status);

alter table public.products enable row level security;

do $$
declare r record;
begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='products') loop
    execute format('drop policy if exists %I on public.products;', r.policyname);
  end loop;
end $$;

create policy products_select_company on public.products for select to authenticated using (company_id = public.profile_company_id(auth.uid()) or company_id is null);
create policy products_insert_own on public.products for insert to authenticated with check (created_by = auth.uid() and (company_id = public.profile_company_id(auth.uid()) or company_id is null));
create policy products_update_own on public.products for update to authenticated using ((company_id = public.profile_company_id(auth.uid()) or company_id is null));
create policy products_delete_own on public.products for delete to authenticated using ((company_id = public.profile_company_id(auth.uid()) or company_id is null) and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner')));

update public.products p set created_by = (select pr.id from public.profiles pr where pr.company_id = p.company_id and pr.role in ('admin','owner') limit 1) where p.created_by is null and p.company_id is not null;
update public.products set status = 'active' where status is null or status = '';
update public.products set updated_at = created_at where updated_at is null;
update public.products set stock_quantity = 0 where stock_quantity is null;
update public.products set min_stock_level = 10 where min_stock_level is null;
update public.products set reorder_point = 15 where reorder_point is null;
update public.products set reorder_quantity = 50 where reorder_quantity is null;

\echo '✅ Products module fixed'
\echo ''

-- ============================================================================
-- 4. CONTRACTORS MODULE
-- ============================================================================
\echo '👷 Fixing Contractors module...'

alter table public.contractors add column if not exists company_id uuid references public.companies(id);
alter table public.contractors add column if not exists created_by uuid references auth.users(id);
alter table public.contractors add column if not exists updated_at timestamptz default now();

do $$
begin
  alter table public.contractors drop constraint if exists contractors_status_check;
  alter table public.contractors add constraint contractors_status_check check (status in ('active','inactive','suspended'));
end $$;

drop trigger if exists set_contractors_updated_at on public.contractors;
create trigger set_contractors_updated_at before update on public.contractors for each row execute function public.set_updated_at();

create index if not exists idx_contractors_company on public.contractors(company_id);

alter table public.contractors enable row level security;

do $$
declare r record;
begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='contractors') loop
    execute format('drop policy if exists %I on public.contractors;', r.policyname);
  end loop;
end $$;

create policy contractors_select_company on public.contractors for select to authenticated using (company_id = public.profile_company_id(auth.uid()));
create policy contractors_insert_own on public.contractors for insert to authenticated with check (created_by = auth.uid() and company_id = public.profile_company_id(auth.uid()));
create policy contractors_update_own on public.contractors for update to authenticated using (company_id = public.profile_company_id(auth.uid()));
create policy contractors_delete_admin on public.contractors for delete to authenticated using (company_id = public.profile_company_id(auth.uid()) and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner')));

update public.contractors c set created_by = (select pr.id from public.profiles pr where pr.company_id = c.company_id and pr.role in ('admin','owner') limit 1) where c.created_by is null and c.company_id is not null;
update public.contractors set status = 'active' where status is null or status = '';
update public.contractors set updated_at = created_at where updated_at is null;

\echo '✅ Contractors module fixed'
\echo ''

-- ============================================================================
-- 5. CLIENTS MODULE
-- ============================================================================
\echo '👥 Fixing Clients module...'

alter table public.clients add column if not exists company_id uuid references public.companies(id);
alter table public.clients add column if not exists created_by uuid references auth.users(id);
alter table public.clients add column if not exists updated_at timestamptz default now();

do $$
begin
  alter table public.clients drop constraint if exists clients_status_check;
  alter table public.clients add constraint clients_status_check check (status in ('active','inactive','suspended'));
end $$;

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at before update on public.clients for each row execute function public.set_updated_at();

create index if not exists idx_clients_company on public.clients(company_id);

alter table public.clients enable row level security;

do $$
declare r record;
begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='clients') loop
    execute format('drop policy if exists %I on public.clients;', r.policyname);
  end loop;
end $$;

create policy clients_select_company on public.clients for select to authenticated using (company_id = public.profile_company_id(auth.uid()));
create policy clients_insert_own on public.clients for insert to authenticated with check (created_by = auth.uid() and company_id = public.profile_company_id(auth.uid()));
create policy clients_update_own on public.clients for update to authenticated using (company_id = public.profile_company_id(auth.uid()));
create policy clients_delete_admin on public.clients for delete to authenticated using (company_id = public.profile_company_id(auth.uid()) and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner')));

update public.clients c set created_by = (select pr.id from public.profiles pr where pr.company_id = c.company_id and pr.role in ('admin','owner') limit 1) where c.created_by is null and c.company_id is not null;
update public.clients set status = 'active' where status is null or status = '';
update public.clients set updated_at = created_at where updated_at is null;

\echo '✅ Clients module fixed'
\echo ''

-- ============================================================================
-- FINALIZE
-- ============================================================================
\echo '🔄 Refreshing schema cache...'

notify pgrst, 'reload schema';

\echo ''
\echo '🎉 COMPREHENSIVE FIX COMPLETE!'
\echo ''
\echo 'Fixed modules:'
\echo '  ✅ Projects'
\echo '  ✅ Payments'
\echo '  ✅ Products'
\echo '  ✅ Contractors'
\echo '  ✅ Clients'
\echo ''
\echo 'Next: Deploy updated API code and test all pages'
