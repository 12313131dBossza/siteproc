'use client';

import { useState } from 'react';

export default function TestAuthPage() {
  const [email, setEmail] = useState('bossbcz@gmail.com');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAuth = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/debug/test-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      setResult({ status: response.status, data });
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testConfig = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/debug/config');
      const data = await response.json();
      setResult({ status: response.status, data });
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Auth Debug Tools</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Test Magic Link</h2>
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Email"
            />
            <button
              onClick={testAuth}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Test Magic Link'}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Test Configuration</h2>
          <button
            onClick={testConfig}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Check Config'}
          </button>
        </div>

        {result && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Result</h2>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
