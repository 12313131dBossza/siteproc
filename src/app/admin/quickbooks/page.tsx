'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface ConnectionStatus {
  connected: boolean;
  realmId: string | null;
  lastSync: string | null;
  tokenExpiresAt?: string;
}

export default function QuickBooksSettingsPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check for OAuth callback messages
  useEffect(() => {
    const errorParam = searchParams.get('error');
    const successParam = searchParams.get('success');

    if (errorParam) {
      const errorMessages: Record<string, string> = {
        invalid_callback: 'Invalid OAuth callback parameters',
        invalid_state: 'Security validation failed. Please try again.',
        database_error: 'Failed to save connection. Please try again.',
        unknown: 'An unknown error occurred. Please try again.',
      };
      setError(errorMessages[errorParam] || errorMessages.unknown);
    }

    if (successParam === 'connected') {
      setSuccess('Successfully connected to QuickBooks!');
      fetchStatus();
    }
  }, [searchParams]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/quickbooks/status');
      
      if (!response.ok) {
        throw new Error('Failed to fetch connection status');
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Error fetching QB status:', err);
      setError('Failed to load QuickBooks connection status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = () => {
    window.location.href = '/api/quickbooks/authorize';
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect QuickBooks? This will stop all syncing.')) {
      return;
    }

    try {
      setDisconnecting(true);
      setError(null);

      const response = await fetch('/api/quickbooks/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setSuccess('Successfully disconnected from QuickBooks');
      await fetchStatus();
    } catch (err) {
      console.error('Error disconnecting QB:', err);
      setError('Failed to disconnect QuickBooks. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">QuickBooks Integration</h1>
        <p className="text-gray-600 mt-2">
          Connect your QuickBooks Online account to sync customers, invoices, and payments.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Success</p>
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Connection Status Card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Connection Status</h2>
              <p className="text-sm text-gray-600 mt-1">
                Your QuickBooks Online integration status
              </p>
            </div>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
        <div className="px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <>
              {/* Connection Badge */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                {status?.connected ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    ✕ Not Connected
                  </span>
                )}
              </div>

              {/* Connection Details */}
              {status?.connected && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">QuickBooks Company ID:</span>
                    <span className="font-mono text-gray-900">{status.realmId}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Last Sync:</span>
                    <span className="text-gray-900">{formatDate(status.lastSync)}</span>
                  </div>
                  {status.tokenExpiresAt && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Token Expires:</span>
                      <span className="text-gray-900">{formatDate(status.tokenExpiresAt)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                {status?.connected ? (
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {disconnecting ? 'Disconnecting...' : 'Disconnect QuickBooks'}
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Connect to QuickBooks →
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Features Card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">What Gets Synced?</h2>
          <p className="text-sm text-gray-600 mt-1">
            When connected, the following data syncs automatically
          </p>
        </div>
        <div className="px-6 py-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-green-500 text-lg">✓</span>
              <div>
                <p className="font-medium text-gray-900">Customers</p>
                <p className="text-sm text-gray-600">
                  Projects are synced as customers in QuickBooks
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 text-lg">✓</span>
              <div>
                <p className="font-medium text-gray-900">Invoices</p>
                <p className="text-sm text-gray-600">
                  Approved orders are created as invoices in QuickBooks
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 text-lg">✓</span>
              <div>
                <p className="font-medium text-gray-900">Payments</p>
                <p className="text-sm text-gray-600">
                  Payment records are synced to track invoice payments
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-6 py-4">
        <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
        <div className="space-y-1 text-sm text-blue-800">
          <p>• Make sure you have admin access to your QuickBooks Online account</p>
          <p>• Access tokens refresh automatically every hour</p>
          <p>• If you encounter issues, try disconnecting and reconnecting</p>
          <p>• For testing, use QuickBooks Sandbox environment</p>
        </div>
      </div>
    </div>
  );
}
