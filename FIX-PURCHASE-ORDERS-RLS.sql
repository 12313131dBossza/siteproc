-- FIX RLS POLICIES FOR PURCHASE_ORDERS TABLE
-- Allow company members to insert orders when converting bids

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view purchase_orders for their company" ON purchase_orders;
DROP POLICY IF EXISTS "Users can insert purchase_orders for their company" ON purchase_orders;
DROP POLICY IF EXISTS "Users can update purchase_orders for their company" ON purchase_orders;
DROP POLICY IF EXISTS "Users can delete purchase_orders for their company" ON purchase_orders;

-- Create proper RLS policies
CREATE POLICY "Enable read access for company members"
ON purchase_orders FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable insert for company members"
ON purchase_orders FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable update for company members"
ON purchase_orders FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable delete for company members"
ON purchase_orders FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- Verify policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'purchase_orders';

SELECT '✅ PURCHASE_ORDERS RLS POLICIES FIXED!' as status;
