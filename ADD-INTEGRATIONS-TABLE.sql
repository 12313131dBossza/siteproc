-- ADD-INTEGRATIONS-TABLE.sql
-- Create integrations table for storing OAuth tokens
-- Run this in Supabase SQL Editor

BEGIN;

-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'xero', 'quickbooks', etc.
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  tenant_id TEXT, -- Xero tenant ID or QB realm ID
  tenant_name TEXT, -- Connected organization name
  connected_by UUID REFERENCES profiles(id),
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'connected', -- 'connected', 'disconnected', 'expired'
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one provider per company
  UNIQUE(company_id, provider)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_integrations_company_provider 
ON integrations(company_id, provider);

-- Enable RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their company's integrations
CREATE POLICY "Users can view own company integrations"
ON integrations FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- RLS Policy: Admins/Owners can manage integrations
CREATE POLICY "Admins can manage integrations"
ON integrations FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'owner')
  )
);

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Integrations table created successfully!';
END $$;
