-- BACKFILL-ORDERS.sql
-- Purpose: Backfill missing data for purchase_orders table

begin;

-- Backfill company_id from creator's profile
update public.purchase_orders po
set company_id = p.company_id
from public.profiles p
where po.created_by = p.id
  and po.company_id is null;

-- Default status to 'pending' if missing
update public.purchase_orders
set status = 'pending'
where status is null or status = '';

-- Set updated_at to created_at if missing
update public.purchase_orders
set updated_at = created_at
where updated_at is null;

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
