-- Complete Orders System Setup for Supabase
-- This creates products table with basic policies (no profiles dependency)
-- Run this FIRST, then run orders-schema.sql

-- 1. Create products table (simplified, no profiles dependency)
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

-- Enable RLS on products
alter table public.products enable row level security;

-- 2. Create basic products RLS policies (no profiles dependency)
drop policy if exists products_select_all on public.products;
create policy products_select_all on public.products
  for select using (true);

drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for all using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- 3. Add sample products data
insert into public.products (name, sku, category, price, stock, unit) values
  ('Steel Rebar 12mm', 'RB-12MM', 'Materials', 15.50, 100, 'pcs'),
  ('Concrete Mix 50kg', 'CM-50KG', 'Materials', 8.75, 50, 'bags'),
  ('Safety Helmet', 'SH-001', 'Safety', 25.00, 20, 'pcs'),
  ('Work Gloves', 'WG-001', 'Safety', 12.00, 30, 'pairs'),
  ('Drill Bit Set', 'DB-SET', 'Tools', 45.00, 15, 'sets'),
  ('Hammer', 'HAM-001', 'Tools', 35.00, 25, 'pcs'),
  ('Safety Vest', 'SV-001', 'Safety', 18.00, 40, 'pcs'),
  ('Measuring Tape', 'MT-001', 'Tools', 22.00, 20, 'pcs')
on conflict do nothing;

-- 4. Verification
select 'Products table created successfully!' as status;
select 'Products count: ' || count(*)::text as info from public.products;
