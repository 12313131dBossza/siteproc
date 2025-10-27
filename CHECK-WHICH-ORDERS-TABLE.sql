-- Check which table to keep: orders vs purchase_orders
-- Run this in Supabase SQL Editor

SELECT '📊 TABLE COMPARISON' as section;

-- Count rows in each table
SELECT 
    'orders' as table_name,
    COUNT(*) as row_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM orders
UNION ALL
SELECT 
    'purchase_orders' as table_name,
    COUNT(*) as row_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM purchase_orders;

-- Show sample data from orders table
SELECT '🔍 SAMPLE FROM ORDERS TABLE' as info;
SELECT id, description, amount, status, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;

-- Show sample data from purchase_orders table
SELECT '🔍 SAMPLE FROM PURCHASE_ORDERS TABLE' as info;
SELECT id, description, amount, status, created_at 
FROM purchase_orders 
ORDER BY created_at DESC 
LIMIT 5;

-- Check columns in each table
SELECT '📋 ORDERS TABLE COLUMNS' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

SELECT '📋 PURCHASE_ORDERS TABLE COLUMNS' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
ORDER BY ordinal_position;

-- DECISION HELPER
SELECT '
╔════════════════════════════════════════════════════════════╗
║                    DECISION HELPER                         ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  ✅ API NOW USES: "orders" table                          ║
║                                                            ║
║  RECOMMENDATION:                                           ║
║  - If "orders" has more/newer data → Keep orders          ║
║  - If "purchase_orders" has data → Migrate it to orders   ║
║  - Then drop purchase_orders table                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
' as recommendation;
