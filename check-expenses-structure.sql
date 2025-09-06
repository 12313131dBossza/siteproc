-- Check Expenses Table Structure
-- Run this first to see what columns exist

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'expenses'
ORDER BY ordinal_position;
