'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function QuickNotificationCheck() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      const json = await res.json();
      setData(json);
    } catch (error) {
      setData({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const createTest = async () => {
    setLoading(true);
    try {
      // Get session first
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: session.user.id,
          company_id: session.user.profile.company_id,
          type: 'system',
          title: 'Test ' + new Date().toLocaleTimeString(),
          message: 'This is a test notification created at ' + new Date().toLocaleTimeString(),
          link: '/dashboard'
        })
      });
      
      const json = await res.json();
      setData({ created: json });
      
      // Refresh list
      setTimeout(checkNotifications, 500);
    } catch (error) {
      setData({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Quick Notification Check</h1>
      
      <div className="space-x-2 mb-4">
        <Button onClick={checkNotifications} disabled={loading}>
          Check My Notifications
        </Button>
        <Button onClick={createTest} disabled={loading} variant="secondary">
          Create Test Notification
        </Button>
      </div>

      {data && (
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
