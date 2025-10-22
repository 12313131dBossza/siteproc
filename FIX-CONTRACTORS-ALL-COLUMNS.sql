-- COMPLETE FIX: Add ALL missing columns to contractors table
-- Based on the Contractor interface in pageClient.tsx

ALTER TABLE contractors
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT,
ADD COLUMN IF NOT EXISTS specialty TEXT,
ADD COLUMN IF NOT EXISTS rating NUMERIC,
ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Verify all columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'contractors' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'ALL CONTRACTOR COLUMNS ADDED!' as status;
