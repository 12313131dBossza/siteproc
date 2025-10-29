'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function TestOrderNotificationPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const sendTestNotification = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // Get current user session
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      
      if (!session.authenticated) {
        setResult({ error: 'Not authenticated' });
        return;
      }

      const userId = session.user.id;
      const companyId = session.user.profile?.company_id;

      // Send test notification
      const res = await fetch('/api/test-order-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCreatorId: userId, // Send to yourself for testing
          companyId: companyId,
          orderId: 'test-' + Date.now(),
          orderNumber: 'TEST-' + Math.floor(Math.random() * 1000),
          projectName: 'Test Project Alpha'
        })
      });

      const data = await res.json();
      setResult(data);

      if (data.success) {
        alert('✅ Test notification sent! Wait 30 seconds then check your bell icon.');
      }
    } catch (error) {
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">Test Order Notification Trigger</h1>
          
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-gray-700">
              This will directly call the <code className="bg-gray-200 px-2 py-1 rounded">notifyOrderApproval()</code> function
              to test if the notification trigger works at all.
            </p>
          </div>

          <Button 
            onClick={sendTestNotification}
            disabled={loading}
            className="w-full mb-4"
          >
            {loading ? 'Sending...' : 'Send Test Order Approval Notification'}
          </Button>

          {result && (
            <div className={`p-4 rounded ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold mb-2">
                {result.success ? '✅ Success' : '❌ Error'}
              </h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h3 className="font-semibold mb-2">After clicking the button:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Wait 30 seconds for auto-refresh</li>
              <li>Check bell icon - should show badge</li>
              <li>Click bell - should see "Order Approved" notification</li>
              <li>Check Vercel logs for debug output</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
