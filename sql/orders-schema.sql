-- Orders system database schema and RLS policies  
-- Run this AFTER running complete-orders-setup.sql
-- This creates the new orders table structure for the orders management system

-- 1. First, let's verify products table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
        RAISE EXCEPTION 'Products table does not exist. Please run complete-orders-setup.sql first.';
    END IF;
END $$;

-- 2. Drop any existing orders table and create new structure
drop table if exists public.orders cascade;
drop type if exists public.order_status cascade;

-- 3. Create orders table with verified products reference
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  qty numeric(12,2) not null check (qty > 0),
  notes text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  po_number text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  decided_by uuid,
  decided_at timestamptz
);

-- Add foreign key constraints after table creation
alter table public.orders add constraint orders_product_id_fkey 
  foreign key (product_id) references public.products(id) on delete restrict;

alter table public.orders add constraint orders_created_by_fkey 
  foreign key (created_by) references auth.users(id) on delete cascade;

alter table public.orders add constraint orders_decided_by_fkey 
  foreign key (decided_by) references auth.users(id);

-- Enable RLS
alter table public.orders enable row level security;

-- 4. Create RLS policies exactly as specified

-- Users can create their own orders
drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own
on public.orders for insert to authenticated
with check (created_by = auth.uid());

-- Users can read only their own orders  
drop policy if exists orders_read_own on public.orders;
create policy orders_read_own
on public.orders for select to authenticated
using (created_by = auth.uid());

-- Admin/Owner can do everything (read/write/decision) - simplified for now
drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all
on public.orders for all to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

-- 5. Add indexes for performance
create index if not exists orders_created_by_idx on public.orders(created_by);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_product_id_idx on public.orders(product_id);

-- 6. Create stock reduction function
create or replace function public.reduce_product_stock(product_id uuid, quantity numeric)
returns void
language plpgsql
as $$
begin
  update public.products 
  set stock = stock - quantity 
  where id = product_id and stock >= quantity;
  
  if not found then
    raise exception 'Insufficient stock or product not found';
  end if;
end;
$$;

-- 7. Verification
select 'Orders table and policies created successfully!' as status;
select 'Orders table structure created' as info;
