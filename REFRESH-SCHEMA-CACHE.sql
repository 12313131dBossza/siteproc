-- 🔄 REFRESH POSTGREST SCHEMA CACHE
-- Run this in Supabase SQL Editor to reload the API schema cache
-- This fixes: "Could not find table in schema cache" errors

-- ==============================================
-- STEP 1: Notify PostgREST to reload schema
-- ==============================================

-- This triggers PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- ==============================================
-- STEP 2: Verify actual database structure
-- ==============================================

-- Check purchase_orders table exists
SELECT 
  '=== PURCHASE_ORDERS TABLE ===' as section,
  COUNT(*) as row_count
FROM purchase_orders;

SELECT 
  '=== PURCHASE_ORDERS COLUMNS ===' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'purchase_orders'
ORDER BY ordinal_position;

-- Check projects table and code column
SELECT 
  '=== PROJECTS TABLE ===' as section,
  COUNT(*) as row_count
FROM projects;

SELECT 
  '=== PROJECTS COLUMNS ===' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'projects'
ORDER BY ordinal_position;

-- Specifically check for 'code' column
SELECT 
  '=== PROJECTS CODE COLUMN ===' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'code'
    ) THEN '✅ code column EXISTS'
    ELSE '❌ code column MISSING - need to add it'
  END as code_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'project_number'
    ) THEN '✅ project_number column EXISTS'
    ELSE '❌ project_number column MISSING'
  END as project_number_status;

-- Check deliveries table and total_amount column
SELECT 
  '=== DELIVERIES TABLE ===' as section,
  COUNT(*) as row_count
FROM deliveries;

SELECT 
  '=== DELIVERIES COLUMNS ===' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'deliveries'
ORDER BY ordinal_position;

-- Specifically check for 'total_amount' column
SELECT 
  '=== DELIVERIES TOTAL_AMOUNT COLUMN ===' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'deliveries' AND column_name = 'total_amount'
    ) THEN '✅ total_amount column EXISTS'
    ELSE '❌ total_amount column MISSING - need to add it'
  END as total_amount_status;

-- ==============================================
-- STEP 3: Add missing columns if needed
-- ==============================================

-- Add code column to projects if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'code'
  ) THEN
    ALTER TABLE projects ADD COLUMN code TEXT;
    RAISE NOTICE '✅ Added code column to projects table';
  ELSE
    RAISE NOTICE '✅ code column already exists in projects';
  END IF;
END $$;

-- Add total_amount column to deliveries if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deliveries' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN total_amount NUMERIC(12,2) DEFAULT 0;
    RAISE NOTICE '✅ Added total_amount column to deliveries table';
  ELSE
    RAISE NOTICE '✅ total_amount column already exists in deliveries';
  END IF;
END $$;

-- ==============================================
-- STEP 4: Reload schema cache again
-- ==============================================

-- Force reload after schema changes
NOTIFY pgrst, 'reload schema';

-- ==============================================
-- VERIFICATION
-- ==============================================

SELECT 
  '=== FINAL VERIFICATION ===' as section,
  'purchase_orders' as table_name,
  COUNT(*) as row_count,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'purchase_orders') as column_count
FROM purchase_orders
UNION ALL
SELECT 
  '=== FINAL VERIFICATION ===' as section,
  'projects' as table_name,
  COUNT(*) as row_count,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'projects') as column_count
FROM projects
UNION ALL
SELECT 
  '=== FINAL VERIFICATION ===' as section,
  'deliveries' as table_name,
  COUNT(*) as row_count,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'deliveries') as column_count
FROM deliveries;

-- Show success message
SELECT '🎉 Schema cache refreshed! Wait 30 seconds then refresh your Health page.' as message;
