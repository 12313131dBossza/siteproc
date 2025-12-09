-- Add currency and units columns to companies table
-- Run this in Supabase SQL Editor

-- Add currency column (stores currency code like 'USD', 'MYR', 'SGD')
ALTER TABLE companies ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';

-- Add units column (stores 'metric' or 'imperial')
ALTER TABLE companies ADD COLUMN IF NOT EXISTS units text DEFAULT 'metric';

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'companies'
ORDER BY ordinal_position;

-- IMPORTANT: Reload PostgREST schema cache to recognize new columns
-- This must be run after adding columns
NOTIFY pgrst, 'reload schema';