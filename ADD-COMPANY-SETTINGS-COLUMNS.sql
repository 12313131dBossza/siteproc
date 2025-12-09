-- Migration: Add currency and units columns to companies table
-- Run this in your Supabase SQL Editor

-- Add currency column with default USD
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';

-- Add units column with default imperial
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS units text DEFAULT 'imperial';

-- Add updated_at column for tracking updates
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Optional: Add a trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS companies_updated_at_trigger ON companies;
CREATE TRIGGER companies_updated_at_trigger
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_updated_at();

-- Verify the changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'companies';
