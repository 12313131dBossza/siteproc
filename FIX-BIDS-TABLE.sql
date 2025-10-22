-- FIX BIDS TABLE
-- Create bids table with proper structure and RLS policies

-- Create bids table
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  project_id UUID,
  client_id UUID,
  vendor_name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
  bid_date DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bids_company_id ON bids(company_id);
CREATE INDEX IF NOT EXISTS idx_bids_project_id ON bids(project_id);
CREATE INDEX IF NOT EXISTS idx_bids_client_id ON bids(client_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);

-- Enable RLS
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view bids in their company" ON bids;
  DROP POLICY IF EXISTS "Users can create bids" ON bids;
  DROP POLICY IF EXISTS "Users can update bids" ON bids;
  DROP POLICY IF EXISTS "Users can delete bids" ON bids;
  DROP POLICY IF EXISTS "bids_select_policy" ON bids;
  DROP POLICY IF EXISTS "bids_insert_policy" ON bids;
  DROP POLICY IF EXISTS "bids_update_policy" ON bids;
  DROP POLICY IF EXISTS "bids_delete_policy" ON bids;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Create RLS policies
CREATE POLICY "bids_select_policy" ON bids
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "bids_insert_policy" ON bids
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "bids_update_policy" ON bids
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "bids_delete_policy" ON bids
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

SELECT 'Bids table created successfully!' as status;
