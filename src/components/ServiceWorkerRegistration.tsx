'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker after page load
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });
          
          console.log('[SW] Service Worker registered with scope:', registration.scope);
          
          // Check for updates periodically
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content available, show update notification
                  console.log('[SW] New content available, refresh to update');
                }
              });
            }
          });
        } catch (error) {
          console.error('[SW] Service Worker registration failed:', error);
        }
      });
    }
  }, []);

  return null;
}
