-- Find the check constraint to see allowed values
SELECT 
    con.conname as constraint_name,
    pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'purchase_orders'
  AND con.conname LIKE '%delivery_progress%';

-- Also check what values currently exist
SELECT DISTINCT delivery_progress
FROM purchase_orders
WHERE delivery_progress IS NOT NULL;
