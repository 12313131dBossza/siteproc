-- BACKFILL-CONTRACTORS.sql
-- Purpose: Backfill contractors data

begin;

-- Backfill created_by from first admin/owner
update public.contractors c
set created_by = (
  select pr.id from public.profiles pr 
  where pr.company_id = c.company_id and pr.role in ('admin','owner')
  limit 1
)
where c.created_by is null and c.company_id is not null;

-- Default status
update public.contractors
set status = 'active'
where status is null or status = '';

-- Set updated_at
update public.contractors
set updated_at = created_at
where updated_at is null;

commit;

notify pgrst, 'reload schema';
