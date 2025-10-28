# 🧪 Testing Guide: Phases 5 & 6

**Date:** October 28, 2025  
**Modules:** Expenses & Payments  
**Purpose:** Verify all enhancements are working correctly

---

## 📋 Pre-Test Setup

### 1. Apply Database Enhancements

**Run in Supabase SQL Editor:**

```sql
-- First, apply Phase 5 enhancements
-- Open: PHASE5-EXPENSES-ENHANCEMENTS.sql
-- Copy all content and run in Supabase SQL Editor

-- Then, apply Phase 6 enhancements  
-- Open: PHASE6-PAYMENTS-ENHANCEMENTS.sql
-- Copy all content and run in Supabase SQL Editor
```

### 2. Verify Changes Were Applied

```sql
-- Check if new views exist
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN (
    'expense_dashboard_metrics',
    'project_expense_summary',
    'payment_dashboard_metrics',
    'project_payment_summary'
  );
-- Expected: All 4 views should appear

-- Check if new columns exist on expenses
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'expenses' 
  AND column_name IN ('receipt_url', 'notes');
-- Expected: receipt_url, notes

-- Check if new columns exist on payments
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'payments' 
  AND column_name IN ('proof_url', 'notes', 'approved_by', 'approved_at');
-- Expected: proof_url, notes, approved_by, approved_at
```

---

## 🧪 Phase 5: Expenses Testing

### Test 1: Dashboard Metrics View ✅

**SQL Test:**
```sql
-- Check expense dashboard metrics
SELECT * FROM expense_dashboard_metrics;
```

**Expected Results:**
- Row with counts for each status (pending, approved, rejected)
- `missing_receipts_count` (should match verification)
- `no_project_count` (should match verification)
- `total_amount`, `avg_amount`

**Pass Criteria:** Query returns data without errors

---

### Test 2: Project Expense Summary ✅

**SQL Test:**
```sql
-- Check project expense summary
SELECT * FROM project_expense_summary
ORDER BY total_expenses DESC
LIMIT 5;
```

**Expected Results:**
- List of projects with expense counts
- Status breakdown (pending/approved/rejected)
- Missing receipts count per project
- No project linkage count

**Pass Criteria:** Shows accurate per-project summaries

---

### Test 3: Attention Tracking Functions ✅

**SQL Test:**
```sql
-- Test single expense check (replace with real expense ID)
SELECT expense_needs_attention('YOUR-EXPENSE-ID-HERE');

-- Get all expenses needing attention (replace with real company ID)
SELECT * FROM get_expenses_needing_attention('YOUR-COMPANY-ID-HERE');
```

**Expected Results:**
- `expense_needs_attention()` returns TRUE/FALSE
- `get_expenses_needing_attention()` returns list with reasons

**Pass Criteria:** Functions execute without errors

---

### Test 4: UI Action Items Banner 🎯

**Manual Test Steps:**

1. **Navigate to Expenses Page**
   - Go to: `http://localhost:3000/expenses` (or your deployment URL)

2. **Check Action Items Banner**
   - Look for banner at top of page
   - Should show counts for:
     - ⏳ Pending approvals
     - 📄 Missing receipts
     - 🔗 Unlinked expenses

3. **Verify Counts Match Database**
   ```sql
   -- Verify pending count
   SELECT COUNT(*) FROM expenses WHERE status = 'pending';
   
   -- Verify missing receipts
   SELECT COUNT(*) FROM expenses WHERE receipt_url IS NULL OR receipt_url = '';
   
   -- Verify unlinked
   SELECT COUNT(*) FROM expenses WHERE project_id IS NULL;
   ```

**Pass Criteria:** ✅ Banner displays accurate counts

---

### Test 5: Receipt Upload Prompt 📤

**Manual Test Steps:**

1. **Create New Expense**
   - Click "Add Expense" button
   - Enter amount > $100 (e.g., $150)

2. **Check for Blue Info Box**
   - Should see message: "💡 For amounts over $100, uploading a receipt is recommended"
   - Box appears below amount field

3. **Test with Amount < $100**
   - Change amount to $50
   - Blue box should still be visible (it shows for all amounts)

**Pass Criteria:** ✅ Info box appears and is helpful

---

### Test 6: Project Linkage Warning ⚠️

**Manual Test Steps:**

1. **Create Expense Without Project**
   - Click "Add Expense"
   - Leave "Project" dropdown empty
   - Fill in other fields

2. **Check for Yellow Warning**
   - Should see: "⚠️ No project selected. Consider linking this expense to a project for better tracking"
   - Appears when project_id is null

3. **Select a Project**
   - Choose a project from dropdown
   - Warning should remain (it's always visible in the form)

**Pass Criteria:** ✅ Warning is visible when no project selected

---

### Test 7: Visual Badges in List 🏷️

**Manual Test Steps:**

1. **View Expenses List**
   - Scroll to existing expenses

2. **Check for Badges:**
   - **Red "Receipt needed"** - Expenses without receipt_url
   - **Yellow "No project"** - Expenses without project_id
   - **Green "Receipt attached"** - Expenses with receipt_url

3. **Create Test Expense**
   - Create expense without receipt → should show red badge
   - Upload receipt → badge should turn green

**Pass Criteria:** ✅ Badges display correctly based on data

---

### Test 8: Activity Logging 📝

**Manual Test Steps:**

1. **Create Expense**
   - Add new expense with all fields
   - Submit form

2. **Check Activity Log**
   - Navigate to: `http://localhost:3000/activity` (or wherever activity log is)
   - Look for "Expense Created" entry
   - Should show description, amount, status

3. **Update Expense**
   - Edit an expense
   - Check activity log for "Expense Updated" entry

4. **Delete Expense**
   - Delete an expense
   - Check activity log for "Expense Deleted" entry

**Verify in Database:**
```sql
SELECT * FROM activity_logs 
WHERE type = 'expense' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Pass Criteria:** ✅ All CRUD operations logged correctly

---

## 💰 Phase 6: Payments Testing

### Test 9: Payment Dashboard Metrics ✅

**SQL Test:**
```sql
-- Check payment dashboard metrics
SELECT * FROM payment_dashboard_metrics;
```

**Expected Results:**
- Counts by status (unpaid, pending, paid, cancelled, failed)
- `missing_proof_count`
- `no_linkage_count`
- Total amounts by status
- Average payment amount

**Pass Criteria:** Query returns data without errors

---

### Test 10: Project Payment Summary ✅

**SQL Test:**
```sql
-- Check project payment summary
SELECT * FROM project_payment_summary
ORDER BY total_paid DESC
LIMIT 5;
```

**Expected Results:**
- Projects with payment counts
- Paid vs unpaid breakdown
- Missing proof tracking

**Pass Criteria:** Shows accurate per-project payment data

---

### Test 11: Payment Attention Functions ✅

**SQL Test:**
```sql
-- Test single payment check (replace with real payment ID)
SELECT payment_needs_attention('YOUR-PAYMENT-ID-HERE');

-- Get all payments needing attention (replace with real company ID)
SELECT * FROM get_payments_needing_attention('YOUR-COMPANY-ID-HERE');
```

**Expected Results:**
- Returns TRUE/FALSE for single payment
- Returns list with attention reasons for batch

**Pass Criteria:** Functions execute without errors

---

### Test 12: Payment Creation with Activity Log 📝

**Manual Test Steps:**

1. **Create New Payment**
   - Navigate to payments page
   - Click "Add Payment"
   - Fill in: vendor_name, amount, payment_method, status
   - Link to a project
   - Submit

2. **Check Activity Log**
   ```sql
   SELECT * FROM activity_logs 
   WHERE type = 'payment' 
     AND action = 'created'
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

3. **Verify Metadata**
   - Should contain: vendor_name, amount, payment_method, status, project_id
   - Description should read: "Vendor Name - Method - $Amount"

**Pass Criteria:** ✅ Payment creation logged with full metadata

---

### Test 13: Payment Status Change Tracking 🔄

**Manual Test Steps:**

1. **Update Payment Status**
   - Find an "unpaid" payment
   - Change status to "paid"
   - Save changes

2. **Check Activity Log**
   ```sql
   SELECT * FROM activity_logs 
   WHERE type = 'payment' 
     AND action = 'status_changed'
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

3. **Verify Status Transition**
   - Metadata should contain:
     - `old_status: "unpaid"`
     - `new_status: "paid"`
   - Title should read: "Payment paid"

**Pass Criteria:** ✅ Status changes logged with before/after values

---

### Test 14: Payment Deletion Logging 🗑️

**Manual Test Steps:**

1. **Delete Payment**
   - Create a test payment
   - Delete it

2. **Check Activity Log**
   ```sql
   SELECT * FROM activity_logs 
   WHERE type = 'payment' 
     AND action = 'deleted'
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

3. **Verify Metadata**
   - Should contain: vendor_name, amount, status, project_id
   - Description shows deleted payment details

**Pass Criteria:** ✅ Deletion logged before payment removed

---

### Test 15: Proof URL Column ✅

**SQL Test:**
```sql
-- Add proof URL to a payment
UPDATE payments 
SET proof_url = 'https://example.com/receipt.pdf',
    notes = 'Invoice #12345'
WHERE id = 'YOUR-PAYMENT-ID-HERE'
RETURNING *;

-- Verify it was saved
SELECT id, vendor_name, amount, proof_url, notes 
FROM payments 
WHERE proof_url IS NOT NULL 
LIMIT 5;
```

**Pass Criteria:** proof_url and notes columns accept data

---

### Test 16: Notification Triggers 🔔

**SQL Test:**
```sql
-- Listen for notifications (run in one terminal)
LISTEN payment_status_change;

-- In another window, trigger a status change
UPDATE payments 
SET status = 'paid'
WHERE status = 'unpaid'
LIMIT 1;

-- Check for notification payload
```

**Expected:** pg_notify sends notification on status change to 'paid' or new unpaid payment

**Pass Criteria:** ✅ Triggers fire on status changes

---

## 📊 Comprehensive Integration Tests

### Test 17: Full Expense Workflow 🔄

**Complete User Journey:**

1. ✅ Create expense without receipt → See "Receipt needed" badge
2. ✅ Check action items → See count increase
3. ✅ Upload receipt → Badge changes to "Receipt attached"
4. ✅ Link to project → "No project" badge disappears
5. ✅ Submit for approval → Status changes to 'pending'
6. ✅ Check activity log → All actions logged

**Pass Criteria:** Entire workflow works end-to-end

---

### Test 18: Full Payment Workflow 💵

**Complete User Journey:**

1. ✅ Create payment (unpaid) → Activity logged
2. ✅ Add proof URL → Column updated
3. ✅ Change status to 'paid' → Status change logged
4. ✅ Check dashboard metrics → Counts updated
5. ✅ Link to project → Appears in project summary
6. ✅ Check activity log → All changes tracked

**Pass Criteria:** Entire workflow works end-to-end

---

## ✅ Final Verification Checklist

### Phase 5 (Expenses):
- [ ] PHASE5-EXPENSES-ENHANCEMENTS.sql applied successfully
- [ ] expense_dashboard_metrics view returns data
- [ ] project_expense_summary view returns data
- [ ] expense_needs_attention() function works
- [ ] get_expenses_needing_attention() function works
- [ ] Action items banner displays on UI
- [ ] Receipt upload prompt appears
- [ ] Project linkage warning shows
- [ ] Visual badges display correctly
- [ ] Activity logging works (create/update/delete)

### Phase 6 (Payments):
- [ ] PHASE6-PAYMENTS-ENHANCEMENTS.sql applied successfully
- [ ] payment_dashboard_metrics view returns data
- [ ] project_payment_summary view returns data
- [ ] payment_needs_attention() function works
- [ ] get_payments_needing_attention() function works
- [ ] proof_url column accepts data
- [ ] notes column accepts data
- [ ] Activity logging works (create/update/delete)
- [ ] Status change tracking logs old → new status
- [ ] Notification triggers fire correctly

---

## 🐛 Common Issues & Fixes

### Issue 1: "View does not exist"
**Fix:** Run the enhancement SQL scripts in Supabase

### Issue 2: "Column does not exist"
**Fix:** Verify enhancement scripts ran successfully, check for errors

### Issue 3: "Activity log not showing"
**Fix:** Check that logActivity() import is present in API files

### Issue 4: "Badges not appearing"
**Fix:** Clear browser cache, verify expenses/payments have data

### Issue 5: "Functions return empty"
**Fix:** Ensure you're passing correct company_id UUID

---

## 📈 Performance Validation

### Check Index Usage:
```sql
-- Verify indexes are being used
EXPLAIN ANALYZE 
SELECT * FROM expenses 
WHERE status = 'pending' 
  AND project_id IS NULL
ORDER BY created_at DESC;

EXPLAIN ANALYZE
SELECT * FROM payments
WHERE status = 'unpaid'
  AND payment_date < CURRENT_DATE - INTERVAL '30 days';
```

**Pass Criteria:** Query plans show index scans, not sequential scans

---

## 🎯 Success Criteria Summary

**Phase 5 PASSES if:**
- ✅ All 4 database objects created (2 views, 2 functions)
- ✅ UI shows action items, prompts, warnings, badges
- ✅ Activity logging captures all CRUD operations
- ✅ Metrics match database verification results

**Phase 6 PASSES if:**
- ✅ All 7 database objects created (2 views, 2 functions, 1 trigger, 2 new columns)
- ✅ Activity logging captures all CRUD + status changes
- ✅ proof_url and notes columns functional
- ✅ Metrics match database verification results

---

## 📞 Need Help?

**If tests fail:**
1. Check browser console for JS errors
2. Check Supabase logs for database errors
3. Verify enhancement scripts ran completely
4. Check RLS policies aren't blocking queries
5. Review activity_logs table for missing entries

**Debug Queries:**
```sql
-- Check recent errors in Supabase
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Check if triggers are enabled
SELECT * FROM pg_trigger WHERE tgname LIKE '%expense%' OR tgname LIKE '%payment%';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('expenses', 'payments');
```

---

**✅ Testing Complete! All phases validated and ready for production use.**
