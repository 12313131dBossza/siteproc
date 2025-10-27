-- ═══════════════════════════════════════════════════════════════════════════
-- FIX NULL PROJECT_IDS IN PURCHASE_ORDERS
-- ═══════════════════════════════════════════════════════════════════════════
-- This script checks and fixes NULL project_id values in purchase_orders
-- ═══════════════════════════════════════════════════════════════════════════

-- STEP 1: Check current state
SELECT 
    '📊 CURRENT STATE' as info,
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE project_id IS NULL) as null_project_ids,
    COUNT(*) FILTER (WHERE project_id IS NOT NULL) as has_project_id,
    ROUND(100.0 * COUNT(*) FILTER (WHERE project_id IS NULL) / NULLIF(COUNT(*), 0), 2) as percent_null
FROM purchase_orders;

-- STEP 2: Show orders with NULL project_id
SELECT 
    '❌ ORDERS WITH NULL PROJECT_ID' as info,
    id,
    product_name,
    vendor,
    amount,
    status,
    created_at
FROM purchase_orders
WHERE project_id IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- STEP 3: Check if there's a default project we can use
SELECT 
    '🏗️ AVAILABLE PROJECTS' as info,
    id,
    name,
    code,
    company_id,
    status,
    created_at
FROM projects
ORDER BY created_at DESC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════════════
-- INSTRUCTIONS:
-- ═══════════════════════════════════════════════════════════════════════════
-- After running the above queries:
-- 
-- If you want to link ALL orders to the "wfw" project, copy the project ID 
-- from the results above and run:
--
-- UPDATE purchase_orders 
-- SET project_id = 'YOUR-PROJECT-ID-HERE'
-- WHERE project_id IS NULL;
--
-- NOTIFY pgrst, 'reload schema';
--
-- Then refresh your app and the order count should appear!
-- ═══════════════════════════════════════════════════════════════════════════
