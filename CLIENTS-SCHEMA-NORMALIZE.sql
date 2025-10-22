-- CLIENTS-SCHEMA-NORMALIZE.sql
-- Purpose: Normalize clients table with company isolation

begin;

-- Add columns
alter table if exists public.clients add column if not exists company_id uuid references public.companies(id);
alter table if exists public.clients add column if not exists created_by uuid references auth.users(id);
alter table if exists public.clients add column if not exists updated_at timestamptz default now();

-- Ensure status
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='clients' and column_name='status') then
    alter table public.clients add column status text default 'active';
  end if;
  alter table public.clients drop constraint if exists clients_status_check;
  alter table public.clients add constraint clients_status_check check (status in ('active','inactive','suspended'));
end $$;

-- Trigger
drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at before update on public.clients for each row execute function public.set_updated_at();

-- Indexes
create index if not exists idx_clients_company on public.clients(company_id);
create index if not exists idx_clients_status on public.clients(status);

commit;
notify pgrst, 'reload schema';
