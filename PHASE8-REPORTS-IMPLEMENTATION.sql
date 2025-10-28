-- ============================================================================
-- PHASE 8: REPORTS MODULE - IMPLEMENTATION
-- Create comprehensive reporting views and functions
-- Based on verification results showing sufficient data available
-- ============================================================================

SELECT '📊 PHASE 8: BUILDING REPORTS MODULE' as section;

-- ============================================================================
-- 1. PROJECT BUDGET VARIANCE REPORT VIEW
-- ============================================================================

CREATE OR REPLACE VIEW report_project_budget_variance AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.code as project_code,
    p.status as project_status,
    p.budget,
    p.actual_cost,
    p.variance,
    -- Calculate percentages
    CASE 
        WHEN p.budget > 0 THEN ROUND((p.actual_cost / p.budget) * 100, 2)
        ELSE 0
    END as budget_used_percent,
    CASE 
        WHEN p.budget > 0 THEN ROUND((p.variance / p.budget) * 100, 2)
        ELSE 0
    END as variance_percent,
    -- Budget health status
    CASE 
        WHEN p.variance < 0 THEN '🔴 Over Budget'
        WHEN p.variance = 0 THEN '⚫ At Budget'
        WHEN p.variance < (p.budget * 0.1) THEN '🟡 Critical (< 10% remaining)'
        WHEN p.variance < (p.budget * 0.2) THEN '🟠 Warning (< 20% remaining)'
        ELSE '🟢 Healthy'
    END as budget_health,
    -- Counts
    (SELECT COUNT(*) FROM orders WHERE project_id = p.id) as order_count,
    (SELECT COUNT(*) FROM deliveries WHERE project_id = p.id) as delivery_count,
    (SELECT COUNT(*) FROM expenses WHERE project_id = p.id AND status = 'approved') as expense_count,
    (SELECT COUNT(*) FROM payments WHERE project_id = p.id) as payment_count,
    -- Financial breakdown
    (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE project_id = p.id AND status = 'approved') as total_expenses,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE project_id = p.id AND status = 'paid') as total_payments,
    p.created_at,
    p.updated_at
FROM projects p
ORDER BY p.variance ASC;

COMMENT ON VIEW report_project_budget_variance IS 'Budget variance report showing project health, spending, and remaining budget';

-- ============================================================================
-- 2. VENDOR/SUPPLIER SUMMARY REPORT VIEW
-- ============================================================================

CREATE OR REPLACE VIEW report_vendor_summary AS
SELECT 
    vendor_name,
    COUNT(*) as total_payments,
    COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
    COUNT(*) FILTER (WHERE status = 'unpaid') as unpaid_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    SUM(amount) as total_amount,
    SUM(amount) FILTER (WHERE status = 'paid') as total_paid,
    SUM(amount) FILTER (WHERE status = 'unpaid') as total_unpaid,
    AVG(amount) as avg_payment,
    MIN(amount) as min_payment,
    MAX(amount) as max_payment,
    MIN(payment_date) as first_payment_date,
    MAX(payment_date) as last_payment_date,
    (MAX(payment_date) - MIN(payment_date)) as relationship_duration,
    -- Payment methods used
    COUNT(DISTINCT payment_method) as payment_methods_used,
    -- Projects worked on
    COUNT(DISTINCT project_id) as projects_count,
    -- Average days to payment
    AVG(CASE 
        WHEN status = 'paid' AND created_at IS NOT NULL AND payment_date IS NOT NULL
        THEN (payment_date - created_at::date)
        ELSE NULL
    END) as avg_days_to_payment
FROM payments
WHERE vendor_name IS NOT NULL
GROUP BY vendor_name
ORDER BY total_paid DESC;

COMMENT ON VIEW report_vendor_summary IS 'Comprehensive vendor/supplier payment summary with spending analytics';

-- ============================================================================
-- 3. EXPENSE CATEGORY BREAKDOWN REPORT VIEW
-- ============================================================================

CREATE OR REPLACE VIEW report_expense_category_breakdown AS
SELECT 
    category,
    COUNT(*) as expense_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    SUM(amount) as total_amount,
    SUM(amount) FILTER (WHERE status = 'approved') as approved_amount,
    SUM(amount) FILTER (WHERE status = 'pending') as pending_amount,
    AVG(amount) as avg_expense,
    MIN(amount) as min_expense,
    MAX(amount) as max_expense,
    -- Receipt tracking
    COUNT(*) FILTER (WHERE receipt_url IS NOT NULL) as with_receipt,
    COUNT(*) FILTER (WHERE receipt_url IS NULL) as missing_receipt,
    ROUND(
        COUNT(*) FILTER (WHERE receipt_url IS NOT NULL) * 100.0 / NULLIF(COUNT(*), 0),
        2
    ) as receipt_compliance_percent,
    -- Project linkage
    COUNT(*) FILTER (WHERE project_id IS NOT NULL) as linked_to_project,
    COUNT(*) FILTER (WHERE project_id IS NULL) as not_linked,
    -- Date range
    MIN(created_at)::date as earliest_expense,
    MAX(created_at)::date as latest_expense
FROM expenses
WHERE category IS NOT NULL
GROUP BY category
ORDER BY approved_amount DESC;

COMMENT ON VIEW report_expense_category_breakdown IS 'Expense breakdown by category with approval rates and receipt compliance';

-- ============================================================================
-- 4. MONTHLY FINANCIAL SUMMARY REPORT VIEW
-- ============================================================================

CREATE OR REPLACE VIEW report_monthly_financial_summary AS
SELECT 
    DATE_TRUNC('month', month_date)::date as month,
    TO_CHAR(month_date, 'YYYY-MM') as month_label,
    TO_CHAR(month_date, 'Mon YYYY') as month_display,
    -- Orders/Revenue (count only since we don't have revenue amounts)
    COALESCE(o.order_count, 0) as order_count,
    -- Expenses
    COALESCE(e.expense_count, 0) as expense_count,
    COALESCE(e.expense_amount, 0) as total_expenses,
    COALESCE(e.approved_amount, 0) as approved_expenses,
    -- Payments
    COALESCE(p.payment_count, 0) as payment_count,
    COALESCE(p.payment_amount, 0) as total_payments,
    COALESCE(p.paid_amount, 0) as paid_amount,
    -- Deliveries
    COALESCE(d.delivery_count, 0) as delivery_count,
    COALESCE(d.delivered_count, 0) as delivered_count
FROM (
    -- Generate series of months for last 12 months
    SELECT generate_series(
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months'),
        DATE_TRUNC('month', CURRENT_DATE),
        '1 month'::interval
    )::date as month_date
) months
LEFT JOIN (
    SELECT 
        DATE_TRUNC('month', created_at)::date as month,
        COUNT(*) as order_count
    FROM orders
    GROUP BY DATE_TRUNC('month', created_at)::date
) o ON o.month = months.month_date
LEFT JOIN (
    SELECT 
        DATE_TRUNC('month', created_at)::date as month,
        COUNT(*) as expense_count,
        SUM(amount) as expense_amount,
        SUM(amount) FILTER (WHERE status = 'approved') as approved_amount
    FROM expenses
    GROUP BY DATE_TRUNC('month', created_at)::date
) e ON e.month = months.month_date
LEFT JOIN (
    SELECT 
        DATE_TRUNC('month', payment_date)::date as month,
        COUNT(*) as payment_count,
        SUM(amount) as payment_amount,
        SUM(amount) FILTER (WHERE status = 'paid') as paid_amount
    FROM payments
    WHERE payment_date IS NOT NULL
    GROUP BY DATE_TRUNC('month', payment_date)::date
) p ON p.month = months.month_date
LEFT JOIN (
    SELECT 
        DATE_TRUNC('month', created_at)::date as month,
        COUNT(*) as delivery_count,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count
    FROM deliveries
    GROUP BY DATE_TRUNC('month', created_at)::date
) d ON d.month = months.month_date
ORDER BY month DESC;

COMMENT ON VIEW report_monthly_financial_summary IS 'Monthly rollup of all financial and operational metrics for trend analysis';

-- ============================================================================
-- 5. PROJECT PROFITABILITY REPORT VIEW
-- ============================================================================

CREATE OR REPLACE VIEW report_project_profitability AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.code as project_code,
    p.status as project_status,
    -- Budget info
    p.budget,
    p.actual_cost,
    p.variance as budget_remaining,
    -- Revenue (for future when we track it)
    0 as total_revenue,
    -- Costs
    COALESCE((SELECT SUM(amount) FROM expenses WHERE project_id = p.id AND status = 'approved'), 0) as total_expenses,
    COALESCE((SELECT SUM(amount) FROM payments WHERE project_id = p.id AND status = 'paid'), 0) as total_payments,
    -- Combined costs
    COALESCE((SELECT SUM(amount) FROM expenses WHERE project_id = p.id AND status = 'approved'), 0) +
    COALESCE((SELECT SUM(amount) FROM payments WHERE project_id = p.id AND status = 'paid'), 0) as total_costs,
    -- Profitability (revenue - costs) - will be negative until we track revenue
    0 - (
        COALESCE((SELECT SUM(amount) FROM expenses WHERE project_id = p.id AND status = 'approved'), 0) +
        COALESCE((SELECT SUM(amount) FROM payments WHERE project_id = p.id AND status = 'paid'), 0)
    ) as net_profit,
    -- Activity counts
    (SELECT COUNT(*) FROM orders WHERE project_id = p.id) as order_count,
    (SELECT COUNT(*) FROM deliveries WHERE project_id = p.id) as delivery_count,
    (SELECT COUNT(*) FROM expenses WHERE project_id = p.id) as expense_count,
    (SELECT COUNT(*) FROM payments WHERE project_id = p.id) as payment_count,
    -- Dates
    p.created_at as project_start,
    p.updated_at as last_activity
FROM projects p
ORDER BY p.created_at DESC;

COMMENT ON VIEW report_project_profitability IS 'Project profitability analysis showing revenue, costs, and net profit per project';

-- ============================================================================
-- 6. DELIVERY PERFORMANCE REPORT VIEW
-- ============================================================================

CREATE OR REPLACE VIEW report_delivery_performance AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.code as project_code,
    COUNT(d.id) as total_deliveries,
    COUNT(d.id) FILTER (WHERE d.status = 'delivered') as delivered_count,
    COUNT(d.id) FILTER (WHERE d.status = 'pending') as pending_count,
    COUNT(d.id) FILTER (WHERE d.status = 'partial') as partial_count,
    -- Delivery rate
    ROUND(
        COUNT(d.id) FILTER (WHERE d.status = 'delivered') * 100.0 / NULLIF(COUNT(d.id), 0),
        2
    ) as delivery_completion_rate,
    -- Dates
    MIN(d.created_at)::date as first_delivery_date,
    MAX(d.created_at)::date as last_delivery_date,
    MAX(d.delivered_at)::date as last_completed_delivery
FROM projects p
LEFT JOIN deliveries d ON d.project_id = p.id
GROUP BY p.id, p.name, p.code
HAVING COUNT(d.id) > 0
ORDER BY delivered_count DESC;

COMMENT ON VIEW report_delivery_performance IS 'Delivery performance metrics by project showing completion rates and status distribution';

-- ============================================================================
-- 7. CASH FLOW REPORT VIEW (Payments Only)
-- ============================================================================

CREATE OR REPLACE VIEW report_cash_flow AS
SELECT 
    DATE_TRUNC('month', payment_date)::date as month,
    TO_CHAR(payment_date, 'YYYY-MM') as month_label,
    -- Money out (payments made)
    COUNT(*) FILTER (WHERE status = 'paid') as payments_made_count,
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as cash_out,
    -- Money committed (unpaid)
    COUNT(*) FILTER (WHERE status = 'unpaid') as payments_due_count,
    COALESCE(SUM(amount) FILTER (WHERE status = 'unpaid'), 0) as cash_committed,
    -- Total
    COUNT(*) as total_payment_count,
    COALESCE(SUM(amount), 0) as total_payment_amount,
    -- Average
    AVG(amount) FILTER (WHERE status = 'paid') as avg_payment_made
FROM payments
WHERE payment_date IS NOT NULL
GROUP BY DATE_TRUNC('month', payment_date)::date, TO_CHAR(payment_date, 'YYYY-MM')
ORDER BY month DESC;

COMMENT ON VIEW report_cash_flow IS 'Monthly cash flow analysis showing payments made vs committed';

-- ============================================================================
-- 8. HELPER FUNCTION: Get Report Data by Date Range
-- ============================================================================

CREATE OR REPLACE FUNCTION get_financial_summary(
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    metric TEXT,
    count BIGINT,
    total_amount NUMERIC,
    avg_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Expenses (Approved)' as metric,
        COUNT(*)::BIGINT as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as avg_amount
    FROM expenses
    WHERE status = 'approved'
      AND created_at::date BETWEEN start_date AND end_date
    UNION ALL
    SELECT 
        'Payments (Paid)' as metric,
        COUNT(*)::BIGINT as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as avg_amount
    FROM payments
    WHERE status = 'paid'
      AND payment_date BETWEEN start_date AND end_date
    UNION ALL
    SELECT 
        'Orders' as metric,
        COUNT(*)::BIGINT as count,
        0 as total_amount,
        0 as avg_amount
    FROM orders
    WHERE created_at::date BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_financial_summary IS 'Get financial summary (expenses, payments, orders) for a specific date range';

-- ============================================================================
-- 9. HELPER FUNCTION: Get Top Vendors
-- ============================================================================

CREATE OR REPLACE FUNCTION get_top_vendors(
    limit_count INTEGER DEFAULT 10,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    vendor_name TEXT,
    payment_count BIGINT,
    total_paid NUMERIC,
    avg_payment NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.vendor_name,
        COUNT(*)::BIGINT as payment_count,
        COALESCE(SUM(p.amount), 0) as total_paid,
        COALESCE(AVG(p.amount), 0) as avg_payment
    FROM payments p
    WHERE p.vendor_name IS NOT NULL
      AND (start_date IS NULL OR p.payment_date >= start_date)
      AND (end_date IS NULL OR p.payment_date <= end_date)
    GROUP BY p.vendor_name
    ORDER BY total_paid DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_top_vendors IS 'Get top vendors by payment volume with optional date filtering';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT '=== TESTING REPORT VIEWS ===' as section;

-- Test Project Budget Variance Report
SELECT 'Project Budget Variance Report' as report;
SELECT * FROM report_project_budget_variance LIMIT 5;

-- Test Vendor Summary Report
SELECT 'Vendor Summary Report' as report;
SELECT * FROM report_vendor_summary LIMIT 5;

-- Test Expense Category Breakdown
SELECT 'Expense Category Breakdown' as report;
SELECT * FROM report_expense_category_breakdown LIMIT 5;

-- Test Monthly Financial Summary
SELECT 'Monthly Financial Summary' as report;
SELECT * FROM report_monthly_financial_summary LIMIT 6;

-- Test Project Profitability
SELECT 'Project Profitability Report' as report;
SELECT * FROM report_project_profitability LIMIT 5;

-- Test helper functions
SELECT 'Financial Summary Function (Last 30 days)' as report;
SELECT * FROM get_financial_summary(CURRENT_DATE - 30, CURRENT_DATE);

SELECT 'Top 5 Vendors' as report;
SELECT * FROM get_top_vendors(5);

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '=== PHASE 8 IMPLEMENTATION SUMMARY ===' as section;

SELECT 
    'Report Views Created' as component,
    7 as count,
    'Budget Variance, Vendor Summary, Expense Breakdown, Monthly Summary, Profitability, Delivery Performance, Cash Flow' as details
UNION ALL
SELECT 
    'Helper Functions Created' as component,
    2 as count,
    'get_financial_summary(), get_top_vendors()' as details;

SELECT '✅ Phase 8 Reports Module Implementation Complete!' as status;
