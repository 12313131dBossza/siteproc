-- Add the missing 'specialty' column to contractors table
-- The form expects this field but it's missing from the database

ALTER TABLE contractors
ADD COLUMN IF NOT EXISTS specialty TEXT;

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'contractors' 
  AND table_schema = 'public'
  AND column_name = 'specialty';

SELECT 'SPECIALTY COLUMN ADDED!' as status;
