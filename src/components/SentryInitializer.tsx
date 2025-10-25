'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export function SentryInitializer() {
  useEffect(() => {
    // Initialize Sentry on client-side
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        environment: process.env.NODE_ENV || 'production',
        
        // Don't add integrations - they can cause constructor errors
        // Sentry will use default integrations automatically
        
        // Filter out common noise
        ignoreErrors: [
          'ResizeObserver loop limit exceeded',
          'Non-Error promise rejection captured',
        ],
      })
      
      console.log('[Sentry] Client initialized ✅')
      console.log('[Sentry] DSN configured:', !!process.env.NEXT_PUBLIC_SENTRY_DSN)
      
      // Make Sentry available globally for testing
      if (typeof window !== 'undefined') {
        (window as any).Sentry = Sentry
      }
    } else {
      console.warn('[Sentry] Not initialized - DSN missing')
    }
  }, [])
  
  return null
}
