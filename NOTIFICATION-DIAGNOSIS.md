# Notification System Diagnosis Guide

## Problem
- Database has notifications (confirmed via `/api/debug/check-notifications`)
- Bell icon shows NO badge
- Clicking bell shows nothing

## Systematic Diagnosis Steps

### Step 1: Verify Data Exists (✅ Already Confirmed)
You've confirmed notifications exist in database.

### Step 2: Check API Response
**Action:** Open browser, press F12 (open DevTools), go to Network tab, then visit any page.

**Look for:** Request to `/api/notifications`
- Should auto-fire within 30 seconds of page load
- Check response - should show `{"ok":true,"data":[...],"unreadCount":1}`

**If you DON'T see this request:**
- NotificationContext is not mounting
- Issue is in the Provider setup

**If request FAILS (red in Network tab):**
- Check the error response
- Likely authentication or RLS issue

**If request SUCCEEDS but returns empty:**
- RLS policy blocking your user
- Wrong user_id

### Step 3: Check React Context is Mounting
**Action:** Open `/notif-debug` page and check console logs

**Expected:** Should see logs like:
```
=== NOTIFICATION DEBUG ===
Loading: false
Unread Count: 1
Total Notifications: 1
```

**If you see "Loading: true" forever:**
- API request is hanging
- Check Network tab for the request

**If you see "Unread Count: 0" and "Total Notifications: 0":**
- Context is mounting but API returns empty
- RLS policy issue or wrong user

### Step 4: Check NotificationBell Component
**Action:** Open browser console and run:
```javascript
// Check if bell element exists
document.querySelector('[aria-label="Notifications"]')

// Check if badge exists
document.querySelector('.bg-red-500')
```

**If bell element is NULL:**
- NotificationBell component not rendering
- Check app layout

**If badge is NULL but unreadCount > 0:**
- Badge not rendering despite data
- CSS or conditional rendering issue

### Step 5: Check Browser Console for Errors
**Action:** Press F12, go to Console tab

**Look for:**
- Red error messages
- Failed network requests
- React errors about context

---

## Quick Tests You Can Run Right Now

### Test A: Direct API Call
Open browser console and paste:
```javascript
fetch('/api/notifications')
  .then(r => r.json())
  .then(d => console.log('API Response:', d))
```

**Expected:** `{ok: true, data: [...], unreadCount: 1}`

### Test B: Check if Context Exists
Open browser console and paste:
```javascript
// This will error if context doesn't exist
console.log('Context check - if this runs, context exists')
```

### Test C: Force Create Notification
Visit `/quick-notif-check` and click "Create Test Notification"

Then check:
1. Does API return success?
2. Does `/api/debug/check-notifications` show the new notification?
3. After 30 seconds, does bell show badge?

---

## Common Issues & Solutions

### Issue 1: RLS Policy Blocking User
**Symptom:** API returns empty despite notifications in DB
**Solution:** Check your user ID matches notification user_id
```sql
-- Run in Supabase SQL Editor
SELECT 
  n.id, 
  n.user_id, 
  n.title,
  auth.uid() as current_user_id,
  (n.user_id = auth.uid()) as is_match
FROM notifications n
ORDER BY created_at DESC
LIMIT 5;
```

### Issue 2: NotificationProvider Not Wrapping App
**Symptom:** useNotifications() throws "used outside provider" error
**Solution:** Check src/app/layout.tsx has NotificationProvider

### Issue 3: Context Mounting After Bell Renders
**Symptom:** Bell shows but no badge initially
**Solution:** Context loads async, bell should show after 30s auto-refresh

### Issue 4: Build Cache Issue
**Symptom:** Code deployed but old version still running
**Solution:** 
- Hard refresh (Ctrl+Shift+R)
- Clear browser cache
- Check Vercel deployment logs

---

## Decision Tree

**START:** Can you see the bell icon?
- NO → Layout issue, NotificationBell not imported
- YES → Continue

**Can you click the bell icon?**
- NO → JavaScript error, check console
- YES → Continue

**Does a dropdown appear when you click?**
- NO → Dropdown rendering issue
- YES → Continue

**Does the dropdown say "No notifications"?**
- YES → Context has no data, go to Step 2 above
- NO → Notifications showing, just no badge issue

**Is the badge (red circle with number) visible on the bell?**
- NO → This is your issue, badge not rendering
- YES → Working!

---

## Next Steps for You

Please do the following **in order** and report back:

1. **Open your app in browser**
2. **Press F12 to open DevTools**
3. **Go to Console tab**
4. **Refresh the page (F5)**
5. **Wait 5 seconds**
6. **Take a screenshot of:**
   - The entire screen (showing bell icon)
   - The Console tab (showing any logs/errors)
7. **Tell me:**
   - Do you see any red errors in console?
   - Do you see a request to `/api/notifications` in Network tab?
   - What does the bell icon look like (plain bell or with badge)?
   - When you click the bell, what happens?

This will tell us exactly where the breakdown is happening.
