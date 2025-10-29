# Testing Automatic Notifications

## Overview
Automatic notifications have been implemented for the following workflows:
1. **Order Approvals/Rejections** - Notify order creator when admin approves/rejects their order
2. **Expense Approvals/Rejections** - Notify employee when admin approves/rejects their expense
3. **Delivery Status Changes** - Notify order creator when delivery is marked as delivered
4. **Payment Creation** - Notify approvers (admins/owners/bookkeepers) when new payment is created

## How It Works
- Notifications are created automatically in the database when certain actions occur
- The NotificationBell component auto-polls every 30 seconds to fetch new notifications
- Notifications appear with a blue background when unread
- Click a notification to navigate to the related item
- Mark as read individually or all at once

## Testing Instructions

### 1. Test Order Approval Notification

**Setup:**
1. Log in as a regular user (not admin)
2. Create a new order/purchase request
3. Note the order ID or number
4. Log out

**Test:**
1. Log in as an admin/owner
2. Navigate to Orders
3. Find the order you created
4. Click "Approve" or "Reject" the order
5. Log out

**Expected Result:**
1. Log back in as the original user who created the order
2. Within 30 seconds, notification bell should show a badge
3. Click the bell - you should see notification:
   - **Approved:** "Your order #XXX for [Project] has been approved by [Admin Name]."
   - **Rejected:** "Your order #XXX for [Project] was rejected by [Admin Name]: [reason]"
4. Click the notification to navigate to the order details

---

### 2. Test Expense Approval Notification

**Setup:**
1. Log in as a regular user
2. Submit a new expense
3. Note the expense ID
4. Log out

**Test:**
1. Log in as an admin/owner/bookkeeper
2. Navigate to Expenses
3. Find the expense you submitted
4. Click "Approve" or "Reject"
5. Add notes/reason if rejecting
6. Log out

**Expected Result:**
1. Log back in as the user who submitted the expense
2. Within 30 seconds, notification bell should show a badge
3. Click the bell - you should see notification:
   - **Approved:** "Your [category] expense for $XX.XX ([vendor]) has been approved by [Admin Name]."
   - **Rejected:** "Your [category] expense for $XX.XX ([vendor]) was rejected by [Admin Name]: [reason]"
4. Click the notification to navigate to the expense details

---

### 3. Test Delivery Status Notification

**Setup:**
1. Log in as a user
2. Create an order with deliveries
3. Note the delivery ID
4. Log out

**Test:**
1. Log in as an admin or user with delivery management permissions
2. Navigate to Deliveries
3. Find the delivery
4. Click "Mark as Delivered"
5. Add any notes if desired
6. Confirm

**Expected Result:**
1. Log back in as the user who created the original order
2. Within 30 seconds, notification bell should show a badge
3. Click the bell - you should see notification:
   - "Delivery #XXX for [Project] is now delivered."
4. Click the notification to navigate to the order/delivery

---

### 4. Test Payment Creation Notification

**Setup:**
1. Log in as a regular user (not admin/owner/bookkeeper)

**Test:**
1. Navigate to Payments
2. Click "Create Payment"
3. Fill in payment details:
   - Vendor name (required)
   - Amount (required)
   - Payment method
   - Any other details
4. Submit the payment
5. Log out

**Expected Result:**
1. Log in as an admin, owner, or bookkeeper
2. Within 30 seconds, notification bell should show a badge
3. Click the bell - you should see notification:
   - "$XX.XX to [Vendor] via [Method] requires your approval (submitted by [User Name])."
4. Click the notification to navigate to the payment details

---

## Quick Test Checklist

- [ ] Order approved → Creator gets notification
- [ ] Order rejected → Creator gets notification with reason
- [ ] Expense approved → Submitter gets notification
- [ ] Expense rejected → Submitter gets notification with reason
- [ ] Delivery marked delivered → Order creator gets notification
- [ ] Payment created → Admins/owners/bookkeepers get notification
- [ ] Bell badge count updates automatically
- [ ] Notifications appear in dropdown with correct formatting
- [ ] Clicking notification navigates to correct page
- [ ] Mark as read works for individual notifications
- [ ] Mark all as read works
- [ ] Delete notification works
- [ ] Date grouping works (Today, Yesterday, dates)

## Troubleshooting

### Notifications not appearing:
1. **Wait 30 seconds** - Auto-polling interval
2. **Refresh the page** - Forces immediate fetch
3. **Check console** - Look for errors in browser DevTools
4. **Check database** - Query notifications table directly in Supabase:
   ```sql
   SELECT * FROM notifications 
   WHERE user_id = 'your-user-id' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

### Bell badge not updating:
1. Check NotificationContext is mounted (should be in layout.tsx)
2. Check auto-polling is running (console should show periodic fetches)
3. Verify notifications API endpoint returns data

### Wrong user getting notification:
1. Check `created_by` field in orders/expenses
2. Verify `submitted_by` field in expenses
3. Check notification recipient logic in API routes

### Notification link broken:
1. Verify entity IDs are correct in notification metadata
2. Check link format matches your routing structure

## Logs to Check

**Server Logs (Vercel):**
- Look for `✅ In-app notification sent to user [id]`
- Check for `Failed to create in-app notification:` errors

**Browser Console:**
- Look for notification API calls (`GET /api/notifications`)
- Check for errors during notification creation
- Monitor auto-polling behavior

## API Endpoints Used

- `POST /api/notifications` - Create notification (called from triggers)
- `GET /api/notifications` - Fetch user's notifications (auto-polling)
- `PATCH /api/notifications/[id]` - Mark as read
- `POST /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/[id]` - Delete notification

## Database Tables

**notifications:**
- `id` - UUID
- `user_id` - Recipient
- `company_id` - Company scope
- `type` - Notification type (order_approved, expense_rejected, etc.)
- `title` - Short title
- `message` - Full message text
- `link` - Navigation URL
- `read` - Boolean
- `metadata` - JSON with extra data
- `created_at` - Timestamp
- `read_at` - When marked as read

## Next Steps After Testing

Once you've verified all notification types work:

1. **Remove test pages** (optional):
   - Delete `/test-notifications` page
   - Delete `/debug-notifications` page
   - Delete debug API endpoint

2. **Customize notifications** (optional):
   - Adjust message formatting in `notification-triggers.ts`
   - Add more notification types for other workflows
   - Customize auto-polling interval in NotificationContext

3. **Add email integration** (future):
   - Send email in addition to in-app notification
   - Add user preference for notification channels
   - Implement digest emails for multiple notifications

## Files Modified

1. **Created:**
   - `src/lib/notification-triggers.ts` - Helper functions for creating notifications

2. **Updated:**
   - `src/app/api/orders/[id]/route.ts` - Added order approval/rejection notifications
   - `src/app/api/expenses/[id]/approve/route.ts` - Added expense approval/rejection notifications
   - `src/app/api/order-deliveries/[id]/mark-delivered/route.ts` - Added delivery status notifications
   - `src/app/api/payments/route.ts` - Added payment creation notifications

All changes committed in: `feat: Add automatic notification triggers for orders, expenses, deliveries, and payments` (commit bec02e2)
