-- Get the EXACT company record
select * from public.companies where id::text like 'e39d2f43%';

-- Check if there are hidden characters or schema issues
select 
  'e39d2f43-c6b7-4d87-bc88-9979448447c8'::uuid = id as matches,
  id,
  length(id::text) as id_length,
  name
from public.companies;

-- Try dropping and recreating the FK constraint
alter table public.change_orders drop constraint if exists change_orders_company_id_fkey;

-- Recreate it pointing to the right table
alter table public.change_orders 
  add constraint change_orders_company_id_fkey 
  foreign key (company_id) 
  references public.companies(id);

-- Now try the insert again
insert into public.change_orders (
  job_id,
  description,
  cost_delta,
  status,
  company_id,
  created_by
) values (
  '38957c41-548c-4c85-88db-d637162213ed',
  'Test change order - additional requirements',
  3500.00,
  'pending'::co_status,
  'e39d2f43-c6b7-4d87-bc88-9979448447c8'::uuid,
  '12bba0f7-32fd-4784-a4ae-4f6defcd77e8'::uuid
) returning *;
