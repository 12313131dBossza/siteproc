-- ADD MISSING COLUMN TO CONTRACTORS
-- The form expects 'company_name' but table has 'name'

ALTER TABLE contractors
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Verify column was added
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'contractors' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Contractors company_name column added!' as status;
