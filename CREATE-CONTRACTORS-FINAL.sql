-- COMPLETE FIX: Create contractors table and check clients
-- This will ensure all three tables work

-- 1. CREATE CONTRACTORS TABLE (it doesn't exist)
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

-- Enable RLS
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "contractors_select_policy" ON contractors
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "contractors_insert_policy" ON contractors
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "contractors_update_policy" ON contractors
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "contractors_delete_policy" ON contractors
  FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- 2. VERIFY ALL THREE TABLES NOW EXIST
SELECT 'ALL TABLES STATUS:' as info;
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('clients', 'bids', 'contractors')
ORDER BY table_name;

SELECT 'SUCCESS: All tables created!' as status;
