import * as Sentry from '@sentry/nextjs'
import { BrowserTracing, Replay } from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Debugging
  debug: process.env.NODE_ENV === 'development',
  
  // Performance monitoring
  integrations: [
    new BrowserTracing(),
    new Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
})

console.log('[Sentry] Initialized with DSN:', process.env.NEXT_PUBLIC_SENTRY_DSN ? 'Set ✅' : 'Missing ❌');

