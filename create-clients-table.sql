-- ============================================================================
-- CLIENTS TABLE SCHEMA
-- Creates comprehensive client management system
-- ============================================================================

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Basic Information
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  
  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  
  -- Contact Details
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  
  -- Business Details
  client_type TEXT DEFAULT 'individual' CHECK (client_type IN ('individual', 'company', 'government', 'non-profit')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  
  -- Financial
  credit_limit DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  payment_terms INTEGER DEFAULT 30, -- days
  
  -- Metadata
  notes TEXT,
  tags TEXT[], -- For categorization
  website TEXT,
  tax_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Search
  search_vector tsvector
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary search index
CREATE INDEX IF NOT EXISTS idx_clients_search 
  ON clients USING gin(search_vector);

-- Company filter
CREATE INDEX IF NOT EXISTS idx_clients_company 
  ON clients(company_id) WHERE company_id IS NOT NULL;

-- Status filter
CREATE INDEX IF NOT EXISTS idx_clients_status 
  ON clients(status);

-- Client type filter
CREATE INDEX IF NOT EXISTS idx_clients_type 
  ON clients(client_type);

-- Email lookup
CREATE INDEX IF NOT EXISTS idx_clients_email 
  ON clients(email) WHERE email IS NOT NULL;

-- Created date for sorting
CREATE INDEX IF NOT EXISTS idx_clients_created 
  ON clients(created_at DESC);

-- Name search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_clients_name_lower 
  ON clients(LOWER(name));

-- ============================================================================
-- FULL TEXT SEARCH TRIGGER
-- ============================================================================

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_clients_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.company_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.contact_person, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.state, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search vector
DROP TRIGGER IF EXISTS clients_search_vector_update ON clients;
CREATE TRIGGER clients_search_vector_update
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_search_vector();

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS clients_updated_at ON clients;
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view clients in their company
DROP POLICY IF EXISTS clients_select_policy ON clients;
CREATE POLICY clients_select_policy ON clients
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert clients for their company
DROP POLICY IF EXISTS clients_insert_policy ON clients;
CREATE POLICY clients_insert_policy ON clients
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can update clients in their company
DROP POLICY IF EXISTS clients_update_policy ON clients;
CREATE POLICY clients_update_policy ON clients
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can delete clients in their company
DROP POLICY IF EXISTS clients_delete_policy ON clients;
CREATE POLICY clients_delete_policy ON clients
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert sample clients (replace company_id with actual ID)
-- INSERT INTO clients (company_id, name, company_name, email, phone, address, city, state, zip_code, client_type, status, payment_terms, notes)
-- VALUES
--   ((SELECT id FROM companies LIMIT 1), 'John Smith', 'Smith Construction LLC', 'john@smithconstruction.com', '555-0101', '123 Main St', 'New York', 'NY', '10001', 'company', 'active', 30, 'Long-term client, always pays on time'),
--   ((SELECT id FROM companies LIMIT 1), 'Sarah Johnson', 'Johnson Homes', 'sarah@johnsonhomes.com', '555-0102', '456 Oak Ave', 'Los Angeles', 'CA', '90001', 'company', 'active', 15, 'Prefers email communication'),
--   ((SELECT id FROM companies LIMIT 1), 'Mike Davis', NULL, 'mike.davis@email.com', '555-0103', '789 Pine St', 'Chicago', 'IL', '60601', 'individual', 'active', 30, 'Residential renovation specialist');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'clients'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'clients';

-- Check RLS policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'clients';

-- Count clients
SELECT COUNT(*) as total_clients FROM clients;
