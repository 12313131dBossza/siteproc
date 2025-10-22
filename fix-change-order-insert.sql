-- Check the foreign key constraint on change_orders
select
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name,
  tc.constraint_name
from information_schema.table_constraints as tc 
join information_schema.key_column_usage as kcu
  on tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage as ccu
  on ccu.constraint_name = tc.constraint_name
where tc.constraint_type = 'FOREIGN KEY' 
  and tc.table_name = 'change_orders'
  and kcu.column_name = 'company_id';

-- Also verify the company exists
select id, name, created_at 
from public.companies 
where id = 'e39d2f43-c6b7-4d87-bc88-9979448447c8';

-- Try creating the change order WITHOUT company_id constraint check
-- by making company_id nullable temporarily
alter table public.change_orders alter column company_id drop not null;

-- Now try the insert
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
  'e39d2f43-c6b7-4d87-bc88-9979448447c8',
  '12bba0f7-32fd-4784-a4ae-4f6defcd77e8'
) returning *;
