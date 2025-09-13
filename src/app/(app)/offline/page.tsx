"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/Button";
import {
  WifiOff,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Send
} from "lucide-react";

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  timestamp: number;
  description: string;
}

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [queuedRequests, setQueuedRequests] = useState<QueuedRequest[]>([]);
  const [lastSyncAttempt, setLastSyncAttempt] = useState<Date | null>(null);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      attemptSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Listen for service worker messages about queued requests
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'REQUEST_QUEUED') {
        const request = event.data.data;
        const queuedRequest: QueuedRequest = {
          id: `${request.timestamp}`,
          url: request.url,
          method: request.method,
          timestamp: request.timestamp,
          description: getRequestDescription(request.url, request.method)
        };
        setQueuedRequests(prev => [...prev, queuedRequest]);
      } else if (event.data.type === 'REQUEST_PROCESSED') {
        const request = event.data.data;
        setQueuedRequests(prev => 
          prev.filter(req => req.id !== `${request.timestamp}`)
        );
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    // Load queued requests from IndexedDB
    loadQueuedRequests();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  const getRequestDescription = (url: string, method: string): string => {
    const path = new URL(url, window.location.origin).pathname;
    
    if (path.includes('/projects')) {
      return method === 'POST' ? 'Create new project' : 'Update project';
    } else if (path.includes('/orders')) {
      return method === 'POST' ? 'Submit order request' : 'Update order';
    } else if (path.includes('/expenses')) {
      return method === 'POST' ? 'Submit expense' : 'Update expense';
    } else if (path.includes('/deliveries')) {
      return method === 'POST' ? 'Confirm delivery' : 'Update delivery';
    }
    
    return `${method} request to ${path}`;
  };

  const loadQueuedRequests = async () => {
    try {
      // This would load from IndexedDB in a real implementation
      // For now, we'll rely on service worker messages
    } catch (error) {
      console.error('Failed to load queued requests:', error);
    }
  };

  const attemptSync = async () => {
    setLastSyncAttempt(new Date());
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PROCESS_QUEUE'
      });
    }
  };

  const retryConnection = () => {
    window.location.reload();
  };

  return (
    <AppLayout
      title="Offline Mode"
      description="You're currently offline. Changes will be synced when connection is restored."
    >
      <div className="max-w-2xl mx-auto p-6">
        {/* Connection Status */}
        <div className={`
          rounded-xl border p-6 mb-6 text-center
          ${isOnline 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-orange-50 border-orange-200 text-orange-800'
          }
        `}>
          <div className="flex items-center justify-center mb-4">
            {isOnline ? (
              <CheckCircle className="h-12 w-12 text-green-600" />
            ) : (
              <WifiOff className="h-12 w-12 text-orange-600" />
            )}
          </div>
          
          <h2 className="text-xl font-semibold mb-2">
            {isOnline ? 'Connection Restored' : 'You\'re Offline'}
          </h2>
          
          <p className="text-sm opacity-75 mb-4">
            {isOnline 
              ? 'Your internet connection has been restored. Syncing queued changes...'
              : 'Don\'t worry - you can still use SiteProc. Your changes will be saved and synced when you\'re back online.'
            }
          </p>

          {!isOnline && (
            <Button
              variant="ghost"
              onClick={retryConnection}
              leftIcon={<RefreshCw className="h-4 w-4" />}
              className="bg-white border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              Retry Connection
            </Button>
          )}
        </div>

        {/* Queued Requests */}
        {queuedRequests.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Queued Changes ({queuedRequests.length})
              </h3>
              
              {isOnline && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={attemptSync}
                  leftIcon={<Send className="h-4 w-4" />}
                >
                  Sync Now
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {queuedRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {request.description}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(request.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  
                  <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                    {request.method}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-800">
                  These changes are safely stored on your device and will be automatically 
                  synced to the server when your internet connection is restored.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Offline Features */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            What you can do offline
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">View Data</p>
                <p className="text-sm text-gray-600">Browse projects, orders, expenses, and deliveries</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Create Entries</p>
                <p className="text-sm text-gray-600">Add new orders, expenses, and deliveries</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Edit Information</p>
                <p className="text-sm text-gray-600">Update existing records and data</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Automatic Sync</p>
                <p className="text-sm text-gray-600">Changes sync automatically when back online</p>
              </div>
            </div>
          </div>
        </div>

        {lastSyncAttempt && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Last sync attempt: {lastSyncAttempt.toLocaleTimeString()}
          </div>
        )}
      </div>
    </AppLayout>
  );
}