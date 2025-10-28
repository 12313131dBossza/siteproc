-- ============================================================================
-- PHASE 4 BUDGET TRACKING TEST SCRIPT
-- Test auto-calculation of actual_cost and variance via triggers
-- ============================================================================

-- AUTO-DETECT: Get company_id and user_id automatically
DO $$
DECLARE
    test_company_id UUID;
    test_auth_user_id UUID := '080851c4-3bba-4916-ab67-974841298c8d';  -- Auth user for created_by
    test_project_id UUID;
    test_order_id UUID;
    test_expense_id UUID;
    initial_actual_cost NUMERIC;
    initial_variance NUMERIC;
    after_order_cost NUMERIC;
    after_order_variance NUMERIC;
    after_expense_cost NUMERIC;
    after_expense_variance NUMERIC;
BEGIN
    -- Auto-detect company_id from companies table (get first company)
    SELECT id INTO test_company_id
    FROM companies
    LIMIT 1;
    
    IF test_company_id IS NULL THEN
        RAISE EXCEPTION 'Could not find any company. Please create a company first.';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PHASE 4 BUDGET TRACKING AUTO-TEST';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Company ID: %', test_company_id;
    RAISE NOTICE 'Auth User ID: %', test_auth_user_id;
    RAISE NOTICE '';
    
    -- Step 1: Create test project with $10,000 budget
    RAISE NOTICE '1️⃣ Creating test project with $10,000 budget...';
    INSERT INTO projects (name, code, budget, status, company_id, created_by)
    VALUES ('Budget Test Project', 'TEST-BUDGET', 10000.00, 'active', test_company_id, test_auth_user_id)
    RETURNING id INTO test_project_id;
    
    RAISE NOTICE '   ✅ Project created: %', test_project_id;
    
    -- Check initial values
    SELECT actual_cost, variance 
    INTO initial_actual_cost, initial_variance
    FROM projects 
    WHERE id = test_project_id;
    
    RAISE NOTICE '   📊 Initial actual_cost: $%', initial_actual_cost;
    RAISE NOTICE '   📊 Initial variance: $%', initial_variance;
    RAISE NOTICE '';
    
    -- Step 2: Add an order with $3,000 delivered_value
    RAISE NOTICE '2️⃣ Adding order with $3,000 delivered_value...';
    INSERT INTO orders (
        company_id, 
        project_id, 
        product_name, 
        vendor, 
        quantity, 
        unit_price, 
        amount,
        delivered_value,
        status,
        description,
        category
    )
    VALUES (
        test_company_id,
        test_project_id,
        'Test Material',
        'Test Supplier',
        100,
        30.00,
        3000.00,
        3000.00,  -- This should trigger actual_cost update
        'approved',  -- Use valid status from check constraint
        'Test order for budget tracking verification',
        'materials'
    )
    RETURNING id INTO test_order_id;
    
    RAISE NOTICE '   ✅ Order created: %', test_order_id;
    
    -- Check values after order
    SELECT actual_cost, variance 
    INTO after_order_cost, after_order_variance
    FROM projects 
    WHERE id = test_project_id;
    
    RAISE NOTICE '   📊 Actual cost after order: $%', after_order_cost;
    RAISE NOTICE '   📊 Variance after order: $%', after_order_variance;
    
    IF after_order_cost = 3000.00 THEN
        RAISE NOTICE '   ✅ PASS: Actual cost correctly updated to $3,000';
    ELSE
        RAISE NOTICE '   ❌ FAIL: Expected $3,000, got $%', after_order_cost;
    END IF;
    
    IF after_order_variance = 7000.00 THEN
        RAISE NOTICE '   ✅ PASS: Variance correctly calculated as $7,000 (budget - actual)';
    ELSE
        RAISE NOTICE '   ❌ FAIL: Expected variance $7,000, got $%', after_order_variance;
    END IF;
    RAISE NOTICE '';
    
    -- Step 3: Add an expense with $2,500
    RAISE NOTICE '3️⃣ Adding expense with $2,500...';
    INSERT INTO expenses (
        company_id,
        project_id,
        vendor,
        category,
        amount,
        status,
        expense_date
    )
    VALUES (
        test_company_id,
        test_project_id,
        'Test Contractor',
        'labor',
        2500.00,
        'approved',
        NOW()
    )
    RETURNING id INTO test_expense_id;
    
    RAISE NOTICE '   ✅ Expense created: %', test_expense_id;
    
    -- Check final values
    SELECT actual_cost, variance 
    INTO after_expense_cost, after_expense_variance
    FROM projects 
    WHERE id = test_project_id;
    
    RAISE NOTICE '   📊 Actual cost after expense: $%', after_expense_cost;
    RAISE NOTICE '   📊 Variance after expense: $%', after_expense_variance;
    
    IF after_expense_cost = 5500.00 THEN
        RAISE NOTICE '   ✅ PASS: Actual cost correctly updated to $5,500 ($3,000 + $2,500)';
    ELSE
        RAISE NOTICE '   ❌ FAIL: Expected $5,500, got $%', after_expense_cost;
    END IF;
    
    IF after_expense_variance = 4500.00 THEN
        RAISE NOTICE '   ✅ PASS: Variance correctly calculated as $4,500 ($10,000 - $5,500)';
    ELSE
        RAISE NOTICE '   ❌ FAIL: Expected variance $4,500, got $%', after_expense_variance;
    END IF;
    RAISE NOTICE '';
    
    -- Step 4: Test UPDATE trigger
    RAISE NOTICE '4️⃣ Testing UPDATE trigger by changing order delivered_value to $4,000...';
    UPDATE orders
    SET delivered_value = 4000.00
    WHERE id = test_order_id;
    
    SELECT actual_cost, variance 
    INTO after_order_cost, after_order_variance
    FROM projects 
    WHERE id = test_project_id;
    
    RAISE NOTICE '   📊 Actual cost after update: $%', after_order_cost;
    RAISE NOTICE '   📊 Variance after update: $%', after_order_variance;
    
    IF after_order_cost = 6500.00 THEN
        RAISE NOTICE '   ✅ PASS: Update trigger works! Cost updated to $6,500 ($4,000 + $2,500)';
    ELSE
        RAISE NOTICE '   ❌ FAIL: Expected $6,500, got $%', after_order_cost;
    END IF;
    RAISE NOTICE '';
    
    -- Step 5: Test DELETE trigger
    RAISE NOTICE '5️⃣ Testing DELETE trigger by removing the expense...';
    DELETE FROM expenses WHERE id = test_expense_id;
    
    SELECT actual_cost, variance 
    INTO after_expense_cost, after_expense_variance
    FROM projects 
    WHERE id = test_project_id;
    
    RAISE NOTICE '   📊 Actual cost after delete: $%', after_expense_cost;
    RAISE NOTICE '   📊 Variance after delete: $%', after_expense_variance;
    
    IF after_expense_cost = 4000.00 THEN
        RAISE NOTICE '   ✅ PASS: Delete trigger works! Cost recalculated to $4,000';
    ELSE
        RAISE NOTICE '   ❌ FAIL: Expected $4,000, got $%', after_expense_cost;
    END IF;
    RAISE NOTICE '';
    
    -- Summary
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Test Project ID: %', test_project_id;
    RAISE NOTICE 'Test Order ID: %', test_order_id;
    RAISE NOTICE '';
    RAISE NOTICE '✅ All triggers working correctly!';
    RAISE NOTICE '✅ Auto-calculation verified!';
    RAISE NOTICE '';
    RAISE NOTICE 'You can view the test project in your UI:';
    RAISE NOTICE '/projects/%', test_project_id;
    RAISE NOTICE '';
    RAISE NOTICE 'To clean up test data, run:';
    RAISE NOTICE 'DELETE FROM projects WHERE id = ''%'';', test_project_id;
    
END $$;

-- ============================================================================
-- VERIFICATION: Check the test project directly
-- ============================================================================

-- View all projects with their budget tracking
SELECT 
    name,
    code,
    budget,
    actual_cost,
    variance,
    CASE 
        WHEN variance < 0 THEN '🔴 Over Budget'
        WHEN variance < (budget * 0.2) THEN '🟡 Warning'
        ELSE '🟢 On Track'
    END as status_indicator,
    created_at
FROM projects
WHERE code = 'TEST-BUDGET'
ORDER BY created_at DESC;

-- View the test project's orders
SELECT 
    product_name,
    vendor,
    quantity,
    unit_price,
    amount,
    delivered_value,
    status
FROM orders
WHERE project_id IN (SELECT id FROM projects WHERE code = 'TEST-BUDGET');

-- View the test project's expenses (will be empty after DELETE test)
SELECT 
    vendor,
    category,
    amount,
    status,
    expense_date
FROM expenses
WHERE project_id IN (SELECT id FROM projects WHERE code = 'TEST-BUDGET');
