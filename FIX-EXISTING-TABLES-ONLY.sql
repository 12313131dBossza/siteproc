-- ============================================================================
-- COMPREHENSIVE DATABASE FIX - ACTUAL TABLES ONLY
-- ============================================================================
-- This script fixes ONLY the tables that exist in your database:
-- - Projects
-- - Products  
-- - Change Orders
-- 
-- TIME ESTIMATE: ~1-2 minutes to execute
-- 
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. PROJECTS MODULE
-- ============================================================================

-- Schema normalize
do $$
begin
  -- Add columns
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='created_by') then
    alter table public.projects add column created_by uuid references auth.users(id);
    raise notice 'Added projects.created_by';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='company_id') then
    alter table public.projects add column company_id uuid references public.companies(id);
    raise notice 'Added projects.company_id';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='updated_at') then
    alter table public.projects add column updated_at timestamptz default now();
    raise notice 'Added projects.updated_at';
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
  
  raise notice 'Projects schema normalized';
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
  raise notice 'Dropped existing projects policies';
end $$;

create policy projects_select_company on public.projects for select to authenticated using (company_id = public.profile_company_id(auth.uid()) or created_by = auth.uid());
create policy projects_insert_own on public.projects for insert to authenticated with check (created_by = auth.uid() and company_id = public.profile_company_id(auth.uid()));
create policy projects_update_own on public.projects for update to authenticated using (company_id = public.profile_company_id(auth.uid()));
create policy projects_delete_own on public.projects for delete to authenticated using (company_id = public.profile_company_id(auth.uid()) and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner')));

-- Backfill
update public.projects p set company_id = (select pr.company_id from public.profiles pr where pr.id = p.created_by limit 1) where p.company_id is null and p.created_by is not null;
update public.projects p set created_by = (select pr.id from public.profiles pr where pr.company_id = p.company_id and pr.role in ('admin','owner') limit 1) where p.created_by is null;
update public.projects set status = 'active' where status is null or status = '';
update public.projects set updated_at = created_at where updated_at is null;
update public.projects set budget = 0 where budget is null;
update public.projects set actual_cost = 0 where actual_cost is null;
update public.projects set orders_total = 0 where orders_total is null;
update public.projects set expenses_total = 0 where expenses_total is null;
update public.projects set deliveries_total = 0 where deliveries_total is null;

-- ============================================================================
-- 2. PRODUCTS MODULE
-- ============================================================================

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='company_id') then
    alter table public.products add column company_id uuid references public.companies(id);
    raise notice 'Added products.company_id';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='created_by') then
    alter table public.products add column created_by uuid references auth.users(id);
    raise notice 'Added products.created_by';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='updated_at') then
    alter table public.products add column updated_at timestamptz default now();
    raise notice 'Added products.updated_at';
  end if;
  
  alter table public.products drop constraint if exists products_status_check;
  alter table public.products add constraint products_status_check check (status in ('active','inactive','discontinued','out_of_stock'));
  
  alter table public.products add column if not exists stock_quantity numeric(15,2) default 0;
  alter table public.products add column if not exists min_stock_level numeric(15,2) default 10;
  alter table public.products add column if not exists reorder_point numeric(15,2) default 15;
  alter table public.products add column if not exists reorder_quantity numeric(15,2) default 50;
  
  raise notice 'Products schema normalized';
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
  raise notice 'Dropped existing products policies';
end $$;

create policy products_select_company on public.products for select to authenticated using (company_id = public.profile_company_id(auth.uid()) or company_id is null);
create policy products_insert_own on public.products for insert to authenticated with check (created_by = auth.uid() and (company_id = public.profile_company_id(auth.uid()) or company_id is null));
create policy products_update_own on public.products for update to authenticated using ((company_id = public.profile_company_id(auth.uid()) or company_id is null));
create policy products_delete_own on public.products for delete to authenticated using ((company_id = public.profile_company_id(auth.uid()) or company_id is null) and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner')));

update public.products p set company_id = (select pr.company_id from public.profiles pr where pr.id = p.created_by limit 1) where p.company_id is null and p.created_by is not null;
update public.products p set created_by = (select pr.id from public.profiles pr where pr.company_id = p.company_id and pr.role in ('admin','owner') limit 1) where p.created_by is null and p.company_id is not null;
update public.products set status = 'active' where status is null or status = '';
update public.products set updated_at = created_at where updated_at is null;
update public.products set stock_quantity = 0 where stock_quantity is null;
update public.products set min_stock_level = 10 where min_stock_level is null;
update public.products set reorder_point = 15 where reorder_point is null;
update public.products set reorder_quantity = 50 where reorder_quantity is null;

-- ============================================================================
-- 3. CHANGE ORDERS MODULE
-- ============================================================================

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='change_orders' and column_name='company_id') then
    alter table public.change_orders add column company_id uuid references public.companies(id);
    raise notice 'Added change_orders.company_id';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='change_orders' and column_name='created_by') then
    alter table public.change_orders add column created_by uuid references auth.users(id);
    raise notice 'Added change_orders.created_by';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='change_orders' and column_name='updated_at') then
    alter table public.change_orders add column updated_at timestamptz default now();
    raise notice 'Added change_orders.updated_at';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='change_orders' and column_name='approved_by') then
    alter table public.change_orders add column approved_by uuid references auth.users(id);
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='change_orders' and column_name='approved_at') then
    alter table public.change_orders add column approved_at timestamptz;
  end if;
  
  alter table public.change_orders drop constraint if exists change_orders_status_check;
  alter table public.change_orders add constraint change_orders_status_check check (status in ('draft','pending','approved','rejected','implemented'));
  
  raise notice 'Change Orders schema normalized';
end $$;

drop trigger if exists set_change_orders_updated_at on public.change_orders;
create trigger set_change_orders_updated_at before update on public.change_orders for each row execute function public.set_updated_at();

create index if not exists idx_change_orders_company on public.change_orders(company_id);
create index if not exists idx_change_orders_company_status on public.change_orders(company_id, status);

alter table public.change_orders enable row level security;

do $$
declare r record;
begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='change_orders') loop
    execute format('drop policy if exists %I on public.change_orders;', r.policyname);
  end loop;
  raise notice 'Dropped existing change_orders policies';
end $$;

create policy change_orders_select_company on public.change_orders for select to authenticated using (company_id = public.profile_company_id(auth.uid()));
create policy change_orders_insert_own on public.change_orders for insert to authenticated with check (created_by = auth.uid() and company_id = public.profile_company_id(auth.uid()));
create policy change_orders_update_creator on public.change_orders for update to authenticated using (company_id = public.profile_company_id(auth.uid()) and created_by = auth.uid() and status in ('draft','pending'));
create policy change_orders_update_approver on public.change_orders for update to authenticated using (company_id = public.profile_company_id(auth.uid()) and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner','manager')));
create policy change_orders_delete_admin on public.change_orders for delete to authenticated using (company_id = public.profile_company_id(auth.uid()) and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner')));

update public.change_orders co set company_id = (select pr.company_id from public.profiles pr where pr.id = co.created_by limit 1) where co.company_id is null and co.created_by is not null;
update public.change_orders co set created_by = (select pr.id from public.profiles pr where pr.company_id = co.company_id and pr.role in ('admin','owner') limit 1) where co.created_by is null;
update public.change_orders set status = 'draft' where status is null or status = '';
update public.change_orders set updated_at = created_at where updated_at is null;

-- ============================================================================
-- FINALIZE
-- ============================================================================

notify pgrst, 'reload schema';

-- DONE! All 3 modules fixed: Projects, Products, Change Orders
