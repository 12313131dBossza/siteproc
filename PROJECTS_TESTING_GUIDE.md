/**
 * 📋 PROJECTS MODULE - STEP-BY-STEP TESTING GUIDE
 * 
 * This guide provides specific steps to manually test each aspect of the Projects module
 * with real data from your database.
 */

console.log(`
🎯 PROJECTS MODULE TESTING GUIDE
================================

SETUP: First, let's get some real data to work with...

1️⃣ GET SAMPLE DATA FOR TESTING
==============================

Run these queries in your Supabase SQL editor to get test data:

-- Get available orders for testing
SELECT id, title, status, company_id, project_id, total_estimated, qty, unit_price 
FROM orders 
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()) 
LIMIT 5;

-- Get available expenses for testing  
SELECT id, description, amount, status, company_id, project_id
FROM expenses 
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
LIMIT 5;

-- Get available deliveries for testing
SELECT id, status, company_id, project_id
FROM deliveries 
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
LIMIT 5;

-- Get existing projects
SELECT id, name, code, budget, status, company_id
FROM projects 
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
ORDER BY created_at DESC;

2️⃣ TEST PROJECT → ORDERS ASSIGNMENT
===================================

Step 1: Navigate to a project detail page
• URL: /projects/[project-id]
• Note the current "# Orders" count in KPIs

Step 2: Go to "Orders" tab
• Paste order IDs (from query above) into text area
• Example: "order-123, order-456"
• Click "Assign to Project"

Step 3: Verify results
✅ Orders appear in project's Orders tab
✅ "# Orders" count increases in Overview
✅ No errors in browser console

Step 4: Test reassignment
• Go to different project
• Assign same orders to new project
✅ Orders move from old project to new project
✅ Old project's count decreases
✅ New project's count increases

Step 5: Test invalid IDs
• Try assigning "invalid-order-999"
✅ Should show error message
✅ Should NOT break the interface

3️⃣ TEST PROJECT → EXPENSES ASSIGNMENT
====================================

Step 1: Note current financial KPIs
• Budget: $X.XX
• Actual (Expenses): $Y.YY  
• Variance: $Z.ZZ

Step 2: Go to "Expenses" tab
• Assign expenses with known amounts
• Example: expense with $500.00 amount

Step 3: Verify calculations
✅ "Actual (Expenses)" increases by expense amount
✅ "Variance" = Budget - Actual Expenses
✅ "# Expenses" count increases
✅ Variance color: green if positive, red if negative

Step 4: Test edge cases
• Assign expense with $0.00 amount
✅ Should not break calculations
• Assign very large expense (>$1,000,000)
✅ Should handle large numbers properly

4️⃣ TEST PROJECT → DELIVERIES ASSIGNMENT
======================================

Step 1: Note current "# Deliveries" count

Step 2: Go to "Deliveries" tab
• Assign delivery IDs from your sample data

Step 3: Verify tracking
✅ "# Deliveries" count increases
✅ Deliveries appear in project view
✅ Data links properly if connected to orders

5️⃣ TEST ROLE-BASED ACCESS CONTROL
=================================

Admin Role Testing:
• Should see "Assign to Project" buttons
• Should be able to change project status
• Should be able to assign/reassign items

Viewer/Member Role Testing:
• Should NOT see assignment controls
• Should be read-only access
• Should show appropriate permission messages

Test this by:
1. Updating your profile role in database:
   UPDATE profiles SET role = 'viewer' WHERE id = auth.uid();
2. Refresh project page
3. Verify no assignment controls visible
4. Change back to admin: 
   UPDATE profiles SET role = 'admin' WHERE id = auth.uid();

6️⃣ TEST DATA INTEGRITY
======================

Cross-Company Protection:
• Try assigning orders from different company
✅ Should be rejected with error

Single Project Assignment:
• Verify items can only belong to one project
• Query: SELECT id, project_id FROM orders WHERE id = 'your-test-order';
✅ project_id should only have one value

Closed Project Protection:
• Set project status to "closed"
• Try to assign new items
✅ Should be rejected with "project_closed" error

7️⃣ TEST EDGE CASES
==================

Empty Assignments:
• Submit empty text areas
✅ Should handle gracefully (no error)

Malformed Input:
• Try: "order1,,,order2,   ,order3"
✅ Should parse correctly, ignore empty values

Large Data Sets:
• Assign 50+ items at once
✅ Should process without timeout

Invalid Project ID:
• Try URL: /projects/invalid-project-123
✅ Should show "project not found" error

8️⃣ INTEGRATION VERIFICATION
===========================

Global Data Consistency:
• Go to /admin/orders page
✅ Assigned orders should still appear
✅ project_id column should be populated

• Go to /admin/expenses page  
✅ Assigned expenses should still appear
✅ project_id column should be populated

• Go to /admin/deliveries page
✅ Assigned deliveries should still appear  
✅ project_id column should be populated

Project Overview Updates:
• Make assignments in one browser tab
• Refresh project page in another tab
✅ KPIs should reflect latest data
✅ No caching issues

9️⃣ PERFORMANCE TESTING
======================

Load Testing:
• Assign 100+ items to project
✅ Page should load in <3 seconds
✅ No browser freezing

Concurrent Access:
• Multiple users editing same project
✅ Data should remain consistent
✅ No race condition issues

🔟 FINAL VALIDATION QUERIES
===========================

Run these in Supabase to verify data integrity:

-- Verify no orphaned assignments
SELECT COUNT(*) as orphaned_orders
FROM orders 
WHERE project_id IS NOT NULL 
AND project_id NOT IN (SELECT id FROM projects);

-- Verify variance calculations
SELECT 
  p.name,
  p.budget,
  COALESCE(SUM(e.amount), 0) as actual_expenses,
  p.budget - COALESCE(SUM(e.amount), 0) as calculated_variance
FROM projects p
LEFT JOIN expenses e ON e.project_id = p.id AND e.status = 'approved'
GROUP BY p.id, p.name, p.budget;

-- Verify counts match
SELECT 
  p.name,
  COUNT(o.id) as order_count,
  COUNT(e.id) as expense_count,
  COUNT(d.id) as delivery_count
FROM projects p
LEFT JOIN orders o ON o.project_id = p.id
LEFT JOIN expenses e ON e.project_id = p.id  
LEFT JOIN deliveries d ON d.project_id = p.id
GROUP BY p.id, p.name;

✅ SUCCESS CRITERIA CHECKLIST
=============================

□ All KPI calculations are accurate
□ Data remains consistent across all views
□ Role-based permissions work correctly
□ No UI crashes with invalid input
□ Reassignment moves data properly
□ Cross-company protection enforced
□ Closed project protection works
□ Performance is acceptable (<3s load times)
□ Integration with global pages works
□ Database integrity maintained

🎉 COMPLETION
=============

Once all checkboxes are marked ✅, your Projects module is fully validated and ready for production use!

For any issues found, check:
1. Browser console for JavaScript errors
2. Network tab for API call failures  
3. Supabase logs for database errors
4. Verify RLS policies are properly configured
`);
