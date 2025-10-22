'use client';

import { useEffect, useState } from 'react';

export default function DatabaseTestPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    setResults([]);
    const newResults: any[] = [];

    // Test 1: Purchase orders count
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        newResults.push({
          name: 'GET /api/orders',
          status: '✓ OK',
          data: data,
          color: 'green'
        });
      } else {
        newResults.push({
          name: 'GET /api/orders',
          status: `✗ ${res.status}`,
          data: await res.text(),
          color: 'red'
        });
      }
    } catch (e: any) {
      newResults.push({
        name: 'GET /api/orders',
        status: '✗ Error',
        data: e.message,
        color: 'red'
      });
    }

    // Test 2: Projects
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        newResults.push({
          name: 'GET /api/projects',
          status: '✓ OK',
          data: data,
          color: 'green'
        });
      } else {
        newResults.push({
          name: 'GET /api/projects',
          status: `✗ ${res.status}`,
          data: await res.text(),
          color: 'red'
        });
      }
    } catch (e: any) {
      newResults.push({
        name: 'GET /api/projects',
        status: '✗ Error',
        data: e.message,
        color: 'red'
      });
    }

    // Test 3: Session
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        newResults.push({
          name: 'GET /api/auth/session',
          status: '✓ OK',
          data: data,
          color: 'green'
        });
      } else {
        newResults.push({
          name: 'GET /api/auth/session',
          status: `✗ ${res.status}`,
          data: await res.text(),
          color: 'red'
        });
      }
    } catch (e: any) {
      newResults.push({
        name: 'GET /api/auth/session',
        status: '✗ Error',
        data: e.message,
        color: 'red'
      });
    }

    // Test 4: Health check
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        newResults.push({
          name: 'GET /api/health',
          status: '✓ OK',
          data: data,
          color: 'green'
        });
      } else {
        newResults.push({
          name: 'GET /api/health',
          status: `✗ ${res.status}`,
          data: await res.text(),
          color: 'red'
        });
      }
    } catch (e: any) {
      newResults.push({
        name: 'GET /api/health',
        status: '✗ Error',
        data: e.message,
        color: 'red'
      });
    }

    setResults(newResults);
    setLoading(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🧪 Database Connectivity Tests</h1>
          <p className="text-gray-400">Quick endpoint tests to diagnose database issues</p>
        </div>

        <button
          onClick={runTests}
          disabled={loading}
          className="mb-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold"
        >
          {loading ? 'Testing...' : 'Run All Tests'}
        </button>

        <div className="space-y-6">
          {results.map((result, i) => (
            <div key={i} className="bg-gray-800 border-l-4 border-green-600 p-6 rounded">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-mono font-bold">{result.name}</h3>
                  <p className={`font-semibold ${result.color === 'green' ? 'text-green-400' : 'text-red-400'}`}>
                    {result.status}
                  </p>
                </div>
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                  View Response ({typeof result.data === 'string' ? result.data.length : JSON.stringify(result.data).length} chars)
                </summary>
                <pre className="mt-3 bg-black p-4 rounded text-sm overflow-auto max-h-96 border border-gray-700">
                  {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-blue-900 rounded-lg border border-blue-700">
          <h3 className="font-bold mb-3">💡 What To Look For</h3>
          <ul className="space-y-2 text-sm text-gray-100">
            <li>✓ All endpoints should return status "✓ OK"</li>
            <li>✓ Orders endpoint should return array of purchase orders</li>
            <li>✓ Projects endpoint should return array of projects</li>
            <li>✓ Session endpoint should show your user profile</li>
            <li>✓ Health endpoint should show table accessibility</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
