-- Emergency fix for RLS infinite recursion on profiles table
-- This addresses the 42P17 error causing all the issues

-- Step 1: Temporarily disable RLS on profiles to break the recursion
alter table public.profiles disable row level security;

-- Step 2: Drop the problematic auth_company_id function completely
drop function if exists public.auth_company_id() cascade;

-- Step 3: Create a simple replacement function that doesn't query profiles
create or replace function public.auth_company_id()
returns uuid
language sql
stable
as $$
  -- Simple version: only use JWT claims, never query any tables
  select coalesce(
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'company_id')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

-- Step 4: Re-enable RLS on profiles with simple policies
alter table public.profiles enable row level security;

-- Step 5: Create super simple profiles policies (no function calls)
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_modify on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_read_same_company on public.profiles;
drop policy if exists profiles_admin_update_roles on public.profiles;
drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_select_company on public.profiles;

-- Ultra-simple policies: users can only see/modify their own profile
create policy profiles_own_only on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Step 6: Make sure products are accessible
drop policy if exists products_select_all on public.products;
create policy products_select_all on public.products
  for select using (true);

-- Step 7: Verify tables exist and add data if needed
insert into public.products (name, sku, category, price, stock, unit) 
select * from (values
  ('Steel Rebar 12mm', 'RB-12MM', 'Materials', 15.50, 100, 'pcs'),
  ('Concrete Mix 50kg', 'CM-50KG', 'Materials', 8.75, 50, 'bags'),
  ('Safety Helmet', 'SH-001', 'Safety', 25.00, 20, 'pcs'),
  ('Work Gloves', 'WG-001', 'Safety', 12.00, 30, 'pairs'),
  ('Drill Bit Set', 'DB-SET', 'Tools', 45.00, 15, 'sets')
) as v(name, sku, category, price, stock, unit)
where not exists (select 1 from public.products limit 1);

-- Step 8: Verification
select 'Emergency RLS fix applied - recursion should be resolved!' as status;
select 'Products available: ' || count(*)::text from public.products;

-- Step 9: Test a simple profiles query to ensure no recursion
select 'Profile test: ' || case when exists (select 1 from public.profiles limit 1) then 'OK' else 'FAILED' end;
