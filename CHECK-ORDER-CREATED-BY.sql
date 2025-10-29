-- Quick diagnostic: Check if orders have created_by field

-- 1. Check if created_by column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders'
  AND column_name = 'created_by';

-- 2. Check recent orders and their created_by values
SELECT 
    id,
    order_number,
    status,
    created_by,
    created_at,
    CASE 
        WHEN created_by IS NULL THEN '❌ NO CREATOR'
        ELSE '✅ HAS CREATOR'
    END as creator_status
FROM purchase_orders
ORDER BY created_at DESC
LIMIT 10;

-- 3. Count orders with and without created_by
SELECT 
    CASE 
        WHEN created_by IS NULL THEN 'Missing created_by'
        ELSE 'Has created_by'
    END as status,
    COUNT(*) as count
FROM purchase_orders
GROUP BY (created_by IS NULL);

-- 4. If created_by column doesn't exist, add it
-- (Uncomment and run if column is missing)
/*
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by 
ON purchase_orders(created_by);
*/
