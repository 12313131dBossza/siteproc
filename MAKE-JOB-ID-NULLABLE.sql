-- Make job_id nullable in expenses table
-- This allows creating expenses without requiring a job reference

alter table public.expenses 
  alter column job_id drop not null;

-- Verify the change
select column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public' 
  and table_name = 'expenses'
  and column_name = 'job_id';
