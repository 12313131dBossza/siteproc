-- 🔍 CHECK DELIVERIES TABLE STRUCTURE

-- Check if deliveries table exists and show structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'deliveries'
ORDER BY ordinal_position;

-- Check if delivery_items table exists and show structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'delivery_items'
ORDER BY ordinal_position;

-- Show all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
