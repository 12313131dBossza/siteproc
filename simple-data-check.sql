-- Simple check: What's actually in our database?
-- Run this to see exactly what we have

-- 1. Check if both tables exist
SELECT 'TABLE CHECK:' as info;
SELECT 
    tablename,
    'EXISTS' as status
FROM pg_tables 
WHERE tablename IN ('deliveries', 'delivery_items')
ORDER BY tablename;

-- 2. Check deliveries table data
SELECT 'DELIVERIES DATA:' as info;
SELECT 
    id,
    order_id,
    status,
    total_amount,
    company_id,
    created_at
FROM deliveries 
LIMIT 5;

-- 3. Check delivery_items data
SELECT 'DELIVERY_ITEMS DATA:' as info;
SELECT COUNT(*) as items_count FROM delivery_items;

-- 4. Show companies
SELECT 'COMPANIES:' as info;
SELECT id, name FROM companies LIMIT 5;
