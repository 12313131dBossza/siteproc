-- RLS policies and helpers
create or replace function public.auth_company_id()
returns uuid
language sql
stable
as $$
  -- Prefer explicit JWT claim; fallback to profiles lookup by auth.uid()
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'company_id',
    (select company_id::text from public.profiles where id = auth.uid())
  )::uuid;
$$;

-- Helper functions to map public tokens via header x-public-token
create or replace function public.rfq_id_from_public_token(p_token uuid)
returns uuid
language sql
stable
as $$
  select id from public.rfqs where public_token = p_token;
$$;

create or replace function public.co_id_from_public_token(p_token uuid)
returns uuid
language sql
stable
as $$
  select id from public.change_orders where public_token = p_token;
$$;

-- Enable RLS on all tables
alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.cost_codes enable row level security;
alter table public.suppliers enable row level security;
alter table public.rfqs enable row level security;
alter table public.rfq_items enable row level security;
alter table public.quotes enable row level security;
alter table public.po_sequences enable row level security;
alter table public.pos enable row level security;
alter table public.deliveries enable row level security;
alter table public.delivery_items enable row level security;
alter table public.change_orders enable row level security;
alter table public.expenses enable row level security;
alter table public.photos enable row level security;
alter table public.events enable row level security;

-- Tenant policies (company_id equality)
drop policy if exists companies_rls on public.companies;
create policy companies_rls on public.companies
  for all using (true) with check (true); -- companies may be managed by admins; adjust later if needed

drop policy if exists users_rls on public.users;
create policy users_rls on public.users
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

-- Profiles RLS
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_modify on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid() or company_id = public.auth_company_id()
  );
create policy profiles_modify on public.profiles
  for insert with check (id = auth.uid())
  using (id = auth.uid());
-- Allow user to update their own profile (role changes managed server-side with service key)
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Additional role management hardening
-- Ensure role is constrained to allowed set
alter table public.profiles
  alter column role type text using role::text;
-- (Optional) add a check constraint if not existing
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin','manager','member','viewer'));

-- Prevent demoting/removing the last admin in a company
create or replace function public.prevent_last_admin_loss()
returns trigger
language plpgsql
as $$
declare
  remaining_admins int;
begin
  if TG_OP = 'UPDATE' then
    if OLD.role = 'admin' and NEW.role <> 'admin' then
      select count(*) into remaining_admins from public.profiles where company_id = OLD.company_id and role = 'admin' and id <> OLD.id;
      if remaining_admins = 0 then
        raise exception 'cannot_remove_last_admin';
      end if;
    end if;
  elsif TG_OP = 'DELETE' then
    if OLD.role = 'admin' then
      select count(*) into remaining_admins from public.profiles where company_id = OLD.company_id and role = 'admin' and id <> OLD.id;
      if remaining_admins = 0 then
        raise exception 'cannot_remove_last_admin';
      end if;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_prevent_last_admin_loss on public.profiles;
create trigger trg_prevent_last_admin_loss
before update or delete on public.profiles
for each row execute function public.prevent_last_admin_loss();

-- Broader read access within same company
drop policy if exists profiles_read_same_company on public.profiles;
create policy profiles_read_same_company on public.profiles
  for select using (company_id = public.auth_company_id());

-- Admin-only role updates within same company
drop policy if exists profiles_admin_update_roles on public.profiles;
create policy profiles_admin_update_roles on public.profiles
  for update using (
    company_id = public.auth_company_id() and exists (
      select 1 from public.profiles p2
      where p2.id = auth.uid() and p2.company_id = public.profiles.company_id and p2.role = 'admin'
    )
  ) with check (
    company_id = public.auth_company_id()
  );

drop policy if exists jobs_rls on public.jobs;
create policy jobs_rls on public.jobs
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

drop policy if exists cost_codes_rls on public.cost_codes;
create policy cost_codes_rls on public.cost_codes
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

drop policy if exists suppliers_rls on public.suppliers;
create policy suppliers_rls on public.suppliers
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

drop policy if exists rfqs_rls on public.rfqs;
create policy rfqs_rls on public.rfqs
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

drop policy if exists rfq_items_rls on public.rfq_items;
create policy rfq_items_rls on public.rfq_items
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

drop policy if exists quotes_rls on public.quotes;
create policy quotes_rls on public.quotes
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

drop policy if exists po_sequences_rls on public.po_sequences;
create policy po_sequences_rls on public.po_sequences
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

drop policy if exists pos_rls on public.pos;
create policy pos_rls on public.pos
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

drop policy if exists deliveries_rls on public.deliveries;
create policy deliveries_rls on public.deliveries
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

drop policy if exists delivery_items_rls on public.delivery_items;
create policy delivery_items_rls on public.delivery_items
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

drop policy if exists change_orders_rls on public.change_orders;
create policy change_orders_rls on public.change_orders
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

drop policy if exists expenses_rls on public.expenses;
create policy expenses_rls on public.expenses
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

drop policy if exists photos_rls on public.photos;
create policy photos_rls on public.photos
  for all using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

-- Append-only audit: allow select/insert; no update/delete
drop policy if exists events_rls on public.events;
drop policy if exists events_select on public.events;
drop policy if exists events_insert on public.events;
create policy events_select on public.events
  for select using (company_id = public.auth_company_id());
create policy events_insert on public.events
  for insert with check (company_id = public.auth_company_id());

-- Public access policies via tokens (read/insert limited)
-- Supplier quote submit: allow inserting quotes when rfq token matches header x-public-token
create or replace function public.current_public_token()
returns uuid
language plpgsql
stable
as $$
begin
  return nullif(current_setting('request.headers', true), '')::jsonb->>'x-public-token';
exception when others then
  return null;
end;
$$;

drop policy if exists quotes_public_insert on public.quotes;
create policy quotes_public_insert on public.quotes
  for insert
  to public
  with check (
    exists (
      select 1
      from public.rfqs r
      where r.id = rfq_id
        and r.public_token = public.current_public_token()::uuid
    )
  );

-- CO approval by token: allow update status when token matches
drop policy if exists co_public_update on public.change_orders;
create policy co_public_update on public.change_orders
  for update
  using (
    public_token = public.current_public_token()::uuid
  )
  with check (
    public_token = public.current_public_token()::uuid
  );
