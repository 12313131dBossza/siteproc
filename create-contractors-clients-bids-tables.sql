-- =====================================================
-- Create Contractors, Clients, and Bids Tables
-- =====================================================

-- Contractors Table (Vendor Directory)
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  specialty TEXT,
  rating DECIMAL(3,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(15,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Clients Table (Project Owners / Customers)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  industry TEXT,
  total_projects INTEGER DEFAULT 0,
  total_value DECIMAL(15,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Bids Table (Vendor Quotations)
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  vendor_email TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  item_description TEXT NOT NULL,
  quantity DECIMAL(15,2) NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  valid_until DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_contractors_status ON contractors(status);
CREATE INDEX IF NOT EXISTS idx_contractors_name ON contractors(name);
CREATE INDEX IF NOT EXISTS idx_contractors_created_at ON contractors(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
CREATE INDEX IF NOT EXISTS idx_bids_vendor_name ON bids(vendor_name);
CREATE INDEX IF NOT EXISTS idx_bids_project_id ON bids(project_id);
CREATE INDEX IF NOT EXISTS idx_bids_order_id ON bids(order_id);
CREATE INDEX IF NOT EXISTS idx_bids_valid_until ON bids(valid_until);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids(created_at DESC);

-- Add Comments
COMMENT ON TABLE contractors IS 'Vendor directory for orders, expenses, and payments';
COMMENT ON TABLE clients IS 'Project owners and customers';
COMMENT ON TABLE bids IS 'Vendor quotations that can be converted to orders';

-- Sample Data (Optional - Remove in Production)
-- INSERT INTO contractors (name, company_name, email, phone, specialty, status) VALUES
-- ('John Smith', 'Smith Construction', 'john@smithconst.com', '(555) 123-4567', 'General Contracting', 'active'),
-- ('Jane Doe', 'Doe Plumbing', 'jane@doeplumbing.com', '(555) 234-5678', 'Plumbing', 'active'),
-- ('Bob Wilson', 'Wilson Electric', 'bob@wilsonelectric.com', '(555) 345-6789', 'Electrical', 'active');

-- INSERT INTO clients (name, company_name, email, phone, industry, status) VALUES
-- ('Acme Corp', 'Acme Corporation', 'contact@acmecorp.com', '(555) 111-2222', 'Real Estate', 'active'),
-- ('BuildCo', 'BuildCo Development', 'info@buildco.com', '(555) 222-3333', 'Construction', 'active');

RAISE NOTICE '✅ Contractors, Clients, and Bids tables created successfully';
RAISE NOTICE '📊 Created 3 tables with indexes and constraints';
RAISE NOTICE '🔗 Tables ready for CRUD operations via API routes';
