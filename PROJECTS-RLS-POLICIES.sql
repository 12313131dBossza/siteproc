-- PROJECTS-RLS-POLICIES.sql
-- Purpose: Enable and define RLS policies for public.projects

begin;

-- Enable RLS on projects
alter table if exists public.projects enable row level security;

-- Drop existing policies (safe best-effort)
do $$
declare r record;
begin
  for r in (
    select policyname from pg_policies where schemaname='public' and tablename='projects'
  ) loop
    execute format('drop policy if exists %I on public.projects;', r.policyname);
  end loop;
end $$;

-- SELECT: Company members can view company projects or ones they created
create policy projects_select_company on public.projects
for select to authenticated
using (
  company_id = public.profile_company_id(auth.uid())
  or created_by = auth.uid()
);

-- INSERT: Authenticated users can create projects under their company
create policy projects_insert_own on public.projects
for insert to authenticated
with check (
  created_by = auth.uid()
  and company_id = public.profile_company_id(auth.uid())
);

-- UPDATE: Creator can update, admins/managers/owners can update within company
create policy projects_update_own on public.projects
for update to authenticated
using (
  company_id = public.profile_company_id(auth.uid())
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
  company_id = public.profile_company_id(auth.uid())
);

-- DELETE: Only creator or admin/owner
create policy projects_delete_own on public.projects
for delete to authenticated
using (
  company_id = public.profile_company_id(auth.uid())
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
