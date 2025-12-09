-- White-Label Support for Enterprise Customers
-- Run this in Supabase SQL Editor

-- Add white-label columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS white_label_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS white_label_logo_url text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS white_label_company_name text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS white_label_email_name boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN companies.white_label_enabled IS 'Enable white-label branding (Enterprise plan only)';
COMMENT ON COLUMN companies.white_label_logo_url IS 'URL to company logo for white-label branding';
COMMENT ON COLUMN companies.white_label_company_name IS 'Company name to display in white-label mode';
COMMENT ON COLUMN companies.white_label_email_name IS 'Use company name in email notification From field';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name LIKE 'white_label%';
