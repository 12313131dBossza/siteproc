-- ============================================
-- SIMPLE FIX: Add RLS Policies for Deliveries
-- ============================================

-- Step 1: Drop existing restrictive policies (if they exist)
DROP POLICY IF EXISTS "Users can view deliveries for their company" ON deliveries;
DROP POLICY IF EXISTS "Users can view delivery items for their company" ON delivery_items;
DROP POLICY IF EXISTS "Users can view their company deliveries" ON deliveries;
DROP POLICY IF EXISTS "Users can view their company delivery items" ON delivery_items;

-- Step 2: Create permissive SELECT policy for deliveries
CREATE POLICY "allow_company_select_deliveries"
ON deliveries
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Step 3: Create permissive SELECT policy for delivery_items
CREATE POLICY "allow_company_select_delivery_items"
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

-- Step 4: Verify policies were created
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename IN ('deliveries', 'delivery_items')
AND policyname LIKE 'allow_company%'
ORDER BY tablename, policyname;

-- Step 5: Quick test - check if your delivery is visible
SELECT 
  d.id,
  d.order_uuid,
  d.delivery_date,
  d.status,
  d.driver_name,
  COUNT(di.id) as items_count
FROM deliveries d
LEFT JOIN delivery_items di ON di.delivery_id = d.id
WHERE d.order_uuid = '49fd1a08-a4f2-401f-9468-26c4b665f287'
GROUP BY d.id, d.order_uuid, d.delivery_date, d.status, d.driver_name;
