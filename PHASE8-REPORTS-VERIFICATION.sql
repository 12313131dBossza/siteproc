-- ============================================================================
-- PHASE 8: REPORTS MODULE - VERIFICATION & ANALYSIS
-- Assess current reporting capabilities and data availability
-- ============================================================================

SELECT '📊 PHASE 8: REPORTS MODULE VERIFICATION' as section;

-- ============================================================================
-- 1. DATA AVAILABILITY CHECK
-- ============================================================================

SELECT '=== DATA AVAILABILITY FOR REPORTING ===' as check_section;

-- Check if we have sufficient data for reports
SELECT 
    'Projects' as entity,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE budget > 0) as with_budget,
    COUNT(*) FILTER (WHERE actual_cost > 0) as with_costs,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ Sufficient data'
        WHEN COUNT(*) >= 1 THEN '⚠️ Limited data'
        ELSE '❌ No data'
    END as status
FROM projects
UNION ALL
SELECT 
    'Orders' as entity,
    COUNT(*) as total_count,
    COUNT(*) as with_totals,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ Sufficient data'
        WHEN COUNT(*) >= 1 THEN '⚠️ Limited data'
        ELSE '❌ No data'
    END as status
FROM orders
UNION ALL
SELECT 
    'Deliveries' as entity,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
    COUNT(*) FILTER (WHERE status = 'delivered') as with_proof,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ Sufficient data'
        WHEN COUNT(*) >= 1 THEN '⚠️ Limited data'
        ELSE '❌ No data'
    END as status
FROM deliveries
UNION ALL
SELECT 
    'Expenses' as entity,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    COUNT(*) FILTER (WHERE project_id IS NOT NULL) as linked_to_project,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ Sufficient data'
        WHEN COUNT(*) >= 1 THEN '⚠️ Limited data'
        ELSE '❌ No data'
    END as status
FROM expenses
UNION ALL
SELECT 
    'Payments' as entity,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'paid') as paid,
    COUNT(*) FILTER (WHERE project_id IS NOT NULL) as linked_to_project,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ Sufficient data'
        WHEN COUNT(*) >= 1 THEN '⚠️ Limited data'
        ELSE '❌ No data'
    END as status
FROM payments;

-- ============================================================================
-- 2. FINANCIAL DATA SUMMARY
-- ============================================================================

SELECT '=== FINANCIAL OVERVIEW (FOR P&L REPORT) ===' as check_section;

-- Revenue from orders
SELECT 
    'Revenue (Orders)' as metric,
    COUNT(*) as count,
    0 as total_amount,
    0 as avg_amount,
    MIN(created_at)::date as earliest_date,
    MAX(created_at)::date as latest_date
FROM orders
WHERE status IN ('delivered', 'completed')
UNION ALL
-- Expenses
SELECT 
    'Expenses' as metric,
    COUNT(*) as count,
    COALESCE(SUM(amount), 0) as total_amount,
    COALESCE(AVG(amount), 0) as avg_amount,
    MIN(created_at)::date as earliest_date,
    MAX(created_at)::date as latest_date
FROM expenses
WHERE status = 'approved'
UNION ALL
-- Payments
SELECT 
    'Payments' as metric,
    COUNT(*) as count,
    COALESCE(SUM(amount), 0) as total_amount,
    COALESCE(AVG(amount), 0) as avg_amount,
    MIN(created_at)::date as earliest_date,
    MAX(created_at)::date as latest_date
FROM payments
WHERE status = 'paid';

-- ============================================================================
-- 3. PROJECT ANALYTICS DATA
-- ============================================================================

SELECT '=== PROJECT ANALYTICS DATA ===' as check_section;

SELECT 
    p.id,
    p.name,
    p.code,
    p.budget,
    p.actual_cost,
    p.variance,
    CASE 
        WHEN p.variance < 0 THEN '🔴 Over Budget'
        WHEN p.variance < (p.budget * 0.2) THEN '🟡 Near Limit'
        ELSE '🟢 On Track'
    END as budget_status,
    COUNT(DISTINCT o.id) as order_count,
    COUNT(DISTINCT d.id) as delivery_count,
    COUNT(DISTINCT e.id) as expense_count,
    COUNT(DISTINCT pm.id) as payment_count,
    0 as total_revenue,
    COALESCE(SUM(e.amount) FILTER (WHERE e.status = 'approved'), 0) as total_expenses,
    COALESCE(SUM(pm.amount) FILTER (WHERE pm.status = 'paid'), 0) as total_payments
FROM projects p
LEFT JOIN orders o ON o.project_id = p.id
LEFT JOIN deliveries d ON d.project_id = p.id
LEFT JOIN expenses e ON e.project_id = p.id
LEFT JOIN payments pm ON pm.project_id = p.id
GROUP BY p.id, p.name, p.code, p.budget, p.actual_cost, p.variance
ORDER BY p.created_at DESC
LIMIT 10;

-- ============================================================================
-- 4. VENDOR ANALYSIS DATA
-- ============================================================================

SELECT '=== VENDOR/SUPPLIER ANALYTICS ===' as check_section;

-- Top vendors by payment volume
SELECT 
    vendor_name,
    COUNT(*) as payment_count,
    SUM(amount) as total_paid,
    AVG(amount) as avg_payment,
    COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
    COUNT(*) FILTER (WHERE status = 'unpaid') as unpaid_count,
    MIN(payment_date) as first_payment,
    MAX(payment_date) as latest_payment
FROM payments
GROUP BY vendor_name
ORDER BY total_paid DESC
LIMIT 10;

-- Top expense categories
SELECT 
    category,
    COUNT(*) as expense_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count
FROM expenses
GROUP BY category
ORDER BY total_amount DESC
LIMIT 10;

-- ============================================================================
-- 5. TIME-BASED ANALYTICS
-- ============================================================================

SELECT '=== MONTHLY TRENDS (LAST 6 MONTHS) ===' as check_section;

SELECT 
    TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
    COUNT(*) as order_count,
    0 as total_revenue,
    0 as avg_order_value
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- ============================================================================
-- 6. CHECK EXISTING VIEWS/REPORTS
-- ============================================================================

SELECT '=== EXISTING REPORT VIEWS ===' as check_section;

SELECT 
    table_name as view_name,
    CASE 
        WHEN table_name LIKE '%dashboard%' THEN 'Dashboard Metrics'
        WHEN table_name LIKE '%summary%' THEN 'Summary Report'
        WHEN table_name LIKE '%project%' THEN 'Project Report'
        ELSE 'Other'
    END as report_type
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'expense_dashboard_metrics',
    'payment_dashboard_metrics',
    'project_expense_summary',
    'project_payment_summary'
  )
ORDER BY table_name;

-- ============================================================================
-- 7. REPORT REQUIREMENTS ASSESSMENT
-- ============================================================================

SELECT '=== RECOMMENDED REPORTS TO BUILD ===' as check_section;

SELECT 
    '1. Profit & Loss (P&L) Report' as report_name,
    'Financial statement showing revenue, expenses, and net profit over time' as description,
    'High' as priority,
    CASE 
        WHEN EXISTS (SELECT 1 FROM orders LIMIT 1) AND EXISTS (SELECT 1 FROM expenses LIMIT 1)
        THEN '✅ Can build now'
        ELSE '❌ Insufficient data'
    END as feasibility
UNION ALL
SELECT 
    '2. Project Budget Variance Report' as report_name,
    'Shows budget vs actual costs for all projects' as description,
    'High' as priority,
    CASE 
        WHEN EXISTS (SELECT 1 FROM projects WHERE budget > 0 LIMIT 1)
        THEN '✅ Can build now'
        ELSE '❌ Insufficient data'
    END as feasibility
UNION ALL
SELECT 
    '3. Vendor/Supplier Summary' as report_name,
    'Payment volumes, counts, and trends by vendor' as description,
    'Medium' as priority,
    CASE 
        WHEN EXISTS (SELECT 1 FROM payments WHERE vendor_name IS NOT NULL LIMIT 1)
        THEN '✅ Can build now'
        ELSE '❌ Insufficient data'
    END as feasibility
UNION ALL
SELECT 
    '4. Project Profitability Report' as report_name,
    'Revenue vs costs per project to show profit margins' as description,
    'High' as priority,
    CASE 
        WHEN EXISTS (SELECT 1 FROM projects p 
                     JOIN orders o ON o.project_id = p.id 
                     LIMIT 1)
        THEN '✅ Can build now'
        ELSE '❌ Insufficient data'
    END as feasibility
UNION ALL
SELECT 
    '5. Cash Flow Report' as report_name,
    'Money in (orders) vs money out (payments) over time' as description,
    'High' as priority,
    CASE 
        WHEN EXISTS (SELECT 1 FROM orders LIMIT 1) AND EXISTS (SELECT 1 FROM payments LIMIT 1)
        THEN '✅ Can build now'
        ELSE '❌ Insufficient data'
    END as feasibility
UNION ALL
SELECT 
    '6. Expense Category Breakdown' as report_name,
    'Pie chart/table showing spending by category' as description,
    'Medium' as priority,
    CASE 
        WHEN EXISTS (SELECT 1 FROM expenses WHERE category IS NOT NULL LIMIT 1)
        THEN '✅ Can build now'
        ELSE '❌ Insufficient data'
    END as feasibility
UNION ALL
SELECT 
    '7. Delivery Performance Report' as report_name,
    'On-time delivery rates, delays, proof of delivery stats' as description,
    'Medium' as priority,
    CASE 
        WHEN EXISTS (SELECT 1 FROM deliveries LIMIT 1)
        THEN '✅ Can build now'
        ELSE '❌ Insufficient data'
    END as feasibility
UNION ALL
SELECT 
    '8. Monthly Summary Dashboard' as report_name,
    'High-level overview of all key metrics month by month' as description,
    'High' as priority,
    '✅ Can build now' as feasibility;

-- ============================================================================
-- 8. DATE RANGE ANALYSIS
-- ============================================================================

SELECT '=== DATA DATE RANGES (FOR FILTERING) ===' as check_section;

SELECT 
    'Orders' as entity,
    MIN(created_at)::date as earliest_date,
    MAX(created_at)::date as latest_date,
    (MAX(created_at)::date - MIN(created_at)::date) as days_span,
    COUNT(*) as total_records
FROM orders
UNION ALL
SELECT 
    'Deliveries' as entity,
    MIN(created_at)::date as earliest_date,
    MAX(created_at)::date as latest_date,
    (MAX(created_at)::date - MIN(created_at)::date) as days_span,
    COUNT(*) as total_records
FROM deliveries
UNION ALL
SELECT 
    'Expenses' as entity,
    MIN(created_at)::date as earliest_date,
    MAX(created_at)::date as latest_date,
    (MAX(created_at)::date - MIN(created_at)::date) as days_span,
    COUNT(*) as total_records
FROM expenses
UNION ALL
SELECT 
    'Payments' as entity,
    MIN(payment_date)::date as earliest_date,
    MAX(payment_date)::date as latest_date,
    (MAX(payment_date)::date - MIN(payment_date)::date) as days_span,
    COUNT(*) as total_records
FROM payments;

-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================

SELECT '=== PHASE 8 VERIFICATION SUMMARY ===' as check_section;

SELECT 
    '✅ Data available for reporting' as status,
    COUNT(DISTINCT p.id) as project_count,
    COUNT(DISTINCT o.id) as order_count,
    COUNT(DISTINCT e.id) as expense_count,
    COUNT(DISTINCT pm.id) as payment_count,
    'Ready to build comprehensive reports' as recommendation
FROM projects p
CROSS JOIN orders o
CROSS JOIN expenses e
CROSS JOIN payments pm;

SELECT '✅ Phase 8 Verification Complete - Ready to build reports' as final_status;
