-- BACKFILL-PRODUCTS.sql
-- Purpose: Backfill missing data for products table

begin;

-- Backfill created_by from first admin/owner user in same company if null
update public.products p
set created_by = (
  select pr.id 
  from public.profiles pr 
  where pr.company_id = p.company_id 
  and pr.role in ('admin', 'owner')
  limit 1
)
where p.created_by is null and p.company_id is not null;

-- Default status to 'active' if missing
update public.products
set status = 'active'
where status is null or status = '';

-- Set updated_at to created_at if missing
update public.products
set updated_at = created_at
where updated_at is null;

-- Initialize stock quantities if null
update public.products
set stock_quantity = 0
where stock_quantity is null;

update public.products
set min_stock_level = 10
where min_stock_level is null;

update public.products
set reorder_point = 15
where reorder_point is null;

update public.products
set reorder_quantity = 50
where reorder_quantity is null;

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
