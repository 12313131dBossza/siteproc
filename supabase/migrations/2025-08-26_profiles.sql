-- Migration: profiles table, trigger, and RLS scaffolding
-- Date: 2025-08-26

-- 1. Profiles table (id aligns with auth.users.id)
create table if not exists public.profiles (
  id uuid primary key,
  email text,
  role text check (role in ('viewer','bookkeeper','manager','admin')),
  company_id uuid references public.companies(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_company_id_idx on public.profiles(company_id);
create index if not exists profiles_role_idx on public.profiles(role);

-- 2. Updated at trigger
create or replace function public.profiles_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;
create trigger if not exists trg_profiles_updated_at before update on public.profiles
for each row execute procedure public.profiles_set_updated_at();

-- 3. New user trigger: insert empty profile after auth signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, role) values (new.id, new.email, 'viewer')
  on conflict (id) do nothing;
  return new;
end;$$;
create trigger if not exists on_auth_user_created
after insert on auth.users for each row execute procedure public.handle_new_user();

-- 4. Helper to resolve company id from JWT or profile
create or replace function public.auth_company_id()
returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'company_id',
    (select company_id::text from public.profiles where id = auth.uid())
  )::uuid;
$$;

-- 5. Enable RLS (if not already)
alter table public.profiles enable row level security;

-- 6. Policies
create policy if not exists profiles_select on public.profiles
  for select using ( id = auth.uid() or company_id = public.auth_company_id() );
create policy if not exists profiles_insert on public.profiles
  for insert with check ( id = auth.uid() ) using ( id = auth.uid() );
create policy if not exists profiles_update_self on public.profiles
  for update using ( id = auth.uid() ) with check ( id = auth.uid() );
