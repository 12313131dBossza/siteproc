import * as Sentry from '@sentry/nextjs'

// Only initialize if DSN is provided
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    enabled: true,
    environment: process.env.NODE_ENV,
  })
  
  console.log('[Sentry] Server initialized ✅')
} else {
  console.log('[Sentry] Server initialization skipped - no DSN configured')
}
