-- Check if documents table exists and its structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'documents'
ORDER BY ordinal_position;

-- Check if the table exists at all
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'documents'
) as table_exists;
