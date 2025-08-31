-- Toko Module: Products and Orders
-- Run this in Supabase SQL Editor

-- Create products table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  category text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  price numeric(12,2) default 0 not null,
  stock integer default 0 not null,
  unit text default 'pcs',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
alter table public.products enable row level security;

-- Create order status enum
create type if not exists public.order_status as enum ('pending','approved','rejected');

-- Create orders table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  qty integer not null check (qty > 0),
  note text,
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz
);
alter table public.orders enable row level security;

-- RLS Policies for products
create policy "products_select_all" on public.products
  for select using (true);

create policy "products_admin_write" on public.products
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','admin'))
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','admin'))
  );

-- RLS Policies for orders
-- Users can see their own orders
create policy "orders_select_own" on public.orders
  for select using (user_id = auth.uid());

-- Admins can see all orders  
create policy "orders_select_admin" on public.orders
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','admin'))
  );

-- Users can create their own orders
create policy "orders_insert_own" on public.orders
  for insert with check (user_id = auth.uid());

-- Admins can update any order (approve/reject)
create policy "orders_admin_update" on public.orders
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','admin'))
  );

-- Insert some sample data for testing (optional)
insert into public.products (name, sku, category, price, stock, unit) values
  ('Steel Rebar 12mm', 'RB-12MM', 'Materials', 15.50, 100, 'pcs'),
  ('Concrete Mix 50kg', 'CM-50KG', 'Materials', 8.75, 50, 'bags'),
  ('Safety Helmet', 'SH-001', 'Safety', 25.00, 20, 'pcs'),
  ('Work Gloves', 'WG-001', 'Safety', 12.00, 30, 'pairs'),
  ('Drill Bit Set', 'DB-SET', 'Tools', 45.00, 15, 'sets')
on conflict do nothing;
