-- Fix profiles RLS to allow service role updates
-- Run this in Supabase SQL Editor

-- Drop existing conflicting policies
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_modify on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_read_same_company on public.profiles;
drop policy if exists profiles_admin_update_roles on public.profiles;

-- Create simplified, non-conflicting policies
-- Allow users to read their own profile and others in same company
create policy "profiles_select_own_and_company" on public.profiles
  for select using (
    id = auth.uid() or 
    company_id = (select company_id from public.profiles where id = auth.uid())
  );

-- Allow users to insert their own profile
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

-- Allow users to update their own profile
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) 
  with check (id = auth.uid());

-- Allow admins to update profiles in their company
create policy "profiles_admin_update" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() 
      and p.role = 'admin' 
      and p.company_id = public.profiles.company_id
    )
  );

-- Test the manual update to verify DB path works
-- Replace 'YOUR_USER_ID' with your actual auth user ID
-- UPDATE public.profiles 
-- SET company_id = '1e2e7ccf-29fa-4511-b0d3-93c8347ead33' 
-- WHERE id = 'YOUR_USER_ID';
