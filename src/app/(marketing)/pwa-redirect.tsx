'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Detects if the app is running as an installed PWA (standalone mode)
 * and redirects to /dashboard automatically.
 * 
 * This ensures users who installed the app go directly to the app,
 * not the marketing landing page.
 */
export function PWARedirect() {
  const router = useRouter();

  useEffect(() => {
    // Check if running as installed PWA (standalone mode)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true || // iOS Safari
      document.referrer.includes('android-app://'); // Android TWA

    if (isStandalone) {
      // Redirect to dashboard - middleware will handle auth check
      router.replace('/dashboard');
    }
  }, [router]);

  // This component doesn't render anything
  return null;
}
