-- CONTRACTORS-RLS-POLICIES.sql
-- Purpose: Enable RLS for contractors table

begin;

alter table if exists public.contractors enable row level security;

-- Drop existing policies
do $$
declare r record;
begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='contractors') loop
    execute format('drop policy if exists %I on public.contractors;', r.policyname);
  end loop;
end $$;

-- SELECT: Company members can view
create policy contractors_select_company on public.contractors
for select to authenticated
using (company_id = public.profile_company_id(auth.uid()));

-- INSERT: Authenticated users can create
create policy contractors_insert_own on public.contractors
for insert to authenticated
with check (
  created_by = auth.uid()
  and company_id = public.profile_company_id(auth.uid())
);

-- UPDATE: Creator or admin/manager can update
create policy contractors_update_own on public.contractors
for update to authenticated
using (
  company_id = public.profile_company_id(auth.uid())
  and (
    created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner','manager'))
  )
);

-- DELETE: Admin/owner only
create policy contractors_delete_admin on public.contractors
for delete to authenticated
using (
  company_id = public.profile_company_id(auth.uid())
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner'))
);

commit;

notify pgrst, 'reload schema';
