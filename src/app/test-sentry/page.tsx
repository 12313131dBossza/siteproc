'use client'

import { useState } from 'react'

export default function TestSentryPage() {
  const [testResults, setTestResults] = useState<string[]>([])

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testSentryLoaded = () => {
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      addResult('✅ Sentry is loaded and available')
      console.log('Sentry object:', (window as any).Sentry)
      return true
    } else {
      addResult('❌ Sentry is NOT loaded')
      return false
    }
  }

  const testCaptureException = async () => {
    try {
      if (!(window as any).Sentry) {
        addResult('❌ Sentry not available')
        return
      }

      const testError = new Error('Test Exception from Sentry Test Page')
      ;(window as any).Sentry.captureException(testError, {
        tags: {
          test_type: 'manual_exception',
          page: 'test-sentry'
        },
        user: {
          email: 'test@example.com'
        }
      })
      
      addResult('✅ Exception captured and sent to Sentry')
      addResult('➡️ Check your Sentry dashboard in 30-60 seconds')
    } catch (error) {
      addResult(`❌ Error: ${error}`)
    }
  }

  const testCaptureMessage = () => {
    try {
      if (!(window as any).Sentry) {
        addResult('❌ Sentry not available')
        return
      }

      ;(window as any).Sentry.captureMessage('Test message from Sentry Test Page', {
        level: 'info',
        tags: {
          test_type: 'manual_message',
          page: 'test-sentry'
        }
      })
      
      addResult('✅ Message captured and sent to Sentry')
      addResult('➡️ Check your Sentry dashboard in 30-60 seconds')
    } catch (error) {
      addResult(`❌ Error: ${error}`)
    }
  }

  const testThrowError = () => {
    addResult('⚠️ Throwing error in 1 second...')
    setTimeout(() => {
      throw new Error('Thrown error from Sentry Test Page - This should be caught by Sentry!')
    }, 1000)
  }

  const testUnhandledRejection = () => {
    addResult('⚠️ Creating unhandled promise rejection...')
    Promise.reject(new Error('Unhandled promise rejection from Sentry Test Page'))
    addResult('➡️ Unhandled rejection created - check Sentry dashboard')
  }

  const checkDSN = () => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
    if (dsn) {
      addResult(`✅ DSN is configured: ${dsn.substring(0, 30)}...`)
    } else {
      addResult('❌ DSN is NOT configured in environment variables')
    }
  }

  const runAllTests = async () => {
    setTestResults([])
    addResult('🧪 Starting Sentry tests...')
    addResult('---')
    
    // Test 1: Check DSN
    addResult('Test 1: Check DSN configuration')
    checkDSN()
    addResult('---')
    
    // Test 2: Check if Sentry is loaded
    addResult('Test 2: Check if Sentry is loaded')
    const sentryLoaded = testSentryLoaded()
    addResult('---')
    
    if (!sentryLoaded) {
      addResult('❌ Cannot continue - Sentry is not loaded')
      return
    }
    
    // Test 3: Capture exception
    addResult('Test 3: Capture exception')
    await testCaptureException()
    addResult('---')
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Test 4: Capture message
    addResult('Test 4: Capture message')
    testCaptureMessage()
    addResult('---')
    
    addResult('✅ All tests completed!')
    addResult('📊 Go to your Sentry dashboard to see the captured errors')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-4">🔍 Sentry Test Page</h1>
          <p className="text-gray-600 mb-8">
            Use these tests to verify Sentry error tracking is working correctly.
          </p>

          {/* Test Buttons */}
          <div className="space-y-4 mb-8">
            <h2 className="text-xl font-semibold mb-4">Quick Tests:</h2>
            
            <button
              onClick={runAllTests}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              🧪 Run All Tests
            </button>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={testSentryLoaded}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Check if Sentry Loaded
              </button>

              <button
                onClick={checkDSN}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Check DSN Config
              </button>

              <button
                onClick={testCaptureException}
                className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Test Exception Capture
              </button>

              <button
                onClick={testCaptureMessage}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Test Message Capture
              </button>

              <button
                onClick={testThrowError}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                ⚠️ Throw Error
              </button>

              <button
                onClick={testUnhandledRejection}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                ⚠️ Unhandled Rejection
              </button>
            </div>
          </div>

          {/* Results */}
          {testResults.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Test Results:</h2>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="mb-1">
                    {result}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setTestResults([])}
                className="mt-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Clear Results
              </button>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 border-t pt-8">
            <h2 className="text-xl font-semibold mb-4">📋 How to Test:</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Click <strong>"Run All Tests"</strong> to run a complete test suite</li>
              <li>Watch the results appear below</li>
              <li>Open your Sentry dashboard: <a href="https://sentry.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://sentry.io</a></li>
              <li>Wait 30-60 seconds for errors to appear</li>
              <li>You should see test errors with tags like <code className="bg-gray-100 px-2 py-1 rounded">test_type: manual_exception</code></li>
            </ol>
          </div>

          {/* Expected Results */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3 text-blue-900">✅ What Success Looks Like:</h3>
            <ul className="space-y-2 text-blue-800">
              <li>✅ Sentry is loaded and available</li>
              <li>✅ DSN is configured</li>
              <li>✅ Exception captured and sent to Sentry</li>
              <li>✅ Message captured and sent to Sentry</li>
              <li>✅ Errors appear in Sentry dashboard within 1 minute</li>
            </ul>
          </div>

          {/* Troubleshooting */}
          <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3 text-red-900">❌ If Tests Fail:</h3>
            <ul className="space-y-2 text-red-800">
              <li><strong>DSN not configured:</strong> Add NEXT_PUBLIC_SENTRY_DSN to Vercel</li>
              <li><strong>Sentry not loaded:</strong> Check browser console for errors</li>
              <li><strong>Errors not appearing:</strong> Wait 2-3 minutes, check your Sentry project name</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
