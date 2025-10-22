-- Check what company_id your profile has
select id, email, company_id, role from public.profiles 
where id = '12bba0f7-32fd-4784-a4ae-4f6defcd77e8';

-- Check if the change order has the RIGHT company_id
select id, company_id, description, status, created_by
from public.change_orders
order by created_at desc limit 1;

-- Try to query it the way the API does (this will show if RLS is blocking)
-- This simulates what happens when the API runs
select 
  id, description, status, cost_delta,
  created_at, created_by, company_id
from public.change_orders
where company_id = 'e39d2f43-c6b7-4d87-bc88-9979448447c8'
  and status = 'pending'
order by created_at desc;
