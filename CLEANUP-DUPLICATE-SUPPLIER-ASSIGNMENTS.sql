-- Clean up duplicate/old supplier assignments
-- Run this to fix the issue where multiple assignments exist for the same delivery

-- First, let's see ALL assignments (including duplicates)
SELECT 
  sa.id,
  sa.delivery_id,
  sa.supplier_id,
  sa.status,
  p.full_name as supplier_name,
  p.email as supplier_email
FROM supplier_assignments sa
LEFT JOIN profiles p ON p.id = sa.supplier_id
ORDER BY sa.delivery_id, sa.id DESC;

-- Count assignments per delivery
SELECT delivery_id, COUNT(*) as total_assignments, 
       SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count
FROM supplier_assignments
GROUP BY delivery_id
ORDER BY total_assignments DESC;

-- OPTION 1: Delete ALL assignments and start fresh
-- TRUNCATE TABLE supplier_assignments;

-- OPTION 2: Keep only the most recent assignment per delivery, delete the rest
-- This deletes older rows, keeping only the one with highest id per delivery
DELETE FROM supplier_assignments
WHERE id NOT IN (
  SELECT DISTINCT ON (delivery_id) id
  FROM supplier_assignments
  ORDER BY delivery_id, id DESC
);

-- Verify - each delivery should have at most 1 assignment now
SELECT delivery_id, COUNT(*) as count
FROM supplier_assignments
GROUP BY delivery_id
HAVING COUNT(*) > 1;

-- Show remaining assignments
SELECT 
  sa.id,
  sa.delivery_id,
  sa.supplier_id,
  sa.status,
  p.full_name as supplier_name,
  p.email as supplier_email
FROM supplier_assignments sa
LEFT JOIN profiles p ON p.id = sa.supplier_id
ORDER BY sa.delivery_id;
