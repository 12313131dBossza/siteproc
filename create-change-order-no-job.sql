-- Make job_id nullable so we can create change orders without a job
alter table public.change_orders alter column job_id drop not null;

-- Now create a change order WITHOUT a job_id
insert into public.change_orders (
  job_id,
  description,
  cost_delta,
  status,
  company_id,
  created_by
) values (
  null, -- No job required
  'Test change order - general cost adjustment',
  2500.00,
  'pending'::co_status,
  'e39d2f43-c6b7-4d87-bc88-9979448447c8'::uuid,
  '12bba0f7-32fd-4784-a4ae-4f6defcd77e8'::uuid
) returning *;

-- If you want to use an actual job, first check what jobs exist:
select id, name from public.jobs limit 5;
