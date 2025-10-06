-- ============================================
-- FIX RLS POLICIES FOR DELIVERIES
-- This will allow users to see deliveries for their company
-- ============================================

-- 1. Check if RLS is enabled on deliveries table
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('deliveries', 'delivery_items');

-- 2. Show current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('deliveries', 'delivery_items')
ORDER BY tablename, policyname;

-- 3. Drop existing restrictive policies (if they exist)
DROP POLICY IF EXISTS "Users can view deliveries for their company" ON deliveries;
DROP POLICY IF EXISTS "Users can view delivery items for their company" ON delivery_items;

-- 4. Create permissive SELECT policies for deliveries
CREATE POLICY "Users can view their company deliveries"
ON deliveries
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- 5. Create permissive SELECT policies for delivery_items
CREATE POLICY "Users can view their company delivery items"
ON delivery_items
FOR SELECT
TO authenticated
USING (
  delivery_id IN (
    SELECT id FROM deliveries WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- 6. Verify policies were created
SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has conditions'
    ELSE 'No conditions'
  END as has_conditions
FROM pg_policies
WHERE tablename IN ('deliveries', 'delivery_items')
ORDER BY tablename, policyname;

-- 7. Test query as if you were the API (this simulates what the API sees)
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = (SELECT id::text FROM profiles WHERE company_id = '1e2e7ccf-29fa-4511-b0d3-93c8347ead33' LIMIT 1);

SELECT 
  d.id,
  d.order_uuid,
  d.delivery_date,
  d.status,
  COUNT(di.id) as items_count
FROM deliveries d
LEFT JOIN delivery_items di ON di.delivery_id = d.id
WHERE d.order_uuid = '49fd1a08-a4f2-401f-9468-26c4b665f287'
GROUP BY d.id, d.order_uuid, d.delivery_date, d.status;

RESET role;
