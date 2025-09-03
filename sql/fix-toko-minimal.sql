-- Minimal fix for Toko page - avoid touching complex RLS system
-- Run this in Supabase SQL Editor

-- Step 1: Create missing orders table only
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  qty integer not null check (qty > 0),
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz
);

-- Enable RLS on orders table
alter table public.orders enable row level security;

-- Step 2: Create simple orders policies (no complex dependencies)
drop policy if exists orders_select_own on public.orders;
drop policy if exists orders_insert_own on public.orders;
drop policy if exists orders_admin_all on public.orders;

-- Simple policy: users can see and create their own orders
create policy orders_user_access on public.orders
  for all using (user_id = auth.uid()) 
  with check (user_id = auth.uid());

-- Step 3: Make sure products policies allow basic read access
drop policy if exists products_select_all on public.products;
create policy products_select_all on public.products
  for select using (true);

-- Step 4: Add sample data if products table is empty
insert into public.products (name, sku, category, price, stock, unit) 
select * from (values
  ('Steel Rebar 12mm', 'RB-12MM', 'Materials', 15.50, 100, 'pcs'),
  ('Concrete Mix 50kg', 'CM-50KG', 'Materials', 8.75, 50, 'bags'),
  ('Safety Helmet', 'SH-001', 'Safety', 25.00, 20, 'pcs'),
  ('Work Gloves', 'WG-001', 'Safety', 12.00, 30, 'pairs'),
  ('Drill Bit Set', 'DB-SET', 'Tools', 45.00, 15, 'sets')
) as v(name, sku, category, price, stock, unit)
where not exists (select 1 from public.products limit 1);

-- Step 5: Verify the fix
select 'Minimal Toko fix applied!' as status;
select 'Orders table: ' || case when exists (select 1 from information_schema.tables where table_name = 'orders') then 'CREATED ✅' else 'MISSING ❌' end;
select 'Products count: ' || count(*)::text from public.products;
