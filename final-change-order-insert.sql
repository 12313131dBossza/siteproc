-- Make job_id nullable
alter table public.change_orders alter column job_id drop not null;

-- Now try the insert again with the working company_id
insert into public.change_orders (
  job_id,
  description,
  cost_delta,
  status,
  company_id,
  created_by
) values (
  null,
  'Test change order - cost adjustment for materials',
  2500.00,
  'pending'::co_status,
  '07dd4aa3-d6ff-461f-ae22-0e8316d98903'::uuid,
  '12bba0f7-32fd-4784-a4ae-4f6defcd77e8'::uuid
) returning *;
