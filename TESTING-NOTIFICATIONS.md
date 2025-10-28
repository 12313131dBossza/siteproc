# Testing the Notifications System

## Overview
This guide shows you how to test the notifications system that was just implemented.

## Prerequisites
- You need to be logged into the application
- The notifications table should exist in your database (it will be created automatically on first use)

---

## Method 1: Manual Testing via UI (Recommended)

### Step 1: Check the Notification Bell
1. **Login to your app**: Go to https://siteproc.vercel.app (or your local development URL)
2. **Look at the top navigation bar**: You should see a bell icon (🔔) in the header
3. **The bell should show "0"** initially (no notifications)

### Step 2: Create a Test Notification via Browser Console

1. **Open Developer Tools** (F12 or Right-click → Inspect)
2. **Go to Console tab**
3. **Run this code** to create a test notification:

```javascript
// Create a test notification
fetch('/api/notifications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    user_id: 'YOUR_USER_ID', // Get from localStorage or session
    company_id: 'YOUR_COMPANY_ID', // Get from localStorage or session
    type: 'system',
    title: '🎉 Test Notification',
    message: 'This is a test notification to verify the system is working!',
    link: '/dashboard',
  })
}).then(r => r.json()).then(console.log);
```

### Step 3: Get Your User ID and Company ID

Run this in the console first to get your IDs:

```javascript
// Get current user session
fetch('/api/auth/session')
  .then(r => r.json())
  .then(data => {
    console.log('User ID:', data.user?.id);
    console.log('Company ID:', data.user?.company_id);
  });
```

### Step 4: Verify the Notification Appears

1. **Check the bell icon** - it should now show a red badge with "1"
2. **Click the bell** - a dropdown should appear
3. **You should see:**
   - "1 new" badge in the header
   - Your test notification with blue background (unread)
   - The notification grouped under "Today"
   - Emoji icon (🎉) on the left

### Step 5: Test Interactions

1. **Mark as Read:**
   - Hover over the notification
   - Click the checkmark (✓) button
   - Background should change from blue to white
   - Unread count should decrease

2. **Delete:**
   - Hover over the notification
   - Click the trash icon (🗑️)
   - Notification should disappear

3. **Mark All as Read:**
   - Create multiple notifications (repeat Step 2)
   - Click the double-checkmark icon (✓✓) in the dropdown header
   - All should be marked as read

---

## Method 2: API Testing with cURL/Postman

### Get Session Token First
```bash
# Login and get your session cookie
curl -X POST https://siteproc.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  -c cookies.txt
```

### Create a Notification
```bash
curl -X POST https://siteproc.vercel.app/api/notifications \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "user_id": "YOUR_USER_ID",
    "company_id": "YOUR_COMPANY_ID",
    "type": "order_approved",
    "title": "Order #123 Approved",
    "message": "Your order for materials has been approved!",
    "link": "/orders/123"
  }'
```

### Get Notifications
```bash
curl https://siteproc.vercel.app/api/notifications \
  -b cookies.txt
```

### Mark as Read
```bash
curl -X PATCH https://siteproc.vercel.app/api/notifications/NOTIFICATION_ID \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"read": true}'
```

### Mark All as Read
```bash
curl -X POST https://siteproc.vercel.app/api/notifications/mark-all-read \
  -b cookies.txt
```

### Delete Notification
```bash
curl -X DELETE https://siteproc.vercel.app/api/notifications/NOTIFICATION_ID \
  -b cookies.txt
```

---

## Method 3: Testing with Next.js Helper Page

I can create a dedicated test page for you. Create this file:

**File: `src/app/test-notifications/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/contexts/NotificationContext';

export default function TestNotificationsPage() {
  const { createNotification, notifications, unreadCount } = useNotifications();
  const [loading, setLoading] = useState(false);

  const testNotifications = [
    {
      type: 'order_approved' as const,
      title: '✅ Order Approved',
      message: 'Order #1234 for construction materials has been approved.',
      link: '/orders',
    },
    {
      type: 'expense_rejected' as const,
      title: '❌ Expense Rejected',
      message: 'Your expense claim for $500 has been rejected. Please review.',
      link: '/expenses',
    },
    {
      type: 'delivery_status' as const,
      title: '🚚 Delivery Update',
      message: 'Delivery #789 is now in transit. Expected arrival: Tomorrow.',
      link: '/deliveries',
    },
    {
      type: 'payment_created' as const,
      title: '💰 Payment Processed',
      message: 'Payment of $2,500 to ABC Supplies has been processed.',
      link: '/payments',
    },
    {
      type: 'project_update' as const,
      title: '📊 Project Milestone',
      message: 'Project Alpha has reached 75% completion!',
      link: '/projects',
    },
  ];

  const createTestNotification = async (index: number) => {
    setLoading(true);
    try {
      // Get current user info from session
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      
      if (!session.user) {
        alert('Please login first!');
        return;
      }

      await createNotification({
        user_id: session.user.id,
        company_id: session.user.company_id,
        ...testNotifications[index],
      });
      
      alert('Notification created! Check the bell icon.');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create notification');
    } finally {
      setLoading(false);
    }
  };

  const createMultiple = async () => {
    for (let i = 0; i < testNotifications.length; i++) {
      await createTestNotification(i);
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
    }
  };

  return (
    <AppLayout
      title="Test Notifications"
      description="Test the notifications system"
    >
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Notification Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded">
              <div className="text-sm text-gray-600">Total Notifications</div>
              <div className="text-2xl font-bold text-blue-600">{notifications.length}</div>
            </div>
            <div className="bg-red-50 p-4 rounded">
              <div className="text-sm text-gray-600">Unread Count</div>
              <div className="text-2xl font-bold text-red-600">{unreadCount}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Button
              onClick={createMultiple}
              disabled={loading}
              variant="primary"
              className="w-full"
            >
              {loading ? 'Creating...' : 'Create All 5 Test Notifications'}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Individual Test Notifications</h2>
          <div className="space-y-3">
            {testNotifications.map((notif, index) => (
              <button
                key={index}
                onClick={() => createTestNotification(index)}
                disabled={loading}
                className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">{notif.title}</div>
                <div className="text-sm text-gray-600 mt-1">{notif.message}</div>
                <div className="text-xs text-gray-400 mt-2">
                  Type: {notif.type} • Link: {notif.link}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-yellow-900 mb-2">💡 Testing Tips</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Click the bell icon (🔔) in the header to view notifications</li>
            <li>• Unread notifications have a blue background</li>
            <li>• Hover over notifications to see mark-as-read and delete buttons</li>
            <li>• Notifications auto-refresh every 30 seconds</li>
            <li>• Click a notification to navigate to its link</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
```

Then visit: **http://localhost:3000/test-notifications** (or your production URL)

---

## Method 4: Automated Integration Testing

Create a test script to verify all functionality:

**File: `test-notifications.js`**

```javascript
// Run with: node test-notifications.js
const BASE_URL = 'http://localhost:3000'; // or your production URL

async function testNotifications() {
  console.log('🧪 Starting Notification System Tests...\n');

  // 1. Test GET /api/notifications
  console.log('1️⃣ Testing GET /api/notifications...');
  const getRes = await fetch(`${BASE_URL}/api/notifications`);
  const getData = await getRes.json();
  console.log(`✅ Status: ${getRes.status}`);
  console.log(`   Notifications: ${getData.data?.length || 0}`);
  console.log(`   Unread: ${getData.unreadCount || 0}\n`);

  // 2. Test POST /api/notifications (create)
  console.log('2️⃣ Testing POST /api/notifications...');
  const createRes = await fetch(`${BASE_URL}/api/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: 'test-user-id',
      company_id: 'test-company-id',
      type: 'system',
      title: 'Test Notification',
      message: 'This is a test',
    }),
  });
  const createData = await createRes.json();
  console.log(`✅ Status: ${createRes.status}`);
  console.log(`   Created ID: ${createData.data?.id}\n`);

  const notificationId = createData.data?.id;

  if (notificationId) {
    // 3. Test PATCH /api/notifications/:id (mark as read)
    console.log('3️⃣ Testing PATCH /api/notifications/:id...');
    const patchRes = await fetch(`${BASE_URL}/api/notifications/${notificationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    });
    console.log(`✅ Status: ${patchRes.status}\n`);

    // 4. Test DELETE /api/notifications/:id
    console.log('4️⃣ Testing DELETE /api/notifications/:id...');
    const deleteRes = await fetch(`${BASE_URL}/api/notifications/${notificationId}`, {
      method: 'DELETE',
    });
    console.log(`✅ Status: ${deleteRes.status}\n`);
  }

  // 5. Test POST /api/notifications/mark-all-read
  console.log('5️⃣ Testing POST /api/notifications/mark-all-read...');
  const markAllRes = await fetch(`${BASE_URL}/api/notifications/mark-all-read`, {
    method: 'POST',
  });
  const markAllData = await markAllRes.json();
  console.log(`✅ Status: ${markAllRes.status}`);
  console.log(`   Marked: ${markAllData.count || 0} notifications\n`);

  console.log('✅ All tests completed!');
}

testNotifications().catch(console.error);
```

---

## What to Test

### ✅ Functionality Checklist

- [ ] Bell icon appears in header
- [ ] Unread count badge shows correct number
- [ ] Clicking bell opens dropdown
- [ ] Notifications appear in dropdown
- [ ] Notifications grouped by date (Today, Yesterday, etc.)
- [ ] Unread notifications have blue background
- [ ] Read notifications have white background
- [ ] Hover shows mark-as-read and delete buttons
- [ ] Mark as read changes background color
- [ ] Mark as read decreases unread count
- [ ] Mark all as read works
- [ ] Delete removes notification
- [ ] Clicking notification navigates to link
- [ ] Clicking outside closes dropdown
- [ ] Notifications auto-refresh (wait 30 seconds)

### 🐛 Edge Cases to Test

- [ ] What happens with 0 notifications?
- [ ] What happens with 100+ notifications?
- [ ] Long notification titles/messages
- [ ] Notifications without links
- [ ] Rapid clicking (mark/unmark)
- [ ] Network errors (offline mode)

---

## Troubleshooting

### Issue: "Unauthorized" error
**Solution:** Make sure you're logged in. The API requires authentication.

### Issue: Bell icon not visible
**Solution:** Check that `NotificationProvider` is in your layout and `NotificationBell` is rendered.

### Issue: Notifications not appearing
**Solution:** 
1. Check browser console for errors
2. Verify the API endpoint is working: `/api/notifications`
3. Check that the notifications table exists in Supabase

### Issue: Database error
**Solution:** The notifications table will be created automatically on first use, but you can manually create it by running the SQL in `CREATE-NOTIFICATIONS-TABLE.sql`

---

## Next Steps

Once you've verified the basic functionality works, you can:

1. **Add notification triggers** - Automatically create notifications when orders are approved, expenses are submitted, etc.
2. **Customize notification types** - Add more types for your specific use cases
3. **Add push notifications** - Integrate with a service like Firebase or OneSignal
4. **Add email notifications** - Send emails for important notifications

---

## Quick Test Checklist

Run through this in 5 minutes:

1. ✅ Login to app
2. ✅ See bell icon with "0"
3. ✅ Open browser console
4. ✅ Create test notification (see Method 1, Step 2)
5. ✅ Bell now shows "1"
6. ✅ Click bell, see dropdown with notification
7. ✅ Mark as read
8. ✅ Delete notification
9. ✅ Bell back to "0"

**Done! Your notifications system is working! 🎉**
