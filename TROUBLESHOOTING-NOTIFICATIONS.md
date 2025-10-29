# Troubleshooting: "Notifications Don't Work"

## When you say "doesn't work", what exactly is happening?

Please check each item and let me know which one describes your situation:

### Scenario A: Order Creation Issue
- [ ] I **cannot** create an order at all
- [ ] I can create an order but it doesn't save
- [ ] I create an order but can't find it in the orders list

### Scenario B: Order Approval Issue
- [ ] I cannot find the "Approve" button
- [ ] I click "Approve" but nothing happens
- [ ] I click "Approve" and get an error message
- [ ] Order approves successfully (status changes) but no notification

### Scenario C: Notification Display Issue
- [ ] Bell icon doesn't exist in navbar
- [ ] Bell icon exists but no badge appears
- [ ] Badge appears but dropdown is empty
- [ ] Notification exists in dropdown but doesn't mark as read when clicked
- [ ] Notification exists but clicking it doesn't navigate anywhere

### Scenario D: Database Issue
- [ ] Getting 401/403 errors in browser console
- [ ] Getting 500 errors in browser console
- [ ] No errors but notification just doesn't appear

## Step-by-Step Diagnostic

### Test 1: Check if Notifications Table Exists

1. Go to Supabase Dashboard
2. SQL Editor
3. Run this query:
```sql
SELECT COUNT(*) FROM notifications;
```

**Expected:** Should return a number (even if 0)
**If Error:** Table doesn't exist - need to run CREATE-NOTIFICATIONS-TABLE.sql

### Test 2: Check Direct Trigger (Known Working)

1. Go to: `http://localhost:3000/test-order-notif` (or your deployed URL)
2. Click "Send Test Order Approval Notification"
3. Wait 2 seconds
4. Check bell icon

**Expected:** Badge shows "1", dropdown has notification
**If Works:** System infrastructure is fine, issue is with automatic triggers

### Test 3: Check Order Has created_by Field

1. Go to Supabase Dashboard
2. Table Editor → purchase_orders
3. Look at your most recent order
4. Check if `created_by` column has a value (UUID)

**Expected:** Should have your user ID
**If NULL:** Orders aren't storing creator - need to fix order creation

### Test 4: Check Browser Console During Approval

1. Open browser dev tools (F12)
2. Go to Console tab
3. Clear console
4. Approve an order
5. Look for logs starting with 🔔

**Expected Logs:**
```
🔔 Notification check: { order_created_by: "...", approver_id: "...", ... }
🔔 TESTING MODE: Self-notifications enabled
🔔 Sending notification to user: ...
✅ Order approval notification sent
✅ In-app notification sent to user ...
```

**If Missing:** Server code not executing or deployment not updated

### Test 5: Check API Response

1. Open Network tab in dev tools (F12)
2. Approve an order
3. Find the PATCH request to `/api/orders/[id]`
4. Check Response tab

**Expected:** `{ "ok": true, "order": {...}, "message": "Order approved successfully" }`
**If Error:** Copy the error message

### Test 6: Check Database for Notifications

Run this in Supabase SQL Editor:
```sql
-- Check if notifications were created
SELECT 
    id,
    type,
    title,
    message,
    read,
    created_at
FROM notifications
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** Should see your test notifications
**If Empty:** Notifications aren't being created (trigger function failing)

### Test 7: Check Server Logs

If you're using Vercel:
1. Go to Vercel Dashboard
2. Select your project
3. Click "Logs" tab
4. Filter by your latest deployment
5. Approve an order
6. Look for 🔔 logs

**Expected:** See notification logs
**If Missing:** Code changes not deployed

## Quick Fixes by Scenario

### If Direct Test Works But Approval Doesn't:
**Problem:** Automatic trigger not executing
**Fix:**
1. Check if order has `created_by` field (Test 3)
2. Check console logs (Test 4)
3. Verify deployment is latest (git log)

### If No Bell Icon Visible:
**Problem:** NotificationBell component not rendering
**Fix:**
1. Check src/components/NotificationBell.tsx exists
2. Check it's imported in layout or navbar
3. Hard refresh browser (Ctrl+Shift+R)

### If Bell Exists But Badge Never Shows:
**Problem:** NotificationContext not working or API failing
**Fix:**
1. Check browser console for errors
2. Check Network tab for `/api/notifications` calls
3. Verify NotificationProvider in layout.tsx

### If Database Empty But No Errors:
**Problem:** Notification trigger function failing silently
**Fix:**
1. Check src/lib/notification-triggers.ts exists
2. Check createServiceClient() is working
3. Check Supabase service role key is set in .env

## What to Tell Me

Please run the tests above and tell me:

1. **Which scenario (A, B, C, or D) describes your issue?**
2. **Which tests PASS and which tests FAIL?**
3. **Any error messages from console or network tab?**
4. **Screenshot of what you see (if helpful)?**

This will help me pinpoint the exact issue and fix it quickly!

## Most Common Issues

### 1. Deployment Not Updated
**Symptom:** No TESTING MODE logs in console
**Fix:** 
```bash
git log -1  # Check latest commit
# Should show: "feat: Enable self-notifications for testing"
```

### 2. Order Missing created_by
**Symptom:** Console shows "Skipping notification: No created_by field"
**Fix:** Need to update order creation to set created_by

### 3. Notification Table Doesn't Exist
**Symptom:** Database errors in console
**Fix:** Run CREATE-NOTIFICATIONS-TABLE.sql in Supabase

### 4. Auto-Refresh Not Working
**Symptom:** Notification exists in DB but doesn't show until page refresh
**Fix:** Check NotificationContext is polling (30s interval)

### 5. RLS Policy Blocking
**Symptom:** Notifications created but can't be read
**Fix:** Check RLS policies in Supabase

---

**Run these tests and let me know the results!** 🔍
