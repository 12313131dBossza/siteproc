'use client';

import { useEffect, useState } from 'react';

interface SessionStatus {
  status: string;
  environment: Record<string, string>;
  cookies: {
    count: number;
    names: Array<{ name: string; value: string; length: number }>;
    hasAuthToken: boolean;
    hasRefreshToken: boolean;
    allNames: string[];
  };
  authentication: {
    userEmail: string | null;
    sessionEmail: string | null;
    authError: string | null;
    sessionError: string | null;
    isAuthenticated: boolean;
  };
  debug: {
    user: { id: string; email: string } | null;
    session: { expires_at: number | null } | null;
  };
}

export default function SessionCheckPage() {
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/debug/session-check');
        const data = await response.json();
        setStatus(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Session Debug Check</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {status && (
          <>
            {/* Environment Status */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Environment</h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(status.environment).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="font-medium text-gray-700">{key}:</span>
                    <span className={value === 'SET' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Authentication Status */}
            <div className={`rounded-lg shadow p-6 mb-6 ${status.authentication.isAuthenticated ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
              <h2 className="text-xl font-bold mb-4">
                {status.authentication.isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
              </h2>
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-gray-700">User Email:</span>
                  <span className="ml-2 text-gray-900">{status.authentication.userEmail || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Session Email:</span>
                  <span className="ml-2 text-gray-900">{status.authentication.sessionEmail || 'N/A'}</span>
                </div>
                {status.authentication.authError && (
                  <div className="text-red-700">
                    <span className="font-medium">Auth Error:</span> {status.authentication.authError}
                  </div>
                )}
                {status.authentication.sessionError && (
                  <div className="text-red-700">
                    <span className="font-medium">Session Error:</span> {status.authentication.sessionError}
                  </div>
                )}
              </div>
            </div>

            {/* Cookies Status */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Cookies ({status.cookies.count})</h2>
              <div className="mb-4 p-3 bg-gray-50 rounded space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-3 h-3 rounded-full ${status.cookies.hasAuthToken ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="font-medium">Auth Token: {status.cookies.hasAuthToken ? '✓' : '✗'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-3 h-3 rounded-full ${status.cookies.hasRefreshToken ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="font-medium">Refresh Token: {status.cookies.hasRefreshToken ? '✓' : '✗'}</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <h3 className="font-mono text-sm font-bold text-gray-700 mb-2">All Cookie Names:</h3>
                <div className="font-mono text-xs text-gray-600 space-y-1 max-h-48 overflow-auto">
                  {status.cookies.allNames.map((name, i) => (
                    <div key={i} className="break-all">{name}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Raw Debug Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Raw Debug Info</h2>
              <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-64">
                {JSON.stringify(status.debug, null, 2)}
              </pre>
            </div>

            {/* Navigation */}
            <div className="mt-8 flex gap-4">
              <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Go Home
              </a>
              <a href="/login" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                Go to Login
              </a>
              <a href="/deliveries" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Go to Deliveries
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
