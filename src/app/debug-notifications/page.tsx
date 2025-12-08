'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/Button';

export default function DebugNotificationsPage() {
  const [session, setSession] = useState<any>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [dbCheck, setDbCheck] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const res = await fetch('/api/auth/session');
    const data = await res.json();
    setSession(data);
  };

  const testGetNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=100');
      const data = await res.json();
      setApiResponse(data);
    } catch (error) {
      setApiResponse({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const testDirectDB = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/debug-db-notifications');
      const data = await res.json();
      setDbCheck(data);
    } catch (error) {
      setDbCheck({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const testCreateNotification = async () => {
    setLoading(true);
    try {
      if (!session?.user) {
        alert('Not logged in!');
        return;
      }

      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: session.user.id,
          company_id: session.user.company_id,
          type: 'system',
          title: 'Debug Test',
          message: `Test notification created at ${new Date().toLocaleTimeString()}`,
          link: '/debug-notifications',
        }),
      });
      const data = await res.json();
      alert(JSON.stringify(data, null, 2));
      
      // Immediately fetch to see if it's there
      await testGetNotifications();
    } catch (error) {
      alert('Error: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Debug Notifications" description="Debug notification issues">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Debug Controls</h2>
          
          <div className="flex gap-3">
            <Button onClick={checkSession} disabled={loading} variant="ghost">
              Check Session
            </Button>
            <Button onClick={testGetNotifications} disabled={loading} variant="ghost">
              GET /api/notifications
            </Button>
            <Button onClick={testCreateNotification} disabled={loading} variant="primary">
              Create Test Notification
            </Button>
            <Button onClick={testDirectDB} disabled={loading} variant="ghost">
              Direct DB Check
            </Button>
          </div>
        </div>

        {/* Session Info */}
        {session && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <h3 className="font-semibold mb-2">Session Info</h3>
            <pre className="text-xs overflow-auto bg-white p-3 rounded border">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        )}

        {/* API Response */}
        {apiResponse && (
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <h3 className="font-semibold mb-2">API Response (/api/notifications)</h3>
            <pre className="text-xs overflow-auto bg-white p-3 rounded border max-h-96">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        )}

        {/* DB Check */}
        {dbCheck && (
          <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
            <h3 className="font-semibold mb-2">Direct DB Check</h3>
            <pre className="text-xs overflow-auto bg-white p-3 rounded border max-h-96">
              {JSON.stringify(dbCheck, null, 2)}
            </pre>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <h3 className="font-semibold mb-2">Debug Steps</h3>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Click "Check Session" - verify you're logged in with user_id and company_id</li>
            <li>Click "Create Test Notification" - should create a notification</li>
            <li>Click "GET /api/notifications" - should return the notification</li>
            <li>If empty, click "Direct DB Check" to see if it's a RLS issue</li>
          </ol>
        </div>
      </div>
    </AppLayout>
  );
}
