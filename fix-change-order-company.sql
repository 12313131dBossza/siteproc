-- Get YOUR profile company_id
select id, email, company_id, role 
from public.profiles 
where id = '12bba0f7-32fd-4784-a4ae-4f6defcd77e8';

-- If your profile's company_id doesn't match 'e39d2f43-c6b7-4d87-bc88-9979448447c8',
-- then update the change orders to use YOUR company_id:
update public.change_orders 
set company_id = (
  select company_id from public.profiles 
  where id = '12bba0f7-32fd-4784-a4ae-4f6defcd77e8'
)
where id in (
  'bd24826e-ae72-4f97-9698-9307c3b22394',
  '9ee2fd0f-6fd4-4780-8741-ab6860524293'
);

-- Verify the update
select id, company_id, description, status
from public.change_orders
order by created_at desc;
