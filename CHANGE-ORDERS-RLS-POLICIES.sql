-- CHANGE-ORDERS-RLS-POLICIES.sql
-- Purpose: Enable and define RLS policies for public.change_orders.

begin;

-- Enable RLS
alter table if exists public.change_orders enable row level security;

-- Drop existing policies (safe best-effort)
do $$
declare r record;
begin
  for r in (
    select policyname from pg_policies where schemaname='public' and tablename='change_orders'
  ) loop
    execute format('drop policy if exists %I on public.change_orders;', r.policyname);
  end loop;
end $$;

-- SELECT: Company members can view company change orders or ones they created
create policy co_select_company on public.change_orders
for select to authenticated
using (
  company_id = public.profile_company_id(auth.uid())
  or created_by = auth.uid()
);

-- INSERT: Authenticated users can create change orders under their company
create policy co_insert_own on public.change_orders
for insert to authenticated
with check (
  created_by = auth.uid()
  and company_id = public.profile_company_id(auth.uid())
);

-- UPDATE: Creator can update while pending; admins/managers can approve/reject
create policy co_update_creator on public.change_orders
for update to authenticated
using (
  created_by = auth.uid() and status = 'pending'
)
with check (
  created_by = auth.uid() and status in ('pending','approved','rejected','completed')
);

-- UPDATE approvals: admins/managers within same company
create policy co_update_approver on public.change_orders
for update to authenticated
using (
  company_id = public.profile_company_id(auth.uid())
  and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner','manager')
  )
)
with check (
  company_id = public.profile_company_id(auth.uid())
);

-- DELETE: Only service role or admin policy (omit by default for safety)

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
