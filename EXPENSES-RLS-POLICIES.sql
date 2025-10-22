-- EXPENSES-RLS-POLICIES.sql
-- Purpose: Enable and define RLS policies for public.expenses to match app expectations.

begin;

-- Enable RLS
alter table if exists public.expenses enable row level security;

-- Drop existing policies that might conflict (safe best-effort)
do $$
declare r record;
begin
  for r in (
    select policyname from pg_policies where schemaname='public' and tablename='expenses'
  ) loop
    execute format('drop policy if exists %I on public.expenses;', r.policyname);
  end loop;
end $$;

-- READ: Company members can SELECT company expenses or ones they created
create policy exp_select_company on public.expenses
for select to authenticated
using (
  company_id in (
    select company_id from public.profiles where id = auth.uid()
  )
  or user_id = auth.uid()
);

-- INSERT: Anyone authenticated can create an expense under their company, and it is attributed to them
create policy exp_insert_own on public.expenses
for insert to authenticated
with check (
  user_id = auth.uid()
  and company_id in (select company_id from public.profiles where id = auth.uid())
);

-- UPDATE: Creator can update while pending; admins/bookkeepers can approve/reject within company
create policy exp_update_creator on public.expenses
for update to authenticated
using (
  user_id = auth.uid() and status = 'pending'
)
with check (
  user_id = auth.uid() and status in ('pending','approved','rejected')
);

-- UPDATE approvals: admins/bookkeepers within same company
create policy exp_update_approver on public.expenses
for update to authenticated
using (
  company_id in (select company_id from public.profiles where id = auth.uid())
  and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner','bookkeeper')
  )
)
with check (
  company_id in (select company_id from public.profiles where id = auth.uid())
);

-- DELETE: Only service role or explicit admin policy (omit by default to be safe)

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
