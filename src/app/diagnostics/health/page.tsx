'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface HealthData {
  status: string;
  message: string;
  latency_ms: number;
  diagnostics: {
    environment: any;
    supabase: any;
    database: any;
    endpoints: any;
  };
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealth(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleRefresh = () => {
    setRefreshCount(c => c + 1);
    fetchHealth();
  };

  const getTableColor = (table: any) => {
    if (table.accessible) return 'text-green-600';
    return 'text-red-600';
  };

  const getEndpointColor = (endpoint: any) => {
    if (endpoint.success) return 'text-green-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">System Health & Diagnostics</h1>
          <div className="space-x-2">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh ({refreshCount})
            </button>
            <Link
              href="/debug/session-check"
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Session Check
            </Link>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading diagnostics...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold">Error: {error}</p>
          </div>
        )}

        {health && (
          <div className="space-y-6">
            {/* Status Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Overall Status</h2>
                <div className={`px-3 py-1 rounded-full text-white font-semibold ${
                  health.status === 'ok' ? 'bg-green-600' : 'bg-red-600'
                }`}>
                  {health.status.toUpperCase()}
                </div>
              </div>
              <p className="text-gray-700 mb-3">{health.message}</p>
              <p className="text-sm text-gray-500">
                Response time: <span className="font-mono font-semibold">{health.latency_ms}ms</span>
              </p>
            </div>

            {/* Environment */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Environment</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Supabase URL</p>
                  <p className={`font-semibold ${health.diagnostics.environment.url_set ? 'text-green-600' : 'text-red-600'}`}>
                    {health.diagnostics.environment.url_set ? '✓ Set' : '✗ Missing'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Anon Key</p>
                  <p className={`font-semibold ${health.diagnostics.environment.anon_key_set ? 'text-green-600' : 'text-red-600'}`}>
                    {health.diagnostics.environment.anon_key_set ? '✓ Set' : '✗ Missing'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Service Role</p>
                  <p className={`font-semibold ${health.diagnostics.environment.service_role_set ? 'text-green-600' : 'text-red-600'}`}>
                    {health.diagnostics.environment.service_role_set ? '✓ Set' : '✗ Missing'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Node Environment</p>
                  <p className="font-semibold text-gray-900">{health.diagnostics.environment.node_env}</p>
                </div>
              </div>
            </div>

            {/* Supabase Auth */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Supabase Auth</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-gray-700">Connected</p>
                  <span className={`font-semibold ${health.diagnostics.supabase.auth.connected ? 'text-green-600' : 'text-red-600'}`}>
                    {health.diagnostics.supabase.auth.connected ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-gray-700">User Exists</p>
                  <span className={`font-semibold ${health.diagnostics.supabase.auth.user_exists ? 'text-green-600' : 'text-gray-600'}`}>
                    {health.diagnostics.supabase.auth.user_exists ? '✓ Yes' : '○ Not logged in'}
                  </span>
                </div>
                {health.diagnostics.supabase.auth.user_email && (
                  <div className="flex justify-between items-center">
                    <p className="text-gray-700">Logged in as</p>
                    <span className="font-mono text-sm">{health.diagnostics.supabase.auth.user_email}</span>
                  </div>
                )}
                {health.diagnostics.supabase.auth.error && (
                  <div className="bg-red-50 p-3 rounded border border-red-200">
                    <p className="text-red-800 text-sm font-mono">{health.diagnostics.supabase.auth.error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Database Tables */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Tables</h3>
              <div className="space-y-3">
                {Object.entries(health.diagnostics.database.tables || {}).map(([table, info]: [string, any]) => (
                  <div key={table} className="border-b pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono font-semibold text-gray-900">{table}</p>
                        <p className="text-sm text-gray-600">Count: {info.count}</p>
                      </div>
                      <span className={`font-semibold ${getTableColor(info)}`}>
                        {info.accessible ? '✓ Accessible' : '✗ Error'}
                      </span>
                    </div>
                    {info.error && (
                      <p className="text-red-600 text-sm mt-2 font-mono">{info.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* API Endpoints */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">API Endpoints</h3>
              <div className="space-y-3">
                {Object.entries(health.diagnostics.endpoints || {}).map(([endpoint, info]: [string, any]) => (
                  <div key={endpoint} className="border-b pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono font-semibold text-gray-900">/api/{endpoint}</p>
                        <p className="text-sm text-gray-600">Records: {info.count}, Sample: {info.sample_count}</p>
                      </div>
                      <span className={`font-semibold ${getEndpointColor(info)}`}>
                        {info.success ? '✓ OK' : '✗ Error'}
                      </span>
                    </div>
                    {info.error && (
                      <p className="text-red-600 text-sm mt-2 font-mono">{info.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Timestamp */}
            <div className="text-center text-sm text-gray-500">
              Last checked: {new Date(health.diagnostics.environment?.timestamp || Date.now()).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
