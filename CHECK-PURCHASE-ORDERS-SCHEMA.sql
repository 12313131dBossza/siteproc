-- Check the actual structure of purchase_orders table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
ORDER BY ordinal_position;

-- Check if there's any text/varchar column that might contain order numbers
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
AND data_type IN ('text', 'character varying', 'varchar')
ORDER BY ordinal_position;

-- Show sample data to understand the structure
SELECT 
    id,
    *
FROM purchase_orders
ORDER BY created_at DESC
LIMIT 5;
