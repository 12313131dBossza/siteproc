-- Check the actual columns in delivery_items table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'delivery_items'
ORDER BY ordinal_position;
