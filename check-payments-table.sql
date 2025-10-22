-- Check if payments table exists
SELECT 
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_name = 'payments';

-- Check all columns in payments table (if it exists)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'payments'
ORDER BY ordinal_position;

-- Check RLS policies on payments
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'payments';
