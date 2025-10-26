'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
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
    // Redirect to authorize endpoint
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
      <div>
        <h1 className="text-3xl font-bold">QuickBooks Integration</h1>
        <p className="text-muted-foreground mt-2">
          Connect your QuickBooks Online account to sync customers, invoices, and payments.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50 text-green-900">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>
                Your QuickBooks Online integration status
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStatus}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Connection Badge */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Status:</span>
                {status?.connected ? (
                  <Badge className="bg-green-500 hover:bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Connected
                  </Badge>
                )}
              </div>

              {/* Connection Details */}
              {status?.connected && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">QuickBooks Company ID:</span>
                    <span className="font-mono">{status.realmId}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Last Sync:</span>
                    <span>{formatDate(status.lastSync)}</span>
                  </div>
                  {status.tokenExpiresAt && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Token Expires:</span>
                      <span>{formatDate(status.tokenExpiresAt)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                {status?.connected ? (
                  <Button
                    variant="destructive"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                  >
                    {disconnecting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      'Disconnect QuickBooks'
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleConnect}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect to QuickBooks
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Features Card */}
      <Card>
        <CardHeader>
          <CardTitle>What Gets Synced?</CardTitle>
          <CardDescription>
            When connected, the following data syncs automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Customers</p>
                <p className="text-sm text-muted-foreground">
                  Projects are synced as customers in QuickBooks
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Invoices</p>
                <p className="text-sm text-muted-foreground">
                  Approved orders are created as invoices in QuickBooks
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Payments</p>
                <p className="text-sm text-muted-foreground">
                  Payment records are synced to track invoice payments
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Make sure you have admin access to your QuickBooks Online account
          </p>
          <p>
            • Access tokens refresh automatically every hour
          </p>
          <p>
            • If you encounter issues, try disconnecting and reconnecting
          </p>
          <p>
            • For testing, use QuickBooks Sandbox environment
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
