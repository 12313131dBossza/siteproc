-- ============================================================================
-- QUICK TEST: Phases 5 & 6 - Run this AFTER applying enhancements
-- ============================================================================
-- Instructions:
-- 1. First run PHASE5-EXPENSES-ENHANCEMENTS.sql
-- 2. Then run PHASE6-PAYMENTS-ENHANCEMENTS.sql
-- 3. Then run this script to verify everything works
-- ============================================================================

SELECT '🧪 STARTING QUICK TEST FOR PHASES 5 & 6' as test_status;

-- ============================================================================
-- PHASE 5: EXPENSES - QUICK TESTS
-- ============================================================================

SELECT '📊 PHASE 5: EXPENSES MODULE' as test_section;

-- Test 1: Check if expense views exist
SELECT 
    '✅ Test 1: Expense Views Exist' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.views 
            WHERE table_name = 'expense_dashboard_metrics'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.views 
            WHERE table_name = 'project_expense_summary'
        ) 
        THEN '✅ PASS - Both views created'
        ELSE '❌ FAIL - Views missing. Run PHASE5-EXPENSES-ENHANCEMENTS.sql'
    END as result;

-- Test 2: Query expense dashboard metrics
SELECT 
    '✅ Test 2: Expense Dashboard Metrics' as test_name;

SELECT 
    pending_count,
    approved_count,
    rejected_count,
    missing_receipts,
    unlinked_expenses,
    approved_total,
    pending_total,
    avg_expense_amount,
    total_expenses
FROM expense_dashboard_metrics;

-- Test 3: Query project expense summary (top 5)
SELECT 
    '✅ Test 3: Project Expense Summary' as test_name;

SELECT 
    project_name,
    project_code,
    expense_count,
    pending_expenses,
    approved_expenses,
    missing_receipts,
    total_expense_amount
FROM project_expense_summary
ORDER BY total_expense_amount DESC
LIMIT 5;

-- Test 4: Check if expense helper functions exist
SELECT 
    '✅ Test 4: Expense Helper Functions' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'expense_needs_attention'
        ) AND EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'get_expenses_needing_attention'
        )
        THEN '✅ PASS - Both functions exist'
        ELSE '❌ FAIL - Functions missing'
    END as result;

-- Test 5: Check expense trigger
SELECT 
    '✅ Test 5: Expense Notification Trigger' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE event_object_table = 'expenses'
              AND trigger_name = 'trigger_notify_pending_expense'
        )
        THEN '✅ PASS - Trigger exists'
        ELSE '❌ FAIL - Trigger missing'
    END as result;

-- Test 6: Check expense indexes
SELECT 
    '✅ Test 6: Expense Performance Indexes' as test_name;

SELECT 
    indexname,
    CASE 
        WHEN indexname IN ('idx_expenses_status_project', 'idx_expenses_created_at', 'idx_expenses_amount')
        THEN '✅ New index'
        ELSE '📋 Existing'
    END as index_type
FROM pg_indexes
WHERE tablename = 'expenses'
  AND schemaname = 'public'
ORDER BY indexname;

-- ============================================================================
-- PHASE 6: PAYMENTS - QUICK TESTS
-- ============================================================================

SELECT '💰 PHASE 6: PAYMENTS MODULE' as test_section;

-- Test 7: Check if payment views exist
SELECT 
    '✅ Test 7: Payment Views Exist' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.views 
            WHERE table_name = 'payment_dashboard_metrics'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.views 
            WHERE table_name = 'project_payment_summary'
        )
        THEN '✅ PASS - Both views created'
        ELSE '❌ FAIL - Views missing. Run PHASE6-PAYMENTS-ENHANCEMENTS.sql'
    END as result;

-- Test 8: Check if new payment columns exist
SELECT 
    '✅ Test 8: New Payment Columns' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'proof_url'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'notes'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'approved_by'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'approved_at'
        )
        THEN '✅ PASS - All 4 new columns exist (proof_url, notes, approved_by, approved_at)'
        ELSE '❌ FAIL - Some columns missing'
    END as result;

-- Test 9: Query payment dashboard metrics
SELECT 
    '✅ Test 9: Payment Dashboard Metrics' as test_name;

SELECT 
    unpaid_count,
    pending_count,
    paid_count,
    cancelled_count,
    missing_proof,
    unlinked_payments,
    paid_total,
    unpaid_total,
    pending_total,
    avg_payment_amount,
    total_payments
FROM payment_dashboard_metrics;

-- Test 10: Query project payment summary (top 5)
SELECT 
    '✅ Test 10: Project Payment Summary' as test_name;

SELECT 
    project_name,
    project_code,
    payment_count,
    paid_payments,
    unpaid_payments,
    missing_proof,
    paid_amount,
    unpaid_amount
FROM project_payment_summary
ORDER BY paid_amount DESC
LIMIT 5;

-- Test 11: Check if payment helper functions exist
SELECT 
    '✅ Test 11: Payment Helper Functions' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'payment_needs_attention'
        ) AND EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'get_payments_needing_attention'
        )
        THEN '✅ PASS - Both functions exist'
        ELSE '❌ FAIL - Functions missing'
    END as result;

-- Test 12: Check payment notification trigger
SELECT 
    '✅ Test 12: Payment Status Change Trigger' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE event_object_table = 'payments'
              AND trigger_name = 'trigger_notify_payment_status'
        )
        THEN '✅ PASS - Trigger exists'
        ELSE '❌ FAIL - Trigger missing'
    END as result;

-- Test 13: Check payment indexes
SELECT 
    '✅ Test 13: Payment Performance Indexes' as test_name;

SELECT 
    indexname,
    CASE 
        WHEN indexname IN ('idx_payments_status_date', 'idx_payments_vendor', 'idx_payments_amount')
        THEN '✅ New index'
        ELSE '📋 Existing'
    END as index_type
FROM pg_indexes
WHERE tablename = 'payments'
  AND schemaname = 'public'
ORDER BY indexname;

-- ============================================================================
-- ACTIVITY LOG INTEGRATION TESTS
-- ============================================================================

SELECT '📝 ACTIVITY LOG INTEGRATION' as test_section;

-- Test 14: Check recent expense activity logs
SELECT 
    '✅ Test 14: Recent Expense Activity Logs' as test_name;

SELECT 
    type,
    action,
    title,
    description,
    created_at
FROM activity_logs
WHERE type = 'expense'
ORDER BY created_at DESC
LIMIT 5;

-- Test 15: Check recent payment activity logs
SELECT 
    '✅ Test 15: Recent Payment Activity Logs' as test_name;

SELECT 
    type,
    action,
    title,
    description,
    created_at
FROM activity_logs
WHERE type = 'payment'
ORDER BY created_at DESC
LIMIT 5;

-- Test 16: Count activity logs by type
SELECT 
    '✅ Test 16: Activity Log Counts' as test_name;

SELECT 
    type,
    COUNT(*) as log_count,
    COUNT(DISTINCT action) as unique_actions
FROM activity_logs
WHERE type IN ('expense', 'payment')
GROUP BY type
ORDER BY type;

-- ============================================================================
-- DATA QUALITY CHECKS
-- ============================================================================

SELECT '🔍 DATA QUALITY ANALYSIS' as test_section;

-- Test 17: Expense data quality metrics
SELECT 
    '✅ Test 17: Expense Data Quality' as test_name;

SELECT 
    COUNT(*) as total_expenses,
    COUNT(CASE WHEN receipt_url IS NULL OR receipt_url = '' THEN 1 END) as missing_receipts,
    COUNT(CASE WHEN project_id IS NULL THEN 1 END) as no_project,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_approval,
    ROUND(
        COUNT(CASE WHEN receipt_url IS NULL OR receipt_url = '' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0), 
        2
    ) as pct_missing_receipts,
    ROUND(
        COUNT(CASE WHEN project_id IS NULL THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0), 
        2
    ) as pct_no_project
FROM expenses;

-- Test 18: Payment data quality metrics
SELECT 
    '✅ Test 18: Payment Data Quality' as test_name;

SELECT 
    COUNT(*) as total_payments,
    COUNT(CASE WHEN proof_url IS NULL OR proof_url = '' THEN 1 END) as missing_proof,
    COUNT(CASE WHEN project_id IS NULL AND order_id IS NULL AND expense_id IS NULL THEN 1 END) as no_linkage,
    COUNT(CASE WHEN status = 'unpaid' THEN 1 END) as unpaid_count,
    COUNT(CASE WHEN reference_number IS NULL OR reference_number = '' THEN 1 END) as no_reference,
    ROUND(
        COUNT(CASE WHEN proof_url IS NULL OR proof_url = '' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0), 
        2
    ) as pct_missing_proof,
    ROUND(
        COUNT(CASE WHEN project_id IS NULL AND order_id IS NULL AND expense_id IS NULL THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0), 
        2
    ) as pct_no_linkage
FROM payments;

-- ============================================================================
-- FUNCTION TESTS (SAMPLE)
-- ============================================================================

SELECT '🔧 FUNCTION TESTS' as test_section;

-- Test 19: Test get_expenses_needing_attention (if you have a company_id)
SELECT 
    '✅ Test 19: Get Expenses Needing Attention' as test_name;

-- Note: Replace 'YOUR-COMPANY-ID' with actual company_id from your database
-- Uncomment the line below to test:
-- SELECT * FROM get_expenses_needing_attention('YOUR-COMPANY-ID-HERE') LIMIT 5;

SELECT 
    'ℹ️ To test this function, run: SELECT * FROM get_expenses_needing_attention(''YOUR-COMPANY-ID'')' as instruction;

-- Test 20: Test get_payments_needing_attention (if you have a company_id)
SELECT 
    '✅ Test 20: Get Payments Needing Attention' as test_name;

-- Note: Replace 'YOUR-COMPANY-ID' with actual company_id from your database
-- Uncomment the line below to test:
-- SELECT * FROM get_payments_needing_attention('YOUR-COMPANY-ID-HERE') LIMIT 5;

SELECT 
    'ℹ️ To test this function, run: SELECT * FROM get_payments_needing_attention(''YOUR-COMPANY-ID'')' as instruction;

-- ============================================================================
-- GET YOUR COMPANY ID FOR TESTING
-- ============================================================================

SELECT 
    '📌 YOUR COMPANY IDs (for function testing)' as test_name;

SELECT 
    id as company_id,
    name as company_name,
    'Use this ID to test the helper functions above' as note
FROM companies
ORDER BY created_at DESC
LIMIT 3;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

SELECT '📊 TEST SUMMARY' as section;

SELECT 
    'Phase 5 (Expenses)' as phase,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'expense_dashboard_metrics')
        AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'expense_needs_attention')
        AND EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_notify_pending_expense')
        THEN '✅ ALL TESTS PASSED'
        ELSE '❌ SOME TESTS FAILED - Check results above'
    END as status
UNION ALL
SELECT 
    'Phase 6 (Payments)' as phase,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'payment_dashboard_metrics')
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'proof_url')
        AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'payment_needs_attention')
        AND EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_notify_payment_status')
        THEN '✅ ALL TESTS PASSED'
        ELSE '❌ SOME TESTS FAILED - Check results above'
    END as status;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================

SELECT '🎯 NEXT STEPS' as section;

SELECT 
    '1. If tests passed: Test UI features at /expenses and /payments' as step
UNION ALL
SELECT 
    '2. Create a new expense and check if activity is logged' as step
UNION ALL
SELECT 
    '3. Create a new payment and verify status change tracking' as step
UNION ALL
SELECT 
    '4. Check action items banner on /expenses page' as step
UNION ALL
SELECT 
    '5. Verify receipt prompts and project warnings appear' as step
UNION ALL
SELECT 
    '6. Review full testing guide in TESTING-PHASES-5-6.md' as step;

SELECT '✅ QUICK TEST COMPLETE!' as final_status;
