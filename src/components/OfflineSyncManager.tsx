'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, Clock, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface QueuedRequest {
  url: string;
  method: string;
  timestamp: number;
  id?: number;
}

interface OfflineSyncManagerProps {
  showIndicator?: boolean;
}

export function OfflineSyncManager({ showIndicator = true }: OfflineSyncManagerProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [queuedItems, setQueuedItems] = useState<QueuedRequest[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Check online status
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored! Syncing pending changes...', {
        icon: <Wifi className="h-4 w-4 text-green-500" />,
      });
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline. Changes will be saved locally.', {
        icon: <WifiOff className="h-4 w-4 text-yellow-500" />,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for service worker messages
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        const { type, data } = event.data || {};

        switch (type) {
          case 'REQUEST_QUEUED':
            setQueuedItems((prev) => [...prev, data]);
            toast.info('Request saved for offline sync', {
              icon: <Clock className="h-4 w-4 text-blue-500" />,
            });
            break;

          case 'REQUEST_PROCESSED':
            setQueuedItems((prev) =>
              prev.filter((item) => item.timestamp !== data.timestamp)
            );
            toast.success('Synced: ' + data.url.split('/api/')[1], {
              icon: <CheckCircle className="h-4 w-4 text-green-500" />,
            });
            break;

          case 'SYNC_COMPLETE':
            setIsSyncing(false);
            if (data.failed > 0) {
              toast.error(`${data.failed} items failed to sync`);
            }
            break;
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  // Load queued items from IndexedDB
  const loadQueuedItems = useCallback(async () => {
    if (!('indexedDB' in window)) return;

    try {
      const db = await openOfflineDB();
      const transaction = db.transaction(['queue'], 'readonly');
      const store = transaction.objectStore('queue');
      
      const request = store.getAll();
      request.onsuccess = () => {
        setQueuedItems(request.result || []);
      };
    } catch (error) {
      console.error('Failed to load queued items:', error);
    }
  }, []);

  useEffect(() => {
    loadQueuedItems();
  }, [loadQueuedItems]);

  // Trigger sync via service worker
  const triggerSync = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    setIsSyncing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Try background sync first
      if ('sync' in registration) {
        await (registration as any).sync.register('offline-queue');
      } else {
        // Fallback: message the service worker
        const controller = navigator.serviceWorker.controller;
        if (controller) {
          controller.postMessage({ type: 'PROCESS_QUEUE' });
        }
      }
    } catch (error) {
      console.error('Failed to trigger sync:', error);
      setIsSyncing(false);
    }

    // Reload queued items after a delay
    setTimeout(loadQueuedItems, 2000);
  }, [loadQueuedItems]);

  if (!showIndicator) return null;

  // No indicator if online and no queued items
  if (isOnline && queuedItems.length === 0 && !isSyncing) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Main indicator */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all ${
          !isOnline
            ? 'bg-yellow-500 text-white hover:bg-yellow-600'
            : isSyncing
            ? 'bg-blue-500 text-white animate-pulse'
            : queuedItems.length > 0
            ? 'bg-orange-500 text-white hover:bg-orange-600'
            : 'bg-green-500 text-white'
        }`}
      >
        {!isOnline ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">Offline</span>
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Syncing...</span>
          </>
        ) : queuedItems.length > 0 ? (
          <>
            <Upload className="h-4 w-4" />
            <span className="text-sm font-medium">{queuedItems.length} pending</span>
          </>
        ) : (
          <>
            <Wifi className="h-4 w-4" />
            <span className="text-sm font-medium">Synced</span>
          </>
        )}
      </button>

      {/* Details panel */}
      {showDetails && (queuedItems.length > 0 || !isOnline) && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-lg shadow-xl border overflow-hidden">
          <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Offline Sync Status</h4>
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              isOnline ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {queuedItems.length > 0 ? (
            <div className="max-h-64 overflow-y-auto">
              {queuedItems.map((item, index) => (
                <div
                  key={item.timestamp || index}
                  className="p-3 border-b last:border-0 flex items-start gap-3"
                >
                  <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.method} {item.url.split('/api/')[1] || item.url}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <WifiOff className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                No pending changes. You're all synced!
              </p>
            </div>
          )}

          {isOnline && queuedItems.length > 0 && (
            <div className="p-3 bg-gray-50 border-t">
              <button
                onClick={triggerSync}
                disabled={isSyncing}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper to open IndexedDB
function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SiteProcOffline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('queue')) {
        const store = db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

export default OfflineSyncManager;
