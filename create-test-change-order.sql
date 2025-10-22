-- Create a test change order with correct IDs
insert into public.change_orders (
  job_id,
  description,
  cost_delta,
  status,
  company_id,
  created_by,
  approver_email
) values (
  '38957c41-548c-4c85-88db-d637162213ed', -- Website Development project
  'Additional feature requirements - new payment gateway integration',
  3500.00,
  'pending'::co_status,
  'e39d2f43-c6b7-4d87-bc88-9979448447c8', -- Your actual company_id
  '12bba0f7-32fd-4784-a4ae-4f6defcd77e8', -- Your user_id
  'admin@example.com'
);

-- Verify it was created
select 
  id,
  description,
  cost_delta,
  status,
  created_at
from public.change_orders
order by created_at desc
limit 1;
