-- BACKFILL-PAYMENTS.sql
-- Purpose: Backfill missing data for payments table

begin;

-- Backfill created_by from first admin/owner/bookkeeper/accountant in same company if null
update public.payments p
set created_by = (
  select pr.id 
  from public.profiles pr 
  where pr.company_id = p.company_id 
  and pr.role in ('admin', 'owner', 'bookkeeper', 'accountant')
  limit 1
)
where p.created_by is null;

-- Default status to 'unpaid' if missing
update public.payments
set status = 'unpaid'
where status is null or status = '';

-- Set updated_at to created_at if missing
update public.payments
set updated_at = created_at
where updated_at is null;

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
