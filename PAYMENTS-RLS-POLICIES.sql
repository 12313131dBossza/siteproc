-- PAYMENTS-RLS-POLICIES.sql
-- Purpose: Enable and define RLS policies for public.payments

begin;

-- Enable RLS on payments
alter table if exists public.payments enable row level security;

-- Drop existing policies (safe best-effort)
do $$
declare r record;
begin
  for r in (
    select policyname from pg_policies where schemaname='public' and tablename='payments'
  ) loop
    execute format('drop policy if exists %I on public.payments;', r.policyname);
  end loop;
end $$;

-- SELECT: Company members can view company payments
create policy payments_select_company on public.payments
for select to authenticated
using (
  company_id = public.profile_company_id(auth.uid())
);

-- INSERT: Admins, owners, managers, bookkeepers, accountants can create payments
create policy payments_insert_authorized on public.payments
for insert to authenticated
with check (
  company_id = public.profile_company_id(auth.uid())
  and exists (
    select 1 from public.profiles p 
    where p.id = auth.uid() 
    and p.role in ('admin','owner','manager','bookkeeper','accountant')
  )
);

-- UPDATE: Creator can update while unpaid/pending; admins/bookkeepers/accountants can approve
create policy payments_update_creator on public.payments
for update to authenticated
using (
  company_id = public.profile_company_id(auth.uid())
  and created_by = auth.uid() 
  and status in ('unpaid','pending')
)
with check (
  company_id = public.profile_company_id(auth.uid())
  and created_by = auth.uid()
);

-- UPDATE approvals: admins/bookkeepers/accountants within same company
create policy payments_update_approver on public.payments
for update to authenticated
using (
  company_id = public.profile_company_id(auth.uid())
  and exists (
    select 1 from public.profiles p 
    where p.id = auth.uid() 
    and p.role in ('admin','owner','bookkeeper','accountant')
  )
)
with check (
  company_id = public.profile_company_id(auth.uid())
);

-- DELETE: Only admins/owners
create policy payments_delete_admin on public.payments
for delete to authenticated
using (
  company_id = public.profile_company_id(auth.uid())
  and exists (
    select 1 from public.profiles p 
    where p.id = auth.uid() 
    and p.role in ('admin','owner')
  )
);

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
