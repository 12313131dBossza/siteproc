// Service Worker for SiteProc - Offline queue and caching
const CACHE_NAME = 'siteproc-v1'
const OFFLINE_QUEUE_KEY = 'siteproc-offline-queue'

// Files to cache for offline access
const STATIC_FILES = [
  '/',
  '/dashboard',
  '/projects',
  '/orders',
  '/expenses',
  '/deliveries',
  '/offline',
  '/manifest.json'
]

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static files')
        return cache.addAll(STATIC_FILES)
      })
      .then(() => {
        console.log('[SW] Static files cached')
        return self.skipWaiting()
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker')
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Service worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - handle requests with cache-first strategy for static files
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Handle static files with cache-first strategy
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Serving from cache:', request.url)
            return cachedResponse
          }

          return fetch(request)
            .then((response) => {
              // Cache successful responses
              if (response.status === 200) {
                const responseClone = response.clone()
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseClone)
                  })
              }
              return response
            })
            .catch(() => {
              // Serve offline page for navigation requests
              if (request.mode === 'navigate') {
                return caches.match('/offline')
              }
              throw new Error('Network request failed and no cache available')
            })
        })
    )
  }
})

// Handle API requests with offline queue
async function handleApiRequest(request) {
  try {
    // Try network first
    const response = await fetch(request)
    
    // If successful, process any queued requests
    if (response.ok && navigator.onLine) {
      processOfflineQueue()
    }
    
    return response
  } catch (error) {
    console.log('[SW] API request failed, checking if queueable:', request.method, request.url)
    
    // Queue POST, PUT, PATCH, DELETE requests for later
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      await queueRequest(request)
      
      // Return a synthetic response indicating the request was queued
      return new Response(
        JSON.stringify({
          success: false,
          queued: true,
          message: 'Request queued for when connection is restored'
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    // For GET requests, try to serve from cache or return error
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    throw error
  }
}

// Queue request for offline processing
async function queueRequest(request) {
  try {
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.text() : null,
      timestamp: Date.now()
    }

    // Use IndexedDB for persistent storage
    const db = await openOfflineDB()
    const transaction = db.transaction(['queue'], 'readwrite')
    const store = transaction.objectStore('queue')
    
    await store.add(requestData)
    console.log('[SW] Request queued for offline processing:', requestData)
    
    // Notify clients about queued request
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'REQUEST_QUEUED',
        data: requestData
      })
    })
  } catch (error) {
    console.error('[SW] Failed to queue request:', error)
  }
}

// Process queued requests when back online
async function processOfflineQueue() {
  try {
    console.log('[SW] Processing offline queue')
    const db = await openOfflineDB()
    const transaction = db.transaction(['queue'], 'readwrite')
    const store = transaction.objectStore('queue')
    
    const queuedRequests = await store.getAll()
    
    // Ensure queuedRequests is an array
    if (!queuedRequests || !Array.isArray(queuedRequests)) {
      console.log('[SW] No queued requests or invalid format')
      return
    }
    
    console.log('[SW] Found queued requests:', queuedRequests.length)
    
    for (const requestData of queuedRequests) {
      try {
        const { url, method, headers, body } = requestData
        
        const response = await fetch(url, {
          method,
          headers,
          body: body && method !== 'GET' ? body : undefined
        })
        
        if (response.ok) {
          console.log('[SW] Successfully processed queued request:', url)
          await store.delete(requestData.id)
          
          // Notify clients about successful processing
          const clients = await self.clients.matchAll()
          clients.forEach(client => {
            client.postMessage({
              type: 'REQUEST_PROCESSED',
              data: requestData
            })
          })
        } else {
          console.warn('[SW] Queued request failed with status:', response.status, url)
        }
      } catch (error) {
        console.warn('[SW] Failed to process queued request:', requestData.url, error)
      }
    }
  } catch (error) {
    console.error('[SW] Failed to process offline queue:', error)
  }
}

// Open IndexedDB for offline queue storage
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SiteProcOffline', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      if (!db.objectStoreNames.contains('queue')) {
        const store = db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true })
        store.createIndex('timestamp', 'timestamp')
        console.log('[SW] Created offline queue object store')
      }
    }
  })
}

// Handle background sync (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-queue') {
    console.log('[SW] Background sync triggered')
    event.waitUntil(processOfflineQueue())
  }
})

// Handle push notifications (placeholder for future enhancement)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')
  // Implementation for push notifications would go here
})

// Listen for messages from clients
self.addEventListener('message', (event) => {
  const { type, data } = event.data
  
  switch (type) {
    case 'PROCESS_QUEUE':
      processOfflineQueue()
      break
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
    default:
      console.log('[SW] Unknown message type:', type)
  }
})