-- CLIENTS-RLS-POLICIES.sql

begin;

alter table if exists public.clients enable row level security;

do $$
declare r record;
begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='clients') loop
    execute format('drop policy if exists %I on public.clients;', r.policyname);
  end loop;
end $$;

create policy clients_select_company on public.clients for select to authenticated using (company_id = public.profile_company_id(auth.uid()));
create policy clients_insert_own on public.clients for insert to authenticated with check (created_by = auth.uid() and company_id = public.profile_company_id(auth.uid()));
create policy clients_update_own on public.clients for update to authenticated using (company_id = public.profile_company_id(auth.uid()));
create policy clients_delete_admin on public.clients for delete to authenticated using (company_id = public.profile_company_id(auth.uid()) and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','owner')));

commit;
notify pgrst, 'reload schema';
