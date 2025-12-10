-- Clean up duplicate active supplier assignments
-- This script keeps only the most recent active assignment per delivery

-- First, let's see duplicates
SELECT delivery_id, COUNT(*) as count
FROM supplier_assignments
WHERE status = 'active'
GROUP BY delivery_id
HAVING COUNT(*) > 1;

-- Deactivate older duplicates, keeping only the most recent one per delivery
WITH ranked AS (
  SELECT 
    id,
    delivery_id,
    supplier_id,
    status,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY delivery_id ORDER BY created_at DESC) as rn
  FROM supplier_assignments
  WHERE status = 'active'
)
UPDATE supplier_assignments
SET status = 'inactive'
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- Verify cleanup - should return 0 rows
SELECT delivery_id, COUNT(*) as count
FROM supplier_assignments
WHERE status = 'active'
GROUP BY delivery_id
HAVING COUNT(*) > 1;

-- Show current active assignments
SELECT 
  sa.id,
  sa.delivery_id,
  sa.supplier_id,
  sa.status,
  sa.created_at,
  p.full_name as supplier_name,
  p.email as supplier_email
FROM supplier_assignments sa
LEFT JOIN profiles p ON p.id = sa.supplier_id
WHERE sa.status = 'active'
ORDER BY sa.created_at DESC;
