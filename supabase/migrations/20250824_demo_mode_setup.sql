-- Demo mode setup: add is_demo flag, demo company, helper function, revised RLS policies.
begin;
-- 1. Add is_demo column
alter table public.companies add column if not exists is_demo boolean default false;

-- 2. Insert demo company (fixed UUID for repeatability)
insert into public.companies (id, name, is_demo)
values ('00000000-0000-4000-8000-000000000001','SiteProc Demo', true)
on conflict (id) do update set name=excluded.name, is_demo=excluded.is_demo;

-- 3. Helper: demo_company_id()
create or replace function public.demo_company_id()
returns uuid language sql stable as $$
  select id from public.companies where is_demo = true order by created_at limit 1;
$$;

-- 4. Replace selected policies (jobs, quotes, deliveries, pos, change_orders, expenses, suppliers, events)
-- Drop old generic policies if they exist
 drop policy if exists jobs_rls on public.jobs;
 drop policy if exists quotes_rls on public.quotes;
 drop policy if exists deliveries_rls on public.deliveries;
 drop policy if exists pos_rls on public.pos;
 drop policy if exists change_orders_rls on public.change_orders;
 drop policy if exists expenses_rls on public.expenses;
 drop policy if exists suppliers_rls on public.suppliers;
 drop policy if exists events_select on public.events;
 drop policy if exists events_insert on public.events;

-- Jobs
create policy jobs_select on public.jobs
  for select using (company_id = public.auth_company_id() or company_id = public.demo_company_id());
create policy jobs_mod on public.jobs
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

-- Quotes (bids)
create policy quotes_select on public.quotes
  for select using (company_id = public.auth_company_id() or company_id = public.demo_company_id());
create policy quotes_mod on public.quotes
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

-- Deliveries
create policy deliveries_select on public.deliveries
  for select using (company_id = public.auth_company_id() or company_id = public.demo_company_id());
create policy deliveries_mod on public.deliveries
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

-- POs
create policy pos_select on public.pos
  for select using (company_id = public.auth_company_id() or company_id = public.demo_company_id());
create policy pos_mod on public.pos
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

-- Change Orders
create policy change_orders_select on public.change_orders
  for select using (company_id = public.auth_company_id() or company_id = public.demo_company_id());
create policy change_orders_mod on public.change_orders
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

-- Expenses
create policy expenses_select on public.expenses
  for select using (company_id = public.auth_company_id() or company_id = public.demo_company_id());
create policy expenses_mod on public.expenses
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

-- Suppliers (contractors)
create policy suppliers_select on public.suppliers
  for select using (company_id = public.auth_company_id() or company_id = public.demo_company_id());
create policy suppliers_mod on public.suppliers
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

-- Events: select only for demo or own company; insert only by auth company (keep original behavior)
create policy events_select_demo on public.events
  for select using (company_id = public.auth_company_id() or company_id = public.demo_company_id());
create policy events_insert on public.events
  for insert with check (company_id = public.auth_company_id());

commit;
-- Down (manual): drop new policies & is_demo column if desired.
