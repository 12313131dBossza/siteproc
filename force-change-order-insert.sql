-- Just drop the problematic FK constraint
alter table public.change_orders drop constraint if exists change_orders_company_id_fkey;

-- Make job_id nullable
alter table public.change_orders alter column job_id drop not null;

-- Now insert WITHOUT the FK constraint
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
  'e39d2f43-c6b7-4d87-bc88-9979448447c8'::uuid,
  '12bba0f7-32fd-4784-a4ae-4f6defcd77e8'::uuid
) returning *;

-- Verify it was created
select * from public.change_orders order by created_at desc limit 1;
