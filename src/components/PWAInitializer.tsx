"use client";

import { useEffect, useState } from 'react';
import { initPWA, pwaManager } from '@/lib/pwa';

declare global {
  interface Window {
    deferredPrompt?: any;
  }
}

export default function PWAInitializer() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    // Initialize PWA features
    initPWA().then((success) => {
      if (success) {
        console.log('PWA initialized successfully');
      }
    });

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show install badge
      const installBadge = document.getElementById('install-badge');
      if (installBadge) {
        installBadge.classList.remove('hidden');
        installBadge.addEventListener('click', handleInstallClick);
      }
    };

    // Handle online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      updateOfflineBadge(false);
      
      // Trigger queue processing
      pwaManager.processOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateOfflineBadge(true);
    };

    // Listen for service worker messages
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'REQUEST_QUEUED':
          setQueueCount(prev => prev + 1);
          updateOfflineBadge(true, queueCount + 1);
          break;
        case 'REQUEST_PROCESSED':
          setQueueCount(prev => Math.max(0, prev - 1));
          updateOfflineBadge(!isOnline, Math.max(0, queueCount - 1));
          break;
      }
    };

    // Check initial online status
    setIsOnline(navigator.onLine);

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
      
      const installBadge = document.getElementById('install-badge');
      if (installBadge) {
        installBadge.removeEventListener('click', handleInstallClick);
      }
    };
  }, [isOnline, queueCount]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    
    // Hide install badge
    const installBadge = document.getElementById('install-badge');
    if (installBadge) {
      installBadge.classList.add('hidden');
    }
  };

  const updateOfflineBadge = (show: boolean, count?: number) => {
    const offlineBadge = document.getElementById('offline-badge');
    if (!offlineBadge) return;

    if (show && (count === undefined || count > 0)) {
      offlineBadge.textContent = count !== undefined ? `Sync pending (${count})` : 'Offline';
      offlineBadge.classList.remove('hidden');
    } else {
      offlineBadge.classList.add('hidden');
    }
  };

  // This component doesn't render anything visible
  return null;
}