// PWA Registration and Offline Queue Management (SSR-safe)

const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';

export class PWAManager {
  private serviceWorker: ServiceWorker | null = null;
  private offlineQueue: OfflineQueueManager | OfflineQueueMemory;

  constructor() {
    this.offlineQueue = isBrowser ? new OfflineQueueManager() : new OfflineQueueMemory();
  }

  async register(): Promise<boolean> {
    if (!isBrowser || !('serviceWorker' in navigator)) {
      return false;
    }
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
      registration.addEventListener('updatefound', () => {
        const nw = registration.installing;
        if (nw) {
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateAvailable();
            }
          });
        }
      });
      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));
      if (registration.active) this.serviceWorker = registration.active;
      return true;
    } catch (e) {
      console.error('SW registration failed', e);
      return false;
    }
  }

  private handleMessage(event: MessageEvent) {
    const { type, data } = (event?.data ?? {}) as any;
    if (type === 'REQUEST_QUEUED') {
      this.offlineQueue.addToQueue(data);
    } else if (type === 'REQUEST_PROCESSED') {
      this.offlineQueue.removeFromQueue(data?.timestamp);
    }
  }

  private showUpdateAvailable() {
    if (!isBrowser) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('SiteProc Update Available', {
        body: 'A new version is available. Refresh to update.',
        icon: '/icons/icon-192.png',
        tag: 'update-available'
      });
    }
  }

  skipWaiting() {
    if (!isBrowser) return;
    this.serviceWorker?.postMessage({ type: 'SKIP_WAITING' });
  }

  processOfflineQueue() {
    if (!isBrowser) return;
    navigator.serviceWorker.controller?.postMessage({ type: 'PROCESS_QUEUE' });
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!isBrowser || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  canInstall(): boolean {
    return isBrowser && 'beforeinstallprompt' in window;
  }

  getOfflineQueueStatus() {
    return this.offlineQueue.getStatus();
  }
}

class OfflineQueueManager {
  private dbName = 'SiteProcOffline';
  private version = 1;
  private queue: Map<string, any> = new Map();

  private async initDB(): Promise<IDBDatabase> {
    if (!isBrowser || typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('IndexedDB is not available in this environment'));
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('queue')) {
          const store = db.createObjectStore('queue', { keyPath: 'timestamp' });
          store.createIndex('url', 'url');
          store.createIndex('method', 'method');
        }
      };
    });
  }

  async addToQueue(requestData: any) {
    try {
      const db = await this.initDB();
      const tx = db.transaction(['queue'], 'readwrite');
      const store = tx.objectStore('queue');
      await new Promise((resolve, reject) => {
        const req = store.add(requestData);
        req.onsuccess = () => resolve(undefined);
        req.onerror = () => reject(req.error);
      });
      this.queue.set(String(requestData.timestamp ?? Date.now()), requestData);
    } catch {
      this.queue.set(String(requestData.timestamp ?? Date.now()), requestData);
    }
  }

  async removeFromQueue(timestamp: number) {
    try {
      const db = await this.initDB();
      const tx = db.transaction(['queue'], 'readwrite');
      const store = tx.objectStore('queue');
      await new Promise((resolve, reject) => {
        const req = store.delete(timestamp);
        req.onsuccess = () => resolve(undefined);
        req.onerror = () => reject(req.error);
      });
      this.queue.delete(String(timestamp));
    } catch {
      this.queue.delete(String(timestamp));
    }
  }

  async getAllQueued(): Promise<any[]> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(['queue'], 'readonly');
      const store = tx.objectStore('queue');
      return await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return Array.from(this.queue.values());
    }
  }

  getStatus() {
    return { count: this.queue.size, items: Array.from(this.queue.values()) };
  }
}

class OfflineQueueMemory {
  private queue: Map<string, any> = new Map();
  async addToQueue(requestData: any) {
    this.queue.set(String(requestData?.timestamp ?? Date.now()), requestData);
  }
  async removeFromQueue(timestamp: number) {
    this.queue.delete(String(timestamp));
  }
  async getAllQueued(): Promise<any[]> {
    return Array.from(this.queue.values());
  }
  getStatus() {
    return { count: this.queue.size, items: Array.from(this.queue.values()) };
  }
}

export const pwaManager = new PWAManager();

export async function initPWA() {
  try {
    const registered = await pwaManager.register();
    if (registered) {
      pwaManager.requestNotificationPermission().catch(() => void 0);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to initialize PWA features:', e);
    return false;
  }
}

export async function offlineCapableFetch(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes((options.method || 'GET').toUpperCase())) {
      return new Response(
        JSON.stringify({ success: false, queued: true, message: 'Request queued for when connection is restored' }),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
      );
    }
    throw error;
  }
}
