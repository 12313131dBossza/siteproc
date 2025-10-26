'use client';

import { useState, useEffect } from 'react';

interface DiagnosticData {
  timestamp: string;
  environment: {
    nodeEnv?: string;
    vercelEnv?: string;
    vercelUrl?: string;
  };
  quickbooksConfig: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    redirectUriLength: number;
    redirectUriBytes: string;
    environment: string;
    authEndpoint: string;
    tokenEndpoint: string;
    revokeEndpoint: string;
    apiBase: string;
  };
  databaseConnection: any;
  urls: {
    expectedRedirectUri: string;
    authorizeEndpoint: string;
    callbackEndpoint: string;
  };
  checks: {
    allEnvVarsSet: boolean;
    redirectUriHasWhitespace: boolean;
    redirectUriHasNewline: boolean;
    redirectUriFormat: boolean;
  };
}

export default function QuickBooksDiagnosePage() {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const fetchDiagnostics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/quickbooks/diagnose');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch diagnostics: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ status }: { status: boolean }) => (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${
      status 
        ? 'bg-green-100 text-green-800' 
        : 'bg-red-100 text-red-800'
    }`}>
      {status ? '✓ PASS' : '✗ FAIL'}
    </span>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Running diagnostics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchDiagnostics}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">QuickBooks Diagnostics</h1>
          <p className="text-gray-600 mt-2">
            Diagnostic information for debugging OAuth connection issues
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Generated: {data?.timestamp}
          </p>
        </div>

        {/* Health Checks */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🔍 Health Checks</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">All Environment Variables Set</span>
              <StatusBadge status={data?.checks.allEnvVarsSet ?? false} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Redirect URI Format Valid</span>
              <StatusBadge status={data?.checks.redirectUriFormat ?? false} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">No Whitespace in Redirect URI</span>
              <StatusBadge status={!data?.checks.redirectUriHasWhitespace} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">No Newlines in Redirect URI</span>
              <StatusBadge status={!data?.checks.redirectUriHasNewline} />
            </div>
          </div>
        </div>

        {/* Environment */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🌐 Environment</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-semibold text-gray-600">NODE_ENV:</span>
              <p className="text-gray-900 font-mono">{data?.environment.nodeEnv || 'Not set'}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600">VERCEL_ENV:</span>
              <p className="text-gray-900 font-mono">{data?.environment.vercelEnv || 'Not set'}</p>
            </div>
            <div className="col-span-2">
              <span className="text-sm font-semibold text-gray-600">VERCEL_URL:</span>
              <p className="text-gray-900 font-mono break-all">{data?.environment.vercelUrl || 'Not set'}</p>
            </div>
          </div>
        </div>

        {/* QuickBooks Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ QuickBooks Configuration</h2>
          <div className="space-y-4">
            <div>
              <span className="text-sm font-semibold text-gray-600">Client ID:</span>
              <p className="text-gray-900 font-mono">{data?.quickbooksConfig.clientId}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600">Client Secret:</span>
              <p className="text-gray-900 font-mono">{data?.quickbooksConfig.clientSecret}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600">Environment:</span>
              <p className="text-gray-900 font-mono">{data?.quickbooksConfig.environment}</p>
            </div>
            <div className="border-t pt-4">
              <span className="text-sm font-semibold text-gray-600">Redirect URI:</span>
              <p className="text-gray-900 font-mono break-all bg-yellow-50 p-2 rounded border border-yellow-200">
                {data?.quickbooksConfig.redirectUri}
              </p>
              <div className="mt-2 text-sm text-gray-600">
                <p>Length: {data?.quickbooksConfig.redirectUriLength} characters</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                    View byte representation (hex)
                  </summary>
                  <p className="mt-2 font-mono text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                    {data?.quickbooksConfig.redirectUriBytes}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Look for: 0d (carriage return) or 0a (newline) at the end
                  </p>
                </details>
              </div>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600">Expected Redirect URI:</span>
              <p className="text-gray-900 font-mono break-all bg-green-50 p-2 rounded border border-green-200">
                {data?.urls.expectedRedirectUri}
              </p>
            </div>
            <div className="border-t pt-4">
              <span className="text-sm font-semibold text-gray-600">Auth Endpoint:</span>
              <p className="text-gray-900 font-mono text-sm break-all">{data?.quickbooksConfig.authEndpoint}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600">Token Endpoint:</span>
              <p className="text-gray-900 font-mono text-sm break-all">{data?.quickbooksConfig.tokenEndpoint}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600">Revoke Endpoint:</span>
              <p className="text-gray-900 font-mono text-sm break-all">{data?.quickbooksConfig.revokeEndpoint}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600">API Base:</span>
              <p className="text-gray-900 font-mono text-sm break-all">{data?.quickbooksConfig.apiBase}</p>
            </div>
          </div>
        </div>

        {/* Database Connection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">💾 Database Connection</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-semibold text-gray-600">Company ID:</span>
              <p className="text-gray-900 font-mono">{data?.databaseConnection.companyId}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600">User Role:</span>
              <p className="text-gray-900 font-mono">{data?.databaseConnection.userRole}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600">QB Connection Exists:</span>
              <p className="text-gray-900 font-mono">
                {data?.databaseConnection.connectionExists ? 'Yes' : 'No'}
              </p>
            </div>
            {data?.databaseConnection.connectionExists && (
              <>
                <div>
                  <span className="text-sm font-semibold text-gray-600">Connection Active:</span>
                  <p className="text-gray-900 font-mono">
                    {data?.databaseConnection.isActive ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-600">Realm ID:</span>
                  <p className="text-gray-900 font-mono">{data?.databaseConnection.realmId}</p>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-600">Token Expires At:</span>
                  <p className="text-gray-900 font-mono">{data?.databaseConnection.tokenExpiresAt}</p>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-600">Last Sync:</span>
                  <p className="text-gray-900 font-mono">
                    {data?.databaseConnection.lastSyncAt || 'Never'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={fetchDiagnostics}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            🔄 Refresh Diagnostics
          </button>
          <a
            href="/admin/quickbooks"
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
          >
            ← Back to QuickBooks Settings
          </a>
        </div>

        {/* Troubleshooting Tips */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">💡 Troubleshooting Tips</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Check that the Redirect URI matches EXACTLY in your QuickBooks app settings</li>
            <li>• Look for hidden characters (0d/0a) in the byte representation above</li>
            <li>• Ensure you only have TWO redirect URIs in QB settings (production + localhost)</li>
            <li>• Wait 5-10 minutes after changing redirect URIs for QuickBooks propagation</li>
            <li>• Try the connection in a fresh incognito/private browser window</li>
            <li>• Verify your QuickBooks app is in Sandbox mode</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
