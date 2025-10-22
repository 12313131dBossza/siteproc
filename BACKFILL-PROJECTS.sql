-- BACKFILL-PROJECTS.sql
-- Purpose: Backfill missing data for projects table

begin;

-- Backfill created_by from first admin/owner user in same company if null
update public.projects p
set created_by = (
  select pr.id 
  from public.profiles pr 
  where pr.company_id = p.company_id 
  and pr.role in ('admin', 'owner')
  limit 1
)
where p.created_by is null;

-- Default status to 'active' if missing
update public.projects
set status = 'active'
where status is null or status = '';

-- Set updated_at to created_at if missing
update public.projects
set updated_at = created_at
where updated_at is null;

-- Initialize budget to 0 if null
update public.projects
set budget = 0
where budget is null;

-- Initialize actuals columns to 0 if null
update public.projects
set actual_cost = 0
where actual_cost is null;

update public.projects
set orders_total = 0
where orders_total is null;

update public.projects
set expenses_total = 0
where expenses_total is null;

update public.projects
set deliveries_total = 0
where deliveries_total is null;

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
