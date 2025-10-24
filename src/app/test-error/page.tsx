'use client'

import { AlertTriangle } from 'lucide-react'

export default function TestErrorPage() {
  const throwError = () => {
    throw new Error('Test error from test-error page - This is a Sentry integration test')
  }

  const throwAsyncError = async () => {
    await new Promise((resolve) => setTimeout(resolve, 100))
    throw new Error('Test async error from test-error page - This is a Sentry integration test')
  }

  const throwConsoleError = () => {
    console.error('Test console error - This should also be captured by Sentry')
  }

  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="container mx-auto py-12 px-4 max-w-2xl">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            <h1 className="text-xl font-semibold text-yellow-900">
              Test Page Not Available
            </h1>
          </div>
          <p className="text-yellow-800">
            This test error page is only available in development mode.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-2xl">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="h-8 w-8 text-red-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            Sentry Error Testing
          </h1>
        </div>

        <p className="text-gray-600 mb-8">
          Use these buttons to test different types of errors and verify Sentry integration is working correctly.
          Check your Sentry dashboard after triggering errors.
        </p>

        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              1. Synchronous Error
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Throws a standard synchronous error that will be caught by the error boundary.
            </p>
            <button 
              onClick={throwError} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Throw Sync Error
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              2. Asynchronous Error
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Throws an async error with a delay to test async error handling.
            </p>
            <button 
              onClick={throwAsyncError} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Throw Async Error
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              3. Console Error
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Logs an error to the console (may or may not be captured depending on Sentry config).
            </p>
            <button 
              onClick={throwConsoleError} 
              className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors font-medium border border-gray-300"
            >
              Log Console Error
            </button>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">
            📊 After Testing:
          </h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Check your Sentry dashboard for captured errors</li>
            <li>Verify error context (tags, component, digest) is included</li>
            <li>Confirm stack traces are properly source-mapped</li>
            <li>Test session replay if enabled</li>
          </ul>
        </div>

        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">
            🔗 Sentry Dashboard:
          </h3>
          <p className="text-sm text-gray-600">
            Visit{' '}
            <a
              href="https://sentry.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              sentry.io
            </a>
            {' '}to view captured errors in your project.
          </p>
        </div>
      </div>
    </div>
  )
}
