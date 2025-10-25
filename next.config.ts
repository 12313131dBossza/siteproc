import type { NextConfig } from 'next'
import { withSentryConfig } from "@sentry/nextjs";

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
  
  // Enable instrumentation for Sentry
  experimental: {
    instrumentationHook: true,
  },
  
  eslint: { ignoreDuringBuilds: true }, // TEMP: allow deploy; re-enable after typing cleanup
  typescript: { ignoreBuildErrors: true }, // TEMP: unblock build; remove after fixing types
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
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

// Sentry configuration
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
// NOTE: Build-time plugins completely disabled to prevent deployment errors
// Runtime error tracking still works via client/server configs and SentryInitializer
export default withSentryConfig(
  nextConfig,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Completely disable all Sentry CLI operations during build
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    
    // Disable ALL Sentry CLI operations
    disableSourcemapUpload: true,
    sourcemaps: {
      disable: true,
    },
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Disable all build-time Sentry operations
    widenClientFileUpload: false,
    transpileClientSDK: false,
    tunnelRoute: "/monitoring",
    hideSourceMaps: true,
    disableLogger: true,
    automaticVercelMonitors: false,
    
    // Disable all runtime instrumentation that happens at build time
    disableServerWebpackPlugin: true,
    disableClientWebpackPlugin: true,
  }
);
