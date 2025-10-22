-- First, let's see ALL companies with full details
select * from public.companies;

-- Check the exact UUID format
select 
  id,
  id::text as id_text,
  pg_typeof(id) as id_type,
  name
from public.companies;

-- Try inserting with the OTHER company_id (the 07dd one)
insert into public.change_orders (
  job_id,
  description,
  cost_delta,
  status,
  company_id,
  created_by
) values (
  null,
  'Test change order - using alternate company',
  2500.00,
  'pending'::co_status,
  '07dd4aa3-d6ff-461f-ae22-0e8316d98903'::uuid,
  '12bba0f7-32fd-4784-a4ae-4f6defcd77e8'::uuid
) returning *;

-- If that doesn't work, let's just drop the FK constraint entirely for now
-- alter table public.change_orders drop constraint change_orders_company_id_fkey;
