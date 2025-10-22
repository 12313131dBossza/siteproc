-- 🔍 DELIVERY SCHEMA CONSTRAINTS & NULL AUDIT
-- This script inspects NOT NULL constraints, FK constraints, and counts NULLs per column

-- 1) Show deliveries table columns with nullability and defaults
SELECT 
  'DELIVERIES' as table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'deliveries'
ORDER BY c.ordinal_position;

-- 2) Show delivery_items table columns
SELECT 
  'DELIVERY_ITEMS' as table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'delivery_items'
ORDER BY c.ordinal_position;

-- 3) List constraints on deliveries (including NOT NULL, PK, FK)
SELECT 
  tc.constraint_type,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public' AND tc.table_name = 'deliveries'
ORDER BY tc.constraint_type, kcu.ordinal_position;

-- 4) List constraints on delivery_items
SELECT 
  tc.constraint_type,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public' AND tc.table_name = 'delivery_items'
ORDER BY tc.constraint_type, kcu.ordinal_position;

-- 5) Count NULLs per column (deliveries)
WITH cols AS (
  SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='deliveries'
)
SELECT 
  'DELIVERIES_NULLS' as section,
  column_name,
  (SELECT COUNT(*) FROM deliveries WHERE (CASE WHEN column_name = 'id' THEN id IS NULL ELSE (
    CASE 
      WHEN column_name = 'delivery_date' THEN delivery_date IS NULL
      WHEN column_name = 'status' THEN status IS NULL
      WHEN column_name = 'order_uuid' THEN order_uuid IS NULL
      WHEN column_name = 'order_id' THEN order_id IS NULL
      WHEN column_name = 'driver_name' THEN driver_name IS NULL
      WHEN column_name = 'vehicle_number' THEN vehicle_number IS NULL
      WHEN column_name = 'notes' THEN notes IS NULL
      WHEN column_name = 'total_amount' THEN total_amount IS NULL
      WHEN column_name = 'created_by' THEN created_by IS NULL
      WHEN column_name = 'company_id' THEN company_id IS NULL
      WHEN column_name = 'proof_urls' THEN proof_urls IS NULL
      WHEN column_name = 'created_at' THEN created_at IS NULL
      WHEN column_name = 'updated_at' THEN updated_at IS NULL
      WHEN column_name = 'job_id' THEN job_id IS NULL
      ELSE NULL
    END
  ) END)) AS null_count
FROM cols;

-- 6) Count NULLs per column (delivery_items)
WITH cols AS (
  SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='delivery_items'
)
SELECT 
  'DELIVERY_ITEMS_NULLS' as section,
  column_name,
  (SELECT COUNT(*) FROM delivery_items WHERE (CASE WHEN column_name = 'id' THEN id IS NULL ELSE (
    CASE 
      WHEN column_name = 'delivery_id' THEN delivery_id IS NULL
      WHEN column_name = 'product_name' THEN product_name IS NULL
      WHEN column_name = 'quantity' THEN quantity IS NULL
      WHEN column_name = 'unit' THEN unit IS NULL
      WHEN column_name = 'unit_price' THEN unit_price IS NULL
      WHEN column_name = 'total_price' THEN total_price IS NULL
      WHEN column_name = 'company_id' THEN company_id IS NULL
      WHEN column_name = 'created_at' THEN created_at IS NULL
      ELSE NULL
    END
  ) END)) AS null_count
FROM cols;

-- 7) Check if deliveries.job_id exists and its constraints
SELECT 
  'DELIVERIES_JOB_ID_INFO' as section,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'deliveries' AND c.column_name = 'job_id';

-- 8) If job_id is NOT NULL or has FK, optionally relax it (manual step)
-- Uncomment one of the following if we confirm job_id should be optional
-- ALTER TABLE deliveries ALTER COLUMN job_id DROP NOT NULL;
-- ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS deliveries_job_id_fkey;

-- 9) Refresh schema cache
NOTIFY pgrst, 'reload schema';
