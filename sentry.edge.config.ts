// This file configures the initialization of Sentry for edge runtime.
// The config you add here will be used whenever the server handles a request in edge runtime.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Only initialize if DSN is provided
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    debug: false,
    environment: process.env.NODE_ENV || "development",
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "dev",
  });
  
  console.log('[Sentry] Edge runtime initialized ✅')
} else {
  console.log('[Sentry] Edge initialization skipped - no DSN configured')
}
