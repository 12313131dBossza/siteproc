'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/contexts/NotificationContext';
import { Bell, CheckCircle, AlertCircle } from 'lucide-react';

export default function TestNotificationsPage() {
  const { createNotification, notifications, unreadCount, fetchNotifications } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
    setStatus(null);
    try {
      // Get current user info from session
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      
      if (!session.authenticated || !session.user) {
        setStatus({ type: 'error', message: 'Please login first!' });
        return;
      }

      const user_id = session.user.id;
      const company_id = session.user.profile?.company_id;

      if (!company_id) {
        setStatus({ type: 'error', message: 'No company_id found in your profile!' });
        return;
      }

      await createNotification({
        user_id,
        company_id,
        ...testNotifications[index],
      });
      
      // Refresh the notification list
      await fetchNotifications();
      
      setStatus({ type: 'success', message: 'Notification created! Check the bell icon above.' });
    } catch (error) {
      console.error('Error:', error);
      setStatus({ type: 'error', message: 'Failed to create notification' });
    } finally {
      setLoading(false);
    }
  };

  const createMultiple = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      
      if (!session.authenticated || !session.user) {
        setStatus({ type: 'error', message: 'Please login first!' });
        setLoading(false);
        return;
      }

      const user_id = session.user.id;
      const company_id = session.user.profile?.company_id;

      if (!company_id) {
        setStatus({ type: 'error', message: 'No company_id found in your profile!' });
        setLoading(false);
        return;
      }

      for (let i = 0; i < testNotifications.length; i++) {
        await createNotification({
          user_id,
          company_id,
          ...testNotifications[i],
        });
        await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay
      }
      
      // Refresh the notification list
      await fetchNotifications();
      
      setStatus({ type: 'success', message: `Created ${testNotifications.length} notifications! Check the bell icon.` });
    } catch (error) {
      console.error('Error:', error);
      setStatus({ type: 'error', message: 'Failed to create notifications' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      title="Test Notifications"
      description="Test the notifications system"
    >
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Status Message */}
        {status && (
          <div className={`rounded-lg p-4 flex items-start gap-3 ${
            status.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {status.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <p className={status.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {status.message}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Stats
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Total Notifications</div>
              <div className="text-3xl font-bold text-blue-600">{notifications.length}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Unread Count</div>
              <div className="text-3xl font-bold text-red-600">{unreadCount}</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <Button
            onClick={createMultiple}
            disabled={loading}
            variant="primary"
            className="w-full"
          >
            {loading ? 'Creating...' : `Create All ${testNotifications.length} Test Notifications`}
          </Button>
        </div>

        {/* Individual Notifications */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Individual Test Notifications</h2>
          <div className="space-y-3">
            {testNotifications.map((notif, index) => (
              <button
                key={index}
                onClick={() => createTestNotification(index)}
                disabled={loading}
                className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-medium text-gray-900">{notif.title}</div>
                <div className="text-sm text-gray-600 mt-1">{notif.message}</div>
                <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                  <span>Type: <span className="font-mono">{notif.type}</span></span>
                  <span>•</span>
                  <span>Link: {notif.link}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Testing Tips */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
            💡 Testing Tips
          </h3>
          <ul className="text-sm text-yellow-800 space-y-2">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>Click the bell icon (🔔) in the header to view notifications</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>Unread notifications have a blue background</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Hover over notifications to see mark-as-read and delete buttons</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span>Notifications auto-refresh every 30 seconds</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">5.</span>
              <span>Click a notification to navigate to its link</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">6.</span>
              <span>Use the double-checkmark (✓✓) to mark all as read</span>
            </li>
          </ul>
        </div>

        {/* Current Notifications List */}
        {notifications.length > 0 && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Current Notifications ({notifications.length})</h2>
            <div className="space-y-2">
              {notifications.slice(0, 5).map((notif) => (
                <div key={notif.id} className={`p-3 rounded border ${notif.read ? 'bg-white' : 'bg-blue-50'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{notif.title}</div>
                      <div className="text-xs text-gray-600 mt-1">{notif.message}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(notif.created_at).toLocaleString()}
                      </div>
                    </div>
                    {!notif.read && (
                      <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1"></span>
                    )}
                  </div>
                </div>
              ))}
              {notifications.length > 5 && (
                <div className="text-center text-sm text-gray-500 pt-2">
                  ...and {notifications.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
