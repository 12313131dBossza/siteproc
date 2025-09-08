-- Change Orders schema, view, and RLS policies

-- Safe cast utility (avoids errors when converting text to uuid)
create or replace function public.try_cast_uuid(val text)
returns uuid
language plpgsql immutable as $$
begin
  return val::uuid;
exception when others then
  return null;
end; $$;

-- Helper: admin check based on profiles table
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin')
  );
$$;

-- Table
create table if not exists public.change_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  proposed_qty numeric(12,2) not null check (proposed_qty > 0),
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  decided_by uuid null references auth.users(id),
  decided_at timestamptz null,
  company_id uuid not null
);

-- If the table already existed from a previous iteration, ensure required columns/constraints exist
alter table public.change_orders add column if not exists order_id uuid;
alter table public.change_orders add column if not exists proposed_qty numeric(12,2);
alter table public.change_orders add column if not exists reason text;
alter table public.change_orders add column if not exists status text;
alter table public.change_orders alter column status set default 'pending';
alter table public.change_orders add column if not exists created_by uuid;
alter table public.change_orders add column if not exists created_at timestamptz;
alter table public.change_orders alter column created_at set default now();
alter table public.change_orders add column if not exists decided_by uuid;
alter table public.change_orders add column if not exists decided_at timestamptz;
alter table public.change_orders add column if not exists company_id uuid;

-- Backfill constraints if missing
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'co_status_chk') then
    alter table public.change_orders
      add constraint co_status_chk check (status in ('pending','approved','rejected'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fk_change_orders_order') then
    alter table public.change_orders
      add constraint fk_change_orders_order foreign key (order_id) references public.orders(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fk_change_orders_created_by') then
    alter table public.change_orders
      add constraint fk_change_orders_created_by foreign key (created_by) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fk_change_orders_decided_by') then
    alter table public.change_orders
      add constraint fk_change_orders_decided_by foreign key (decided_by) references auth.users(id);
  end if;
end $$;

-- View: delivered totals computed from delivery_items quantities via deliveries → items
create or replace view public.order_delivery_totals as
select
  o.id as order_id,
  o.qty as ordered_qty,
  coalesce(sum(di.quantity), 0)::numeric(12,2) as delivered_qty,
  (o.qty - coalesce(sum(di.quantity), 0))::numeric(12,2) as remaining_qty
from public.orders o
left join public.deliveries d
  on (public.try_cast_uuid(d.order_id) = o.id or d.job_id = o.id)
left join public.delivery_items di on di.delivery_id = d.id
group by o.id, o.qty;

-- RLS
alter table public.change_orders enable row level security;

-- Policies: drop/create for idempotency (CREATE POLICY lacks IF NOT EXISTS)
drop policy if exists change_orders_select_company on public.change_orders;
create policy change_orders_select_company
on public.change_orders
for select to authenticated
using (
  company_id = (select company_id from public.profiles where id = auth.uid())
);

drop policy if exists change_orders_insert_company on public.change_orders;
create policy change_orders_insert_company
on public.change_orders
for insert to authenticated
with check (
  company_id = (select company_id from public.profiles where id = auth.uid())
);

drop policy if exists change_orders_admin_update on public.change_orders;
create policy change_orders_admin_update
on public.change_orders
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists change_orders_admin_delete on public.change_orders;
create policy change_orders_admin_delete
on public.change_orders
for delete to authenticated
using (public.is_admin());

-- Helpful indexes
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'change_orders' and column_name = 'order_id'
  ) then
    create index if not exists idx_change_orders_order on public.change_orders(order_id);
  end if;
end $$;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'change_orders' and column_name = 'company_id'
  ) then
    create index if not exists idx_change_orders_company on public.change_orders(company_id);
  end if;
end $$;
