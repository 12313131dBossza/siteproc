-- BACKFILL-CHANGE-ORDERS.sql
-- Purpose: Backfill existing change_orders rows to match normalized schema.

begin;

-- 1) If company_id is null, infer from profiles via created_by
update public.change_orders co
set company_id = p.company_id
from public.profiles p
where co.company_id is null and co.created_by = p.id;

-- 2) Default status to 'pending' when null
update public.change_orders set status = 'pending' where status is null;

-- 3) Set updated_at to created_at if null
update public.change_orders set updated_at = created_at where updated_at is null;

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
