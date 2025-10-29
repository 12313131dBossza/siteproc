'use client';

import { useNotifications } from '@/contexts/NotificationContext';
import { useEffect } from 'react';

export default function NotificationDebugPage() {
  const { notifications, unreadCount, loading, fetchNotifications } = useNotifications();

  useEffect(() => {
    console.log('=== NOTIFICATION DEBUG ===');
    console.log('Loading:', loading);
    console.log('Unread Count:', unreadCount);
    console.log('Total Notifications:', notifications.length);
    console.log('Notifications:', notifications);
  }, [notifications, unreadCount, loading]);

  const forceRefresh = async () => {
    console.log('Forcing refresh...');
    await fetchNotifications();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Notification Debug</h1>
      
      <button 
        onClick={forceRefresh}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Force Refresh
      </button>

      <div className="bg-gray-100 p-6 rounded-lg space-y-4">
        <div>
          <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Unread Count:</strong> {unreadCount}
        </div>
        <div>
          <strong>Total Notifications:</strong> {notifications.length}
        </div>
        <div>
          <strong>Unread Notifications:</strong> {notifications.filter(n => !n.read).length}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-3">All Notifications:</h2>
        <div className="space-y-2">
          {notifications.map(n => (
            <div 
              key={n.id} 
              className={`p-4 rounded ${n.read ? 'bg-gray-100' : 'bg-blue-100'}`}
            >
              <div className="font-semibold">{n.title}</div>
              <div className="text-sm text-gray-600">{n.message}</div>
              <div className="text-xs text-gray-500 mt-2">
                {n.read ? '✓ Read' : '○ Unread'} • {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="text-gray-500 text-center py-8">
              No notifications loaded. Check browser console for errors.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Open browser console (F12)</li>
          <li>Look for "=== NOTIFICATION DEBUG ===" logs</li>
          <li>Click "Force Refresh" button above</li>
          <li>Check if unreadCount updates</li>
          <li>Check for any errors in console</li>
        </ol>
      </div>
    </div>
  );
}
