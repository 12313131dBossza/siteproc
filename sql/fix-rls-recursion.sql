-- Fix RLS Infinite Recursion Issue
-- Run this in Supabase SQL Editor to fix the profiles table policies

-- 1. Drop the problematic auth_company_id function that causes recursion
drop function if exists public.auth_company_id();

-- 2. Create a simpler version that uses JWT claims only (no profiles lookup)
create or replace function public.auth_company_id()
returns uuid
language sql
stable
as $$
  -- Only use JWT claim, don't query profiles table to avoid recursion
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'company_id'::uuid;
$$;

-- 3. Drop all existing profiles policies
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_modify on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_read_same_company on public.profiles;
drop policy if exists profiles_admin_update_roles on public.profiles;

-- 4. Create simple, non-recursive profiles policies
-- Allow users to see their own profile
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());

-- Allow users to insert their own profile (for onboarding)
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());

-- Allow users to update their own profile  
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Allow users to see profiles in same company (using direct company_id, not function)
create policy profiles_select_company on public.profiles
  for select using (
    -- Get company_id from JWT claims directly, no function call
    company_id = (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'company_id')::uuid
  );

-- 5. Ensure the products/orders tables have simple policies too
-- Products policies (from toko-schema.sql)
drop policy if exists products_select_all on public.products;
drop policy if exists products_admin_write on public.products;

create policy products_select_all on public.products
  for select using (true);

create policy products_admin_write on public.products
  for all using (
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() 
      and p.role in ('owner','admin')
      and p.company_id = (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'company_id')::uuid
    )
  ) with check (
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() 
      and p.role in ('owner','admin')
      and p.company_id = (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'company_id')::uuid
    )
  );

-- Orders policies
drop policy if exists orders_select_own on public.orders;
drop policy if exists orders_select_admin on public.orders;
drop policy if exists orders_insert_own on public.orders;
drop policy if exists orders_admin_update on public.orders;

-- Users can see their own orders
create policy orders_select_own on public.orders
  for select using (user_id = auth.uid());

-- Users can create their own orders
create policy orders_insert_own on public.orders
  for insert with check (user_id = auth.uid());

-- Admins can see and update all orders in their company
create policy orders_admin_all on public.orders
  for all using (
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() 
      and p.role in ('owner','admin')
      and p.company_id = (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'company_id')::uuid
    )
  );

-- 6. Add debugging info
select 'RLS policies fixed - profiles recursion resolved' as status;
