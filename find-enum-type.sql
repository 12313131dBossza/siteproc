-- Find the correct enum type name
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%delivery%' OR t.typname LIKE '%progress%'
ORDER BY t.typname, e.enumsortorder;

-- Also check the column type
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'purchase_orders'
  AND column_name = 'delivery_progress';
