-- MAKE-DELIVERIES-JOB-ID-OPTIONAL.sql
-- Purpose: Allow creating deliveries without a job reference by making deliveries.job_id nullable.
-- This keeps the existing foreign key (if present) so valid job_id values are still enforced when provided.
-- Safe to run multiple times.

BEGIN;

-- 1) Make job_id nullable (no-op if already nullable)
ALTER TABLE public.deliveries
  ALTER COLUMN job_id DROP NOT NULL;

-- 2) OPTIONAL: If you continue to hit FK errors and want to temporarily relax the FK, uncomment below.
--    Re-enable later once your UI/API reliably supplies a valid job_id.
-- ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_job_id_fkey;

COMMIT;

-- 3) Refresh PostgREST schema cache so the API reflects the change immediately
NOTIFY pgrst, 'reload schema';

-- 4) Show the current status of the column
SELECT 
  'DELIVERIES_JOB_ID_INFO' AS section,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'deliveries' AND c.column_name = 'job_id';
