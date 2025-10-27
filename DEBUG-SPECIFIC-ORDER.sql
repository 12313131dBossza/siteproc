-- ═══════════════════════════════════════════════════════════════
-- DEBUG SPECIFIC ORDER - Check why order 7aa498f6 can't be found
-- ═══════════════════════════════════════════════════════════════

-- 1. Check if the order exists at all (bypass RLS with service role)
SELECT 
    '1. Does order exist?' as check_name,
    id,
    product_name,
    company_id,
    project_id,
    status,
    created_by
FROM purchase_orders 
WHERE id = '7aa498f6-cc0b-468e-9446-20d379939bcd';

-- 2. Check your current user and company
SELECT 
    '2. Your user info' as check_name,
    id as your_user_id,
    email,
    company_id as your_company_id,
    role
FROM profiles 
WHERE id = auth.uid();

-- 3. Check if company_id matches
SELECT 
    '3. Company ID match check' as check_name,
    po.id as order_id,
    po.company_id as order_company_id,
    p.company_id as your_company_id,
    po.project_id as order_project_id,
    proj.company_id as project_company_id,
    CASE 
        WHEN po.company_id = p.company_id THEN '✅ Order company matches your company'
        WHEN po.company_id IS NULL THEN '❌ Order has NULL company_id!'
        ELSE '❌ Order belongs to different company'
    END as company_match,
    CASE 
        WHEN proj.company_id = p.company_id THEN '✅ Project company matches your company'
        WHEN proj.company_id IS NULL THEN '❌ Project has NULL company_id!'
        ELSE '❌ Project belongs to different company'
    END as project_match
FROM purchase_orders po
LEFT JOIN projects proj ON po.project_id = proj.id
CROSS JOIN profiles p
WHERE po.id = '7aa498f6-cc0b-468e-9446-20d379939bcd'
AND p.id = auth.uid();

-- 4. If company_id is NULL, let's fix it
UPDATE purchase_orders
SET company_id = projects.company_id
FROM projects
WHERE purchase_orders.project_id = projects.id
AND purchase_orders.company_id IS NULL;

-- 5. Verify the fix
SELECT 
    '4. After fix - Order details' as check_name,
    po.id,
    po.product_name,
    po.company_id as order_company_id,
    proj.company_id as project_company_id,
    CASE 
        WHEN po.company_id IS NOT NULL THEN '✅ Has company_id'
        ELSE '❌ Still NULL'
    END as status
FROM purchase_orders po
LEFT JOIN projects proj ON po.project_id = proj.id
WHERE po.id = '7aa498f6-cc0b-468e-9446-20d379939bcd';

-- 6. Count how many orders had NULL company_id (should now be 0)
SELECT 
    '5. Orders with NULL company_id' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All orders have company_id'
        ELSE '⚠️ ' || COUNT(*) || ' orders still missing company_id'
    END as status
FROM purchase_orders
WHERE company_id IS NULL;

SELECT '🎯 Run this SQL and send me screenshot of ALL results!' as instruction;
