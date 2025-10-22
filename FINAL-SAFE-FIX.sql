-- ============================================================================
-- FINAL SAFE DATABASE FIX - RESPECTS ACTUAL ENUMS
-- ============================================================================
-- Based on actual column check and enum types
-- 
-- TIME ESTIMATE: ~30 seconds to execute
-- 
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. PROJECTS MODULE (Already has most columns, just add RLS)
-- ============================================================================

-- Add actual_cost if missing
alter table public.projects add column if not exists actual_cost numeric(15,2) default 0;

-- Status constraint (projects.status is text, not enum)
do $$
begin
  alter table public.projects drop constraint if exists projects_status_check;
  alter table public.projects add constraint projects_status_check check (status in ('planning','active','on_hold','completed','cancelled'));
  raise notice 'Projects status constraint added';
exception when others then
  raise notice 'Projects status constraint already exists or failed: %', sqlerrm;
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
update public.projects set status = 'active' where status is null or status = '';
update public.projects set budget = 0 where budget is null;
update public.projects set actual_cost = 0 where actual_cost is null;
update public.projects set orders_total = 0 where orders_total is null;
update public.projects set expenses_total = 0 where expenses_total is null;
update public.projects set deliveries_total = 0 where deliveries_total is null;

-- ============================================================================
-- 2. PRODUCTS MODULE (Missing most columns!)
-- ============================================================================

-- Add all missing columns
alter table public.products add column if not exists company_id uuid references public.companies(id);
alter table public.products add column if not exists created_by uuid references auth.users(id);
alter table public.products add column if not exists updated_at timestamptz default now();
alter table public.products add column if not exists status text default 'active';
alter table public.products add column if not exists description text;
alter table public.products add column if not exists sku text;
alter table public.products add column if not exists unit text default 'unit';
alter table public.products add column if not exists stock_quantity numeric(15,2) default 0;
alter table public.products add column if not exists min_stock_level numeric(15,2) default 10;
alter table public.products add column if not exists reorder_point numeric(15,2) default 15;
alter table public.products add column if not exists reorder_quantity numeric(15,2) default 50;

-- Status constraint (products.status is text, not enum)
do $$
begin
  alter table public.products drop constraint if exists products_status_check;
  alter table public.products add constraint products_status_check check (status in ('active','inactive','discontinued','out_of_stock'));
  raise notice 'Products status constraint added';
exception when others then
  raise notice 'Products status constraint failed: %', sqlerrm;
end $$;

-- Trigger
drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at before update on public.products for each row execute function public.set_updated_at();

-- Indexes
create index if not exists idx_products_company on public.products(company_id);
create index if not exists idx_products_company_status on public.products(company_id, status);

-- RLS
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

-- Backfill products
update public.products set status = 'active' where status is null or status = '';
update public.products set updated_at = created_at where updated_at is null;
update public.products set stock_quantity = 0 where stock_quantity is null;
update public.products set min_stock_level = 10 where min_stock_level is null;
update public.products set reorder_point = 15 where reorder_point is null;
update public.products set reorder_quantity = 50 where reorder_quantity is null;
update public.products set unit = 'unit' where unit is null or unit = '';

-- ============================================================================
-- 3. CHANGE ORDERS MODULE (Has co_status enum: pending, approved, rejected)
-- ============================================================================

-- Add missing columns only
alter table public.change_orders add column if not exists created_by uuid references auth.users(id);
alter table public.change_orders add column if not exists approver_email text;

-- NO status constraint needed - co_status enum already enforces valid values
-- Just ensure default is valid
alter table public.change_orders alter column status set default 'pending'::co_status;

-- Trigger
drop trigger if exists set_change_orders_updated_at on public.change_orders;
create trigger set_change_orders_updated_at before update on public.change_orders for each row execute function public.set_updated_at();

-- Indexes
create index if not exists idx_change_orders_company on public.change_orders(company_id);
create index if not exists idx_change_orders_company_status on public.change_orders(company_id, status);

-- RLS
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
create policy change_orders_update_creator on public.change_orders for update to authenticated using (company_id = public.profile_company_id(auth.uid()) and created_by = auth.uid() and status = 'pending'::co_status);
create policy change_orders_update_approver on public.change_orders for update to authenticated using (company_id = public.profile_company_id(auth.uid()) and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner','manager')));
create policy change_orders_delete_admin on public.change_orders for delete to authenticated using (company_id = public.profile_company_id(auth.uid()) and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner')));

-- Backfill change_orders (use valid enum values)
update public.change_orders set status = 'pending'::co_status where status is null;
update public.change_orders set updated_at = created_at where updated_at is null;

-- ============================================================================
-- FINALIZE
-- ============================================================================

notify pgrst, 'reload schema';

-- DONE! All 3 modules fixed: Projects (RLS), Products (Full), Change Orders (RLS)
