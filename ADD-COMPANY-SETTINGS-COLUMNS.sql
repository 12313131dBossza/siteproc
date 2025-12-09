-- Add currency and units columns to companies table
-- Run this in Supabase SQL Editor

-- Add currency column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'currency'
    ) THEN
        ALTER TABLE companies ADD COLUMN currency text DEFAULT 'USD';
    END IF;
END $$;

-- Add units column if it doesn't exist  
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'units'
    ) THEN
        ALTER TABLE companies ADD COLUMN units text DEFAULT 'metric';
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'companies'
ORDER BY ordinal_position;

-- Reload PostgREST schema cache to recognize new columns
NOTIFY pgrst, 'reload schema';