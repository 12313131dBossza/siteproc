-- ORDERS-RLS-POLICIES.sql
-- Purpose: Enable and define RLS policies for public.purchase_orders (and order_items if present).

begin;

-- Enable RLS on purchase_orders
alter table if exists public.purchase_orders enable row level security;

-- Drop existing policies (safe best-effort)
do $$
declare r record;
begin
  for r in (
    select policyname from pg_policies where schemaname='public' and tablename='purchase_orders'
  ) loop
    execute format('drop policy if exists %I on public.purchase_orders;', r.policyname);
  end loop;
end $$;

-- SELECT: Company members can view company orders or ones they created
create policy orders_select_company on public.purchase_orders
for select to authenticated
using (
  company_id = public.profile_company_id(auth.uid())
  or created_by = auth.uid()
);

-- INSERT: Authenticated users can create orders under their company
create policy orders_insert_own on public.purchase_orders
for insert to authenticated
with check (
  created_by = auth.uid()
  and company_id = public.profile_company_id(auth.uid())
);

-- UPDATE: Creator can update while pending; admins/managers can approve/complete
create policy orders_update_creator on public.purchase_orders
for update to authenticated
using (
  created_by = auth.uid() and status in ('draft','pending')
)
with check (
  created_by = auth.uid()
);

-- UPDATE approvals: admins/managers within same company
create policy orders_update_approver on public.purchase_orders
for update to authenticated
using (
  company_id = public.profile_company_id(auth.uid())
  and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner','manager','bookkeeper')
  )
)
with check (
  company_id = public.profile_company_id(auth.uid())
);

-- DELETE: Only creator for draft, or admin
create policy orders_delete_own on public.purchase_orders
for delete to authenticated
using (
  (created_by = auth.uid() and status = 'draft')
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner'))
);

-- If order_items table exists, add visibility tied to parent order
do $$
declare 
  r_item record;
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='order_items') then
    alter table public.order_items enable row level security;
    
    -- Drop existing policies
    for r_item in (select policyname from pg_policies where schemaname='public' and tablename='order_items') loop
      execute format('drop policy if exists %I on public.order_items;', r_item.policyname);
    end loop;
    
    -- SELECT: visible if parent order is visible
    execute 'create policy order_items_select on public.order_items for select to authenticated using (exists (select 1 from public.purchase_orders po where po.id = order_items.order_id and (po.company_id = public.profile_company_id(auth.uid()) or po.created_by = auth.uid())))';
    
    -- INSERT/UPDATE/DELETE: match parent visibility
    execute 'create policy order_items_insert on public.order_items for insert to authenticated with check (exists (select 1 from public.purchase_orders po where po.id = order_items.order_id and (po.company_id = public.profile_company_id(auth.uid()) or po.created_by = auth.uid())))';
    execute 'create policy order_items_update on public.order_items for update to authenticated using (exists (select 1 from public.purchase_orders po where po.id = order_items.order_id and (po.company_id = public.profile_company_id(auth.uid()) or po.created_by = auth.uid())))';
    execute 'create policy order_items_delete on public.order_items for delete to authenticated using (exists (select 1 from public.purchase_orders po where po.id = order_items.order_id and (po.company_id = public.profile_company_id(auth.uid()) or po.created_by = auth.uid())))';
  end if;
exception when others then
  raise notice 'order_items RLS setup skipped: %', SQLERRM;
end $$;

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
