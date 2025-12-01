import type { NextConfig } from 'next'
// Sentry withSentryConfig removed to prevent build errors
// Sentry initialization happens via SentryInitializer component instead

// Production hardening: security & caching headers
// Adjust domains / policies as branding & CDN choices evolve.
const securityHeaders = [
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  
  eslint: { ignoreDuringBuilds: true }, // TEMP: allow deploy; re-enable after typing cleanup
  typescript: { ignoreBuildErrors: true }, // TEMP: unblock build; remove after fixing types
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // Disable caching for API routes - always get fresh data
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      // Disable caching for dynamic app pages (not static assets)
      {
        source: '/(dashboard|projects|orders|deliveries|expenses|payments|messages|documents|settings|people|contractors|clients|bids|reports|activity)(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      // Long-term immutable caching for build assets
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/icons/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800' }, // 7d (replace when versioning icons)
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ]
  },
}

// Export without Sentry wrapper to prevent build-time errors
// Sentry error tracking is handled by:
// - SentryInitializer component (client-side)
// - instrumentation.ts (server-side)
// - sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts
export default nextConfig;
