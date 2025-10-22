-- PRODUCTS-RLS-POLICIES.sql
-- Purpose: Enable and define RLS policies for public.products

begin;

-- Enable RLS on products
alter table if exists public.products enable row level security;

-- Drop existing policies (safe best-effort)
do $$
declare r record;
begin
  for r in (
    select policyname from pg_policies where schemaname='public' and tablename='products'
  ) loop
    execute format('drop policy if exists %I on public.products;', r.policyname);
  end loop;
end $$;

-- SELECT: Company members can view company products
create policy products_select_company on public.products
for select to authenticated
using (
  company_id = public.profile_company_id(auth.uid())
  or company_id is null  -- Allow viewing products without company (shared/global products)
);

-- INSERT: Authenticated users can create products under their company
create policy products_insert_own on public.products
for insert to authenticated
with check (
  created_by = auth.uid()
  and (
    company_id = public.profile_company_id(auth.uid())
    or company_id is null
  )
);

-- UPDATE: Creator can update, admins/managers/owners can update within company
create policy products_update_own on public.products
for update to authenticated
using (
  (company_id = public.profile_company_id(auth.uid()) or company_id is null)
  and (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() 
      and p.role in ('admin','owner','manager')
    )
  )
)
with check (
  (company_id = public.profile_company_id(auth.uid()) or company_id is null)
);

-- DELETE: Only creator or admin/owner
create policy products_delete_own on public.products
for delete to authenticated
using (
  (company_id = public.profile_company_id(auth.uid()) or company_id is null)
  and (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() 
      and p.role in ('admin','owner')
    )
  )
);

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
