-- FIX CONTRACTORS TABLE
-- Create contractors table with proper structure and RLS policies

-- Create contractors table
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  contact_person TEXT,
  specialties TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  rating NUMERIC(3,2) DEFAULT 0.0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contractors_company_id ON contractors(company_id);
CREATE INDEX IF NOT EXISTS idx_contractors_status ON contractors(status);
CREATE INDEX IF NOT EXISTS idx_contractors_email ON contractors(email);

-- Enable RLS
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view contractors in their company" ON contractors;
  DROP POLICY IF EXISTS "Users can create contractors" ON contractors;
  DROP POLICY IF EXISTS "Users can update contractors" ON contractors;
  DROP POLICY IF EXISTS "Users can delete contractors" ON contractors;
  DROP POLICY IF EXISTS "contractors_select_policy" ON contractors;
  DROP POLICY IF EXISTS "contractors_insert_policy" ON contractors;
  DROP POLICY IF EXISTS "contractors_update_policy" ON contractors;
  DROP POLICY IF EXISTS "contractors_delete_policy" ON contractors;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Create RLS policies
CREATE POLICY "contractors_select_policy" ON contractors
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "contractors_insert_policy" ON contractors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "contractors_update_policy" ON contractors
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

CREATE POLICY "contractors_delete_policy" ON contractors
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

SELECT 'Contractors table created successfully!' as status;
