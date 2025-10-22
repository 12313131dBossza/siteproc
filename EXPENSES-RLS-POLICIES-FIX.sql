-- EXPENSES-RLS-POLICIES-FIX.sql
-- Purpose: Avoid subselect on profiles inside policies (which can be blocked by RLS)
-- by using a SECURITY DEFINER helper function to fetch the user's company_id.

begin;

-- 1) Helper function to return company_id for a given user (bypasses RLS on profiles)
create or replace function public.profile_company_id(uid uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select p.company_id from public.profiles p where p.id = uid
$$;

-- Ensure execution rights
grant execute on function public.profile_company_id(uuid) to authenticated, anon;

-- 2) Recreate policies to use the helper function
-- Drop specific policies if they exist
drop policy if exists exp_select_company on public.expenses;
drop policy if exists exp_insert_own on public.expenses;
drop policy if exists exp_update_creator on public.expenses;
drop policy if exists exp_update_approver on public.expenses;

-- SELECT: allow company expenses or ones created by the user
create policy exp_select_company on public.expenses
for select to authenticated
using (
  company_id = public.profile_company_id(auth.uid())
  or user_id = auth.uid()
);

-- INSERT: creator can insert into their own company
create policy exp_insert_own on public.expenses
for insert to authenticated
with check (
  user_id = auth.uid() and company_id = public.profile_company_id(auth.uid())
);

-- UPDATE: creator may update while pending
create policy exp_update_creator on public.expenses
for update to authenticated
using (
  user_id = auth.uid() and status = 'pending'
)
with check (
  user_id = auth.uid() and status in ('pending','approved','rejected')
);

-- UPDATE approvals: admins/owners/bookkeepers within same company
create policy exp_update_approver on public.expenses
for update to authenticated
using (
  company_id = public.profile_company_id(auth.uid())
  and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner','bookkeeper')
  )
)
with check (
  company_id = public.profile_company_id(auth.uid())
);

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
