-- FIX ALL RLS POLICIES FOR BIDS, CLIENTS, AND CONTRACTORS
-- Ensure all three tables have proper RLS policies

-- =============================================================================
-- BIDS TABLE RLS POLICIES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view bids for their company" ON bids;
DROP POLICY IF EXISTS "Users can insert bids for their company" ON bids;
DROP POLICY IF EXISTS "Users can update bids for their company" ON bids;
DROP POLICY IF EXISTS "Users can delete bids for their company" ON bids;

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

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- CLIENTS TABLE RLS POLICIES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view clients for their company" ON clients;
DROP POLICY IF EXISTS "Users can insert clients for their company" ON clients;
DROP POLICY IF EXISTS "Users can update clients for their company" ON clients;
DROP POLICY IF EXISTS "Users can delete clients for their company" ON clients;

CREATE POLICY "Enable read access for company members"
ON clients FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable insert for company members"
ON clients FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable update for company members"
ON clients FOR UPDATE
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
ON clients FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- CONTRACTORS TABLE RLS POLICIES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view contractors for their company" ON contractors;
DROP POLICY IF EXISTS "Users can insert contractors for their company" ON contractors;
DROP POLICY IF EXISTS "Users can update contractors for their company" ON contractors;
DROP POLICY IF EXISTS "Users can delete contractors for their company" ON contractors;

CREATE POLICY "Enable read access for company members"
ON contractors FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable insert for company members"
ON contractors FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable update for company members"
ON contractors FOR UPDATE
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
ON contractors FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- VERIFY ALL POLICIES
-- =============================================================================
SELECT 'BIDS POLICIES:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bids';

SELECT 'CLIENTS POLICIES:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'clients';

SELECT 'CONTRACTORS POLICIES:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'contractors';

SELECT '✅ ALL RLS POLICIES FIXED!' as status;
