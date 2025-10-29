# Testing Notifications with Two User Accounts

## Overview
This guide shows how to test the automatic notification system with 2 different user accounts to verify real-world workflows.

## Why Two Users?
The notification system is designed to notify users when **someone else** performs an action on their items:
- When Admin B approves an order created by User A → User A gets notified
- When you approve your own order → No notification (by design, prevents self-notifications)

## Setup Steps

### Step 1: Create Two User Accounts

You need two separate user accounts in your system:

**Account A (Regular User/Creator)**
- Email: `user1@example.com` (or your existing account)
- Role: Regular user or employee
- Purpose: Creates orders, expenses, etc.

**Account B (Admin/Approver)**
- Email: `admin@example.com` (or create new account)
- Role: Admin or owner
- Purpose: Approves/rejects items created by Account A

### Step 2: Access Both Accounts

**Option 1: Use Different Browsers**
- Chrome: Login as User A
- Edge/Firefox: Login as Admin B

**Option 2: Use Incognito/Private Windows**
- Regular window: User A
- Incognito window: Admin B

**Option 3: Use Browser Profiles**
- Chrome Profile 1: User A
- Chrome Profile 2: Admin B

## Testing Workflows

### Test 1: Order Approval Notification

**With Account A (User):**
1. Login to the system
2. Navigate to Orders → Create New Order
3. Fill in order details:
   - Project: Select a project
   - Products: Add some items
   - Notes: "Test order for notification"
4. Save the order (status will be "pending")
5. **Keep this window open** to see notification arrive

**With Account B (Admin):**
1. Login in a different browser/window
2. Navigate to Orders
3. Find the order created by Account A
4. Click "Approve" button
5. Confirm approval

**Expected Result on Account A:**
- Bell icon shows badge with "1"
- Click bell to see notification:
  - Title: "Order Approved"
  - Message: "Your order #[number] for [project] has been approved by [Admin Name]"
  - Click notification → Navigate to order details
  - Notification marked as read

### Test 2: Order Rejection Notification

**With Account A:**
1. Create another order
2. Keep window open

**With Account B:**
1. Find the new order
2. Click "Reject" button
3. Enter rejection reason: "Missing signatures"
4. Confirm rejection

**Expected Result on Account A:**
- Bell shows new notification
- Title: "Order Rejected"
- Message: "Your order #[number] has been rejected by [Admin Name]. Reason: Missing signatures"

### Test 3: Expense Approval Notification

**With Account A:**
1. Navigate to Expenses → Add Expense
2. Fill in details:
   - Vendor: "Office Supplies Co"
   - Amount: $150.00
   - Category: "Office Supplies"
   - Description: "Test expense"
3. Submit expense
4. Keep window open

**With Account B:**
1. Navigate to Expenses
2. Find expense from Account A
3. Click "Approve"

**Expected Result on Account A:**
- Notification: "Expense Approved - Your $150.00 expense to Office Supplies Co has been approved by [Admin Name]"

### Test 4: Delivery Status Notification

**With Account A:**
1. Create an order with delivery items
2. Wait for order approval

**With Account B (or delivery manager):**
1. Navigate to Deliveries
2. Find delivery for Account A's order
3. Click "Mark as Delivered"

**Expected Result on Account A:**
- Notification: "Delivery Update - Delivery #[number] for [project] status changed to delivered"

### Test 5: Payment Notification

**With Account A:**
1. Navigate to Payments → Add Payment
2. Create a payment:
   - Amount: $500
   - Vendor: "Supplier ABC"
   - Method: "Check"
3. Save payment

**Expected Result on Account B (Admin):**
- If Account B is Admin/Owner/Bookkeeper → Receives notification
- Message: "New Payment Created - [User A Name] created a payment of $500.00 to Supplier ABC"

## Auto-Refresh Feature

The notification system automatically checks for new notifications every 30 seconds.

**To Test:**
1. Login as User A
2. Keep the page open
3. In another browser, login as Admin B and approve an order
4. **Wait up to 30 seconds** on User A's screen
5. The bell badge should update automatically (no page refresh needed)

## Verification Checklist

Use this checklist to verify all features work:

- [ ] **Badge Count**: Bell shows correct number of unread notifications
- [ ] **Dropdown Opens**: Click bell to see notification list
- [ ] **Grouped by Date**: Notifications show "TODAY", "YESTERDAY", or specific dates
- [ ] **Mark as Read**: Click notification → Marked as read, background turns white
- [ ] **Delete**: Hover over notification → Click trash icon → Notification removed
- [ ] **Mark All as Read**: Click "Mark all as read" → All turn white, badge clears
- [ ] **Navigation**: Click notification → Redirects to correct page (order, expense, etc.)
- [ ] **Auto-Refresh**: New notifications appear within 30 seconds without page refresh
- [ ] **Unread Styling**: Unread = blue background, Read = white background
- [ ] **Icons**: Each notification type shows correct emoji (✅ approved, ❌ rejected, etc.)

## Troubleshooting

### "I don't see notifications after approval"

**Check:**
1. Are you using **different users**? Same user won't get notification
2. Is the bell icon showing on the page? Should be in navbar
3. Wait 30 seconds for auto-refresh
4. Click bell icon to open dropdown
5. Check browser console for errors (F12 → Console tab)

### "Badge count is wrong"

**Fix:**
1. Refresh the page
2. Mark all as read
3. Check `/api/notifications` endpoint directly:
   ```
   Open browser dev tools
   Console tab:
   fetch('/api/notifications').then(r => r.json()).then(console.log)
   ```

### "Notifications not auto-refreshing"

**Check:**
1. Keep the page open for at least 30 seconds
2. Check console for fetch errors
3. Verify NotificationProvider is wrapping the app (should be in layout.tsx)

### "Getting 403 or unauthorized errors"

**Fix:**
1. Logout and login again
2. Clear browser cache
3. Check Supabase session is valid
4. Verify RLS policies are enabled on notifications table

## Database Verification

To check notifications were created in database:

**SQL Query (run in Supabase SQL Editor):**
```sql
-- See all notifications for your account
SELECT 
    id,
    type,
    title,
    message,
    read,
    created_at,
    link
FROM notifications
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 20;

-- See unread count
SELECT COUNT(*) as unread_count
FROM notifications
WHERE user_id = auth.uid()
  AND read = FALSE;
```

## API Testing

Test the notification API directly:

**GET Notifications:**
```bash
curl http://localhost:3000/api/notifications
```

**Mark as Read:**
```bash
curl -X PATCH http://localhost:3000/api/notifications/[notification-id] \
  -H "Content-Type: application/json" \
  -d '{"read": true}'
```

**Delete Notification:**
```bash
curl -X DELETE http://localhost:3000/api/notifications/[notification-id]
```

## Success Criteria

✅ **Phase 14 is working correctly if:**

1. Creating order as User A → Approving as Admin B → User A sees notification
2. Badge count shows correct number of unread
3. Clicking notification marks it as read
4. Notifications auto-refresh within 30 seconds
5. Delete removes notification from list
6. Mark all as read clears badge
7. Navigation on click goes to correct page
8. Different notification types show correct icons/messages

## Next Steps After Testing

Once you've verified everything works with 2 users:

1. **Keep the system as-is** (recommended for production)
   - Only different users get notifications
   - Prevents cluttering own notification feed

2. **Optional: Enable self-notifications for testing**
   - Modify code to remove same-user check
   - Useful for demo purposes or single-user testing

3. **Proceed to Phase 15**
   - Notifications system is complete and working
   - Ready for next feature implementation

## Notes

- **Real-time**: System uses polling (30s), not WebSockets (simplicity)
- **Performance**: Indexes ensure fast queries even with many notifications
- **Cleanup**: Old read notifications can be cleaned up (90+ days) via helper function
- **RLS Security**: Users can only see/modify their own notifications
- **Multi-tenant**: Notifications are scoped to company_id
- **Extensible**: Easy to add new notification types (just add to enum)

---

**Ready to Test!** 🚀

Follow the workflows above with 2 different user accounts to see the notification system in action.
