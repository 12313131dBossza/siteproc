-- QuickBooks Integration Tables Migration
-- Run this in Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table to store QuickBooks connection details
CREATE TABLE IF NOT EXISTS quickbooks_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  realm_id TEXT NOT NULL,  -- QuickBooks Company ID
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Table to log sync operations
CREATE TABLE IF NOT EXISTS quickbooks_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES quickbooks_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,  -- 'customers', 'invoices', 'payments', 'full'
  status TEXT NOT NULL,      -- 'success', 'failed', 'partial'
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add QB customer ID to projects table (for syncing projects as customers)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS quickbooks_customer_id TEXT;

-- Add QB invoice ID to orders table (for syncing orders as invoices)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS quickbooks_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS quickbooks_synced_at TIMESTAMP WITH TIME ZONE;

-- Add QB payment ID to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS quickbooks_payment_id TEXT,
ADD COLUMN IF NOT EXISTS quickbooks_synced_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qb_connections_company_id ON quickbooks_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_qb_connections_realm_id ON quickbooks_connections(realm_id);
CREATE INDEX IF NOT EXISTS idx_qb_sync_log_connection_id ON quickbooks_sync_log(connection_id);
CREATE INDEX IF NOT EXISTS idx_qb_sync_log_created_at ON quickbooks_sync_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_qb_customer_id ON projects(quickbooks_customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_qb_invoice_id ON orders(quickbooks_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_qb_payment_id ON payments(quickbooks_payment_id);

-- Row Level Security (RLS) Policies
ALTER TABLE quickbooks_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_sync_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see QB connections for their company
CREATE POLICY "Users can view their company's QB connection" 
ON quickbooks_connections FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM members WHERE user_id = auth.uid()
  )
);

-- Policy: Admin members can insert/update QB connections
CREATE POLICY "Admin members can manage QB connections" 
ON quickbooks_connections FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- Policy: Users can view sync logs for their company
CREATE POLICY "Users can view their company's sync logs" 
ON quickbooks_sync_log FOR SELECT
USING (
  connection_id IN (
    SELECT id FROM quickbooks_connections
    WHERE company_id IN (
      SELECT company_id FROM members WHERE user_id = auth.uid()
    )
  )
);

-- Policy: System can insert sync logs (via service role)
CREATE POLICY "System can insert sync logs" 
ON quickbooks_sync_log FOR INSERT
WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quickbooks_connection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_quickbooks_connection_timestamp
BEFORE UPDATE ON quickbooks_connections
FOR EACH ROW
EXECUTE FUNCTION update_quickbooks_connection_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON quickbooks_connections TO authenticated;
GRANT SELECT, INSERT ON quickbooks_sync_log TO authenticated;
GRANT ALL ON quickbooks_connections TO service_role;
GRANT ALL ON quickbooks_sync_log TO service_role;

-- Comments for documentation
COMMENT ON TABLE quickbooks_connections IS 'Stores OAuth tokens and connection info for QuickBooks integration';
COMMENT ON TABLE quickbooks_sync_log IS 'Logs all sync operations between app and QuickBooks';
COMMENT ON COLUMN quickbooks_connections.realm_id IS 'QuickBooks Company ID (realmId from OAuth)';
COMMENT ON COLUMN quickbooks_connections.token_expires_at IS 'Access token expires after 1 hour';
COMMENT ON COLUMN quickbooks_connections.refresh_token_expires_at IS 'Refresh token expires after 100 days';
