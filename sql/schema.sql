-- Supabase-compatible schema for siteproc MVP
-- Enable extensions commonly available in Supabase
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type user_role as enum ('owner','admin','foreman','bookkeeper');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rfq_status as enum ('draft','sent','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type quote_status as enum ('submitted','selected','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type po_status as enum ('draft','issued','complete','void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type delivery_status as enum ('pending','partial','delivered');
exception when duplicate_object then null; end $$;

do $$ begin
  create type co_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

-- Companies
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Users (application-level profile, separate from auth.users)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid, -- optional link to auth.users.id
  email text not null,
  role user_role not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists users_company_id_idx on public.users(company_id);

-- Jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text,
  created_at timestamptz not null default now()
);
create index if not exists jobs_company_id_idx on public.jobs(company_id);

-- Cost Codes
create table if not exists public.cost_codes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  code text not null,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists cost_codes_company_job_idx on public.cost_codes(company_id, job_id);

-- Suppliers
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);
create index if not exists suppliers_company_id_idx on public.suppliers(company_id);

-- RFQs
create table if not exists public.rfqs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  title text,
  needed_date date,
  status rfq_status not null default 'draft',
  public_token uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists rfqs_company_job_idx on public.rfqs(company_id, job_id);

-- RFQ Items
create table if not exists public.rfq_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  description text not null,
  qty numeric(14,3) not null default 0,
  unit text,
  sku text,
  created_at timestamptz not null default now()
);
create index if not exists rfq_items_company_rfq_idx on public.rfq_items(company_id, rfq_id);

-- Quotes
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  total numeric(14,2),
  lead_time text,
  terms text,
  status quote_status not null default 'submitted',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists quotes_company_rfq_idx on public.quotes(company_id, rfq_id);

-- PO sequences (per company)
create table if not exists public.po_sequences (
  company_id uuid primary key references public.companies(id) on delete cascade,
  last_number integer not null default 0,
  updated_at timestamptz not null default now()
);

-- POs
create table if not exists public.pos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  rfq_id uuid references public.rfqs(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  po_number text not null,
  total numeric(14,2),
  status po_status not null default 'issued',
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create unique index if not exists pos_company_po_number_unique on public.pos(company_id, po_number);
create index if not exists pos_company_job_idx on public.pos(company_id, job_id);

-- Deliveries
create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  po_id uuid references public.pos(id) on delete set null,
  status delivery_status not null default 'pending',
  delivered_at timestamptz,
  signer_name text,
  signature_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists deliveries_company_job_idx on public.deliveries(company_id, job_id);

-- Delivery Items
create table if not exists public.delivery_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  description text not null,
  qty numeric(14,3) not null default 0,
  unit text,
  sku text,
  partial boolean default false,
  created_at timestamptz not null default now()
);
create index if not exists delivery_items_company_delivery_idx on public.delivery_items(company_id, delivery_id);

-- Change Orders
create table if not exists public.change_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  description text not null,
  cost_delta numeric(14,2) not null default 0,
  status co_status not null default 'pending',
  approver_email text,
  public_token uuid unique,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists change_orders_company_job_idx on public.change_orders(company_id, job_id);

-- Expenses
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  cost_code_id uuid references public.cost_codes(id) on delete set null,
  amount numeric(14,2) not null,
  spent_at date not null,
  memo text,
  receipt_url text,
  created_at timestamptz not null default now()
);
create index if not exists expenses_company_job_idx on public.expenses(company_id, job_id);
create index if not exists expenses_company_job_spent_at_idx on public.expenses(company_id, job_id, spent_at);

-- Photos (generic linkage)
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  entity text, -- e.g., 'delivery' | 'expense'
  entity_id uuid,
  url text not null,
  created_at timestamptz not null default now()
);
create index if not exists photos_company_job_idx on public.photos(company_id, job_id);
create index if not exists photos_company_entity_idx on public.photos(company_id, entity, entity_id);

-- Events (append-only audit)
create table if not exists public.events (
  id bigserial primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid,
  entity text not null,
  entity_id uuid not null,
  verb text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists events_company_entity_idx on public.events(company_id, entity);
create index if not exists events_company_entity_created_at_idx on public.events(company_id, entity, created_at desc);

-- Persistent nonce replay protection (used if available by tokens.ts)
create table if not exists public.nonce_replay (
  nonce text primary key,
  seen_at timestamptz not null default now()
);

-- Persistent rate limiting (key = ip:path window bucket)
create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);

-- Token attempts (public token brute force / lockouts)
create table if not exists public.token_attempts (
  token text primary key,
  count integer not null default 0,
  first_attempt_at timestamptz not null default now(),
  locked_until timestamptz
);

-- Ensure only one active backorder placeholder delivery per PO (notes begins with 'Backorder')
create unique index if not exists deliveries_single_backorder_per_po on public.deliveries(po_id) where notes like 'Backorder%';

-- RPC: next_po_number(company_id) => 'PO-000123'
create or replace function public.next_po_number(p_company_id uuid)
returns text
language plpgsql
as $$
declare
  new_num integer;
begin
  -- upsert + increment atomically
  insert into public.po_sequences(company_id, last_number)
  values (p_company_id, 1)
  on conflict (company_id)
  do update set last_number = public.po_sequences.last_number + 1,
                updated_at = now()
  returning last_number into new_num;

  return 'PO-' || lpad(new_num::text, 6, '0');
end;
$$;
