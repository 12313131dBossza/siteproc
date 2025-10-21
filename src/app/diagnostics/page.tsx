'use client';

export default function DiagnosticsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Diagnostics</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Session & Cookie Info</h2>
          <div className="space-y-4">
            <p className="text-gray-700">
              Current cookies in browser:
              <code className="block bg-gray-100 p-2 rounded mt-2 text-sm overflow-auto">
                {typeof document !== 'undefined' ? document.cookie || '(empty)' : '(loading...)'}
              </code>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Next Steps</h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li>
              <strong>Check Vercel Logs:</strong>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>Go to <a href="https://vercel.com" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">vercel.com</a></li>
                <li>Open your siteproc project → Deployments</li>
                <li>View the latest deployment logs</li>
                <li>Look for the middleware logs when accessing /deliveries</li>
                <li>Copy any middleware errors you see</li>
              </ul>
            </li>
            <li className="mt-4">
              <strong>Test Access:</strong> Go to <a href="/deliveries" className="text-blue-600 hover:underline">/deliveries</a> and immediately check Vercel logs
            </li>
            <li className="mt-4">
              <strong>Share the logs:</strong> Copy the middleware logs that show when you try to access /deliveries
            </li>
          </ol>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">Why This Matters</h3>
          <p className="text-blue-800 text-sm">
            The middleware logs will show us exactly why the authentication is failing. 
            It will tell us if the cookies are being read, if Supabase auth is working, and what error is occurring.
          </p>
        </div>
      </div>
    </div>
  );
}
