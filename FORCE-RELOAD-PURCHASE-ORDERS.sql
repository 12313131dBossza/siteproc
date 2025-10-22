-- 🔥 FORCE REFRESH PURCHASE_ORDERS SCHEMA CACHE
-- Run this if /api/purchase_orders still shows "schema cache" error
-- This is a more aggressive reload than the basic NOTIFY command

-- ==============================================
-- STEP 1: Verify table exists
-- ==============================================

SELECT 
  '=== VERIFY purchase_orders TABLE EXISTS ===' as section;

SELECT 
  schemaname,
  tablename,
  tableowner,
  CASE 
    WHEN tablename = 'purchase_orders' THEN '✅ Table EXISTS'
    ELSE '❌ Table NOT FOUND'
  END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'purchase_orders';

-- Show all columns
SELECT 
  '=== ALL COLUMNS IN purchase_orders ===' as section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'purchase_orders'
ORDER BY ordinal_position;

-- Count records
SELECT 
  '=== RECORD COUNT ===' as section,
  COUNT(*) as total_records
FROM purchase_orders;

-- ==============================================
-- STEP 2: Force PostgREST schema reload (Method 1)
-- ==============================================

-- Basic reload
NOTIFY pgrst, 'reload schema';

-- Wait a moment, then reload again
SELECT pg_sleep(2);
NOTIFY pgrst, 'reload schema';

-- ==============================================
-- STEP 3: Grant explicit permissions (fix permission issues)
-- ==============================================

-- Ensure anon and authenticated roles have access
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.purchase_orders TO anon, authenticated;
GRANT INSERT ON public.purchase_orders TO authenticated;
GRANT UPDATE ON public.purchase_orders TO authenticated;
GRANT DELETE ON public.purchase_orders TO authenticated;

-- ==============================================
-- STEP 4: Verify RLS policies exist
-- ==============================================

SELECT 
  '=== RLS POLICIES ON purchase_orders ===' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'purchase_orders';

-- ==============================================
-- STEP 5: Re-enable RLS (this forces cache refresh)
-- ==============================================

-- Disable and re-enable RLS to force PostgREST to re-scan
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 6: Create a simple view (workaround)
-- ==============================================

-- Drop view if exists
DROP VIEW IF EXISTS v_purchase_orders;

-- Create view as alternative access point
CREATE OR REPLACE VIEW v_purchase_orders AS
SELECT 
  id,
  project_id,
  amount,
  description,
  category,
  vendor,
  product_name,
  quantity,
  unit_price,
  status,
  requested_by,
  requested_at,
  approved_by,
  approved_at,
  rejected_by,
  rejected_at,
  rejection_reason,
  created_at,
  updated_at,
  delivery_progress,
  ordered_qty,
  delivered_qty,
  remaining_qty,
  delivered_value
FROM purchase_orders;

-- Grant access to view
GRANT SELECT ON v_purchase_orders TO anon, authenticated;

-- ==============================================
-- STEP 7: Final aggressive reload
-- ==============================================

-- Multiple reloads to ensure it sticks
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';

-- ==============================================
-- STEP 8: Verification
-- ==============================================

SELECT 
  '=== FINAL CHECK ===' as section,
  'purchase_orders' as table_name,
  (SELECT COUNT(*) FROM purchase_orders) as records,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'purchase_orders') as columns,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'purchase_orders') as policies,
  (SELECT tableowner FROM pg_tables WHERE tablename = 'purchase_orders') as owner;

-- Show success message
SELECT 
  '🎉 AGGRESSIVE RELOAD COMPLETE!' as message,
  'Wait 30-60 seconds then refresh your Health page' as next_step,
  'If still failing, try: Supabase Dashboard → Settings → API → Toggle "Auto Schema Detection"' as alternative;
