'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console
    console.error('Global application error:', error)
    
    // Try to send to Sentry if available
    try {
      if (typeof Sentry !== 'undefined' && Sentry.captureException) {
        Sentry.captureException(error, {
          level: 'fatal',
          tags: {
            component: 'global-error-boundary',
            digest: error.digest,
          },
          contexts: {
            errorBoundary: {
              componentStack: error.stack,
              errorDigest: error.digest,
              isCritical: true,
            },
          },
        })
      }
    } catch (sentryError) {
      console.error('Failed to send error to Sentry:', sentryError)
    }
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-100 rounded-full">
                <AlertTriangle className="h-12 w-12 text-red-600" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Critical Application Error
            </h1>
            
            <p className="text-gray-600 mb-6">
              We encountered a critical error that requires reloading the application. 
              Your work has been saved automatically.
            </p>

            {process.env.NODE_ENV === 'development' && error.message && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg text-left">
                <p className="text-xs font-mono text-gray-700 break-words">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs text-gray-500 mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}
            
            <button
              onClick={() => reset()}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-5 w-5" />
              Reload Application
            </button>

            <p className="text-xs text-gray-500 mt-6">
              If this problem persists, please clear your browser cache or{' '}
              <a href="mailto:support@siteproc.com" className="text-blue-600 hover:underline">
                contact support
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
