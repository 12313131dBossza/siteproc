import * as Sentry from '@sentry/nextjs'

// This file is kept for compatibility but initialization is handled by SentryInitializer component
// Only initialize if DSN is provided
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  // Use minimal config without integrations to avoid constructor errors
  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    enabled: true,
    environment: process.env.NODE_ENV,
    debug: process.env.NODE_ENV === 'development',
    // Don't add integrations here - they're added in SentryInitializer
  })
  
  console.log('[Sentry] Client config initialized ✅')
} else {
  console.log('[Sentry] Client config skipped - no DSN configured')
}
