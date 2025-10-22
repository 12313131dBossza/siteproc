-- FIX RLS POLICIES FOR BIDS TABLE
-- The error shows RLS is blocking inserts, so we need proper policies

-- First, check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'bids';

-- Drop existing policies if they're too restrictive
DROP POLICY IF EXISTS "Users can view bids for their company" ON bids;
DROP POLICY IF EXISTS "Users can insert bids for their company" ON bids;
DROP POLICY IF EXISTS "Users can update bids for their company" ON bids;
DROP POLICY IF EXISTS "Users can delete bids for their company" ON bids;

-- Create proper RLS policies that allow company members to manage bids
CREATE POLICY "Enable read access for company members"
ON bids FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable insert for company members"
ON bids FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable update for company members"
ON bids FOR UPDATE
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
ON bids FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Verify RLS is enabled
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- Show the new policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bids';

SELECT '✅ BIDS RLS POLICIES FIXED!' as status;
