-- ═══════════════════════════════════════════════════════════════════════════
-- DIAGNOSTIC: Check why order count is 0
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Check if purchase_orders table exists and has data
SELECT 
    '📊 PURCHASE ORDERS TABLE' as check_type,
    COUNT(*) as total_orders,
    COUNT(DISTINCT project_id) as unique_projects,
    COUNT(*) FILTER (WHERE project_id IS NULL) as null_project_id,
    COUNT(*) FILTER (WHERE project_id IS NOT NULL) as has_project_id
FROM purchase_orders;

-- 2. Show sample purchase orders
SELECT 
    '📋 SAMPLE ORDERS' as info,
    id,
    product_name,
    project_id,
    company_id,
    status,
    created_at
FROM purchase_orders
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check projects table
SELECT 
    '🏗️ PROJECTS TABLE' as check_type,
    COUNT(*) as total_projects,
    COUNT(DISTINCT company_id) as unique_companies
FROM projects;

-- 4. Check if there's a project with code 'wfw' or name 'wfw'
SELECT 
    '🔍 WFW PROJECT' as info,
    id,
    name,
    code,
    company_id,
    budget,
    status,
    created_at
FROM projects
WHERE name ILIKE '%wfw%' OR code ILIKE '%wfw%'
LIMIT 5;

-- 5. Count orders by project
SELECT 
    '📈 ORDERS BY PROJECT' as info,
    p.name as project_name,
    p.code as project_code,
    COUNT(po.id) as order_count
FROM projects p
LEFT JOIN purchase_orders po ON po.project_id = p.id
GROUP BY p.id, p.name, p.code
ORDER BY order_count DESC
LIMIT 10;

-- 6. Check if orders have project_id column
SELECT 
    '🔧 SCHEMA CHECK' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders'
AND column_name IN ('id', 'project_id', 'company_id', 'job_id')
ORDER BY column_name;
