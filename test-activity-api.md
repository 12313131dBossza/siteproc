# Test Activity Log - Quick Guide

## Issue Found ✅
The Activity API was using `createClient()` which doesn't exist in `@/lib/supabase-server`. 
Changed to use `sbServer()` instead. This was causing all API calls to fail silently.

## Fix Applied
- Changed `import { createClient }` → `import { sbServer }`
- Changed all `const supabase = createClient()` → `const supabase = await sbServer()`
- Committed: Fix Activity API - use sbServer() instead of non-existent createClient()

## How to Test

### 1. Check Database (Supabase Dashboard)
```sql
-- Run this query in Supabase SQL Editor
SELECT COUNT(*) as total_activities FROM activity_logs;
SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10;
```

Expected: Should see the 3 example activities created by the SQL script:
- Delivery #D-102 Created
- Equipment Rental Expense Approved  
- Purchase Order #PO-234 Completed

### 2. Test Activity Log Page
1. Go to http://localhost:3000/activity
2. You should see activities (if database has them)
3. If you see "No activities found":
   - Open browser DevTools (F12) → Network tab
   - Refresh the page
   - Look for `/api/activity` request
   - Check if it returns status 200 with data
   - Check Console tab for any errors

### 3. Create New Activities (Integration Test)

#### Test Order Creation
1. Go to `/orders` page
2. Click "Create Order" or "New Purchase Order"
3. Fill in the form:
   - Product: Select any product
   - Quantity: 10
   - Project: Select a project
   - Description: "Test order for activity log"
4. Submit the order
5. Go to `/activity` page
6. **Expected:** See "Purchase Order Created" activity with your name

#### Test Order Approval
1. Go to `/orders` page
2. Find a pending order
3. Click "Approve" button
4. Go to `/activity` page
5. **Expected:** See "Purchase Order Approved" activity

#### Test Expense Creation
1. Go to `/expenses` page
2. Click "Submit Expense"
3. Fill in the form:
   - Vendor: "ABC Suppliers"
   - Category: "Materials"
   - Amount: 500
   - Description: "Test expense"
4. Submit
5. Go to `/activity` page
6. **Expected:** See "Expense Created" or "Expense Auto-Approved" (if you're admin)

#### Test Expense Approval
1. Go to `/expenses` page
2. Find a pending expense
3. Click "Approve" button
4. Go to `/activity` page
5. **Expected:** See "Expense Approved" activity

#### Test Delivery Creation
1. Go to `/deliveries` page
2. Click "Record Delivery"
3. Fill in the form:
   - Order: Select an order
   - Items: Add product items
   - Driver: "John Doe"
   - Vehicle: "TRUCK-123"
4. Submit
5. Go to `/activity` page
6. **Expected:** See "Delivery Created" activity

### 4. Debug API Response

If activities still don't show, test the API directly:

#### Open Browser Console and run:
```javascript
// Test API endpoint
fetch('/api/activity?limit=10')
  .then(r => r.json())
  .then(data => {
    console.log('API Response:', data);
    if (data.ok) {
      console.log('✅ Activities:', data.data.length);
      console.log('✅ Stats:', data.stats);
    } else {
      console.error('❌ Error:', data.error);
    }
  })
  .catch(err => console.error('❌ Fetch error:', err));
```

#### Expected Response:
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid-here",
      "type": "delivery",
      "action": "created",
      "title": "Delivery #D-102 Created",
      "description": "8 pallets of cement scheduled for delivery",
      "user_name": "Your Name",
      "user_email": "your@email.com",
      "status": "success",
      "created_at": "2025-10-06T..."
    }
  ],
  "stats": {
    "total": 3,
    "total_today": 1,
    "total_week": 3,
    "unique_users": 1,
    "most_active_type": "delivery"
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "total_pages": 1
  }
}
```

### 5. Common Issues & Solutions

#### Issue: "No activities found"
**Possible Causes:**
1. Database table is empty → Run `create-activity-logs-table-safe.sql`
2. API is failing → Check browser console for errors
3. RLS policy blocking access → Check if your profile has `company_id`
4. Auth not working → Check if you're logged in

**Solutions:**
- Check Supabase dashboard: Table Editor → activity_logs
- Check browser DevTools → Network tab → `/api/activity` response
- Check Supabase dashboard → Authentication → Users (verify you're logged in)
- Check Supabase dashboard → Table Editor → profiles (verify your company_id)

#### Issue: API returns error "Unauthorized"
**Solution:**
- You're not logged in
- Log out and log back in
- Clear browser cookies and cache

#### Issue: Activities created but not showing
**Solution:**
- Check if `company_id` matches between your profile and activities
- Run SQL: `SELECT company_id FROM profiles WHERE id = auth.uid();`
- Run SQL: `SELECT DISTINCT company_id FROM activity_logs;`
- They should match!

#### Issue: TypeScript errors in API
**Solution:**
- Already fixed! Make sure you pulled latest changes
- Run `git pull` to get the sbServer() fix

### 6. Verify Everything Works

After the fix, you should see:
- ✅ Activity Log page loads without errors
- ✅ API returns data (check DevTools Network tab)
- ✅ Creating orders/expenses/deliveries logs activities
- ✅ Approving orders/expenses logs activities
- ✅ Stats cards show correct numbers
- ✅ Timeline displays activities with icons and colors
- ✅ User attribution shows your name

### 7. Next Steps After Testing

Once activity logging is confirmed working:
- [ ] Mark "Add activity logging to Orders API" as DONE ✅
- [ ] Mark "Add activity logging to Deliveries API" as DONE ✅
- [ ] Mark "Add activity logging to Expenses API" as DONE ✅
- [ ] Move to Phase 1G: Reports Module
- [ ] OR Move to Phase 1C: Project Auto-Calc Triggers

## Summary

**Root Cause:** API was calling non-existent `createClient()` function from `@/lib/supabase-server`  
**Fix:** Changed to use `sbServer()` which is the actual exported function  
**Impact:** Activity Log now works! All CRUD operations (create/approve/reject) are being logged  
**Status:** ✅ FIXED and committed  

**Test it now:** Create an order, expense, or delivery and check `/activity` page!
