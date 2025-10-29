import { Bell } from 'lucide-react';

export default function SimpleNotifTest() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-8">Notification System Diagnostic</h1>
          
          {/* Test 1: Raw API Call */}
          <div className="mb-8 p-6 border-2 border-blue-200 rounded-lg bg-blue-50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              Test API Directly
            </h2>
            <p className="mb-4 text-gray-700">Open browser console (F12) and paste this:</p>
            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-sm">
{`fetch('/api/notifications')
  .then(r => r.json())
  .then(d => {
    console.log('✅ API Response:', d);
    console.log('Unread Count:', d.unreadCount);
    console.log('Total Notifications:', d.data?.length);
  })
  .catch(e => console.error('❌ API Error:', e));`}
            </pre>
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
              <strong>Expected:</strong> Should show <code>unreadCount: 1</code> and <code>data</code> array with notifications
            </div>
          </div>

          {/* Test 2: Check Auth */}
          <div className="mb-8 p-6 border-2 border-green-200 rounded-lg bg-green-50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              Check Authentication
            </h2>
            <p className="mb-4 text-gray-700">Paste this in console:</p>
            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-sm">
{`fetch('/api/auth/session')
  .then(r => r.json())
  .then(d => {
    console.log('✅ Session:', d);
    console.log('User ID:', d.user?.id);
    console.log('Company ID:', d.user?.profile?.company_id);
  });`}
            </pre>
          </div>

          {/* Test 3: Check Network Requests */}
          <div className="mb-8 p-6 border-2 border-purple-200 rounded-lg bg-purple-50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
              Monitor Network Activity
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Press <kbd className="px-2 py-1 bg-gray-200 rounded">F12</kbd> to open DevTools</li>
              <li>Click the <strong>Network</strong> tab</li>
              <li>Refresh this page (F5)</li>
              <li>Wait 30 seconds (notification auto-fetch)</li>
              <li>Look for request to <code className="bg-gray-200 px-2 py-1 rounded">notifications</code></li>
            </ol>
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
              <strong>Expected:</strong> Should see a GET request to <code>/api/notifications</code> within 30 seconds
            </div>
          </div>

          {/* Test 4: Visual Bell Test */}
          <div className="mb-8 p-6 border-2 border-red-200 rounded-lg bg-red-50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
              Check Bell Icon
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-700 mb-2">Look at the top-right corner of the screen.</p>
                <p className="text-gray-700 mb-4"><strong>Question:</strong> Do you see a bell icon like this?</p>
                <div className="flex gap-8 items-center">
                  <div className="text-center">
                    <div className="relative inline-block p-3 border-2 border-gray-300 rounded-lg bg-white">
                      <Bell className="h-6 w-6 text-gray-600" />
                    </div>
                    <p className="mt-2 text-sm text-gray-600">Plain bell (no badge)</p>
                  </div>
                  <div className="text-center">
                    <div className="relative inline-block p-3 border-2 border-green-500 rounded-lg bg-white">
                      <Bell className="h-6 w-6 text-gray-600" />
                      <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                        1
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-green-700 font-semibold">✓ With badge (working!)</p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-yellow-100 border border-yellow-300 rounded">
                <strong>If you see plain bell with NO red badge:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Context is not loading data</li>
                  <li>Or badge rendering is broken</li>
                  <li>Continue with tests 1-3 above</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Test 5: Manual Check */}
          <div className="mb-8 p-6 border-2 border-orange-200 rounded-lg bg-orange-50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span>
              Force Check Notifications
            </h2>
            <div className="space-y-3">
              <a 
                href="/notif-debug" 
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                → Go to Debug Page
              </a>
              <p className="text-gray-700">This page will show you exactly what the notification context sees</p>
            </div>
          </div>

          {/* Results Section */}
          <div className="p-6 border-2 border-gray-300 rounded-lg bg-gray-50">
            <h2 className="text-xl font-semibold mb-4">📋 Report Your Results</h2>
            <p className="mb-4 text-gray-700">After running tests 1-5, tell me:</p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li><strong>Test 1 (API):</strong> What was the unreadCount?</li>
              <li><strong>Test 2 (Auth):</strong> Did you get a user ID?</li>
              <li><strong>Test 3 (Network):</strong> Did you see the /api/notifications request?</li>
              <li><strong>Test 4 (Bell):</strong> Do you see a red badge on the bell?</li>
              <li><strong>Test 5 (Debug):</strong> What does the debug page show?</li>
            </ol>
            <div className="mt-4 p-4 bg-blue-100 border border-blue-300 rounded">
              <strong>💡 Tip:</strong> Take screenshots of the console output and the debug page results
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
