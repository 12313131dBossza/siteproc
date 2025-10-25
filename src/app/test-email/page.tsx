'use client'

import { useState } from 'react'

export default function TestEmailPage() {
  const [testResults, setTestResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [testEmail, setTestEmail] = useState('')

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testSimpleEmail = async () => {
    if (!testEmail) {
      addResult('❌ Please enter an email address')
      return
    }

    setLoading(true)
    addResult('📧 Sending test email...')

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail })
      })

      const data = await response.json()

      if (response.ok) {
        addResult('✅ Email sent successfully!')
        addResult(`📬 Check ${testEmail} for the test email`)
        if (data.id) {
          addResult(`📝 Email ID: ${data.id}`)
        }
      } else {
        addResult(`❌ Failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      addResult(`❌ Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testOrderNotification = async () => {
    if (!testEmail) {
      addResult('❌ Please enter an email address')
      return
    }

    setLoading(true)
    addResult('📧 Sending order notification test...')

    try {
      const response = await fetch('/api/test-email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: testEmail,
          type: 'order-request'
        })
      })

      const data = await response.json()

      if (response.ok) {
        addResult('✅ Order notification sent!')
        addResult(`📬 Check ${testEmail} for the order request email`)
      } else {
        addResult(`❌ Failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      addResult(`❌ Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testExpenseNotification = async () => {
    if (!testEmail) {
      addResult('❌ Please enter an email address')
      return
    }

    setLoading(true)
    addResult('📧 Sending expense notification test...')

    try {
      const response = await fetch('/api/test-email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: testEmail,
          type: 'expense-submission'
        })
      })

      const data = await response.json()

      if (response.ok) {
        addResult('✅ Expense notification sent!')
        addResult(`📬 Check ${testEmail} for the expense submission email`)
      } else {
        addResult(`❌ Failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      addResult(`❌ Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testDeliveryNotification = async () => {
    if (!testEmail) {
      addResult('❌ Please enter an email address')
      return
    }

    setLoading(true)
    addResult('📧 Sending delivery notification test...')

    try {
      const response = await fetch('/api/test-email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: testEmail,
          type: 'delivery-confirmation'
        })
      })

      const data = await response.json()

      if (response.ok) {
        addResult('✅ Delivery notification sent!')
        addResult(`📬 Check ${testEmail} for the delivery confirmation email`)
      } else {
        addResult(`❌ Failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      addResult(`❌ Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testBudgetAlert = async () => {
    if (!testEmail) {
      addResult('❌ Please enter an email address')
      return
    }

    setLoading(true)
    addResult('📧 Sending budget alert test...')

    try {
      const response = await fetch('/api/test-email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: testEmail,
          type: 'budget-alert'
        })
      })

      const data = await response.json()

      if (response.ok) {
        addResult('✅ Budget alert sent!')
        addResult(`📬 Check ${testEmail} for the budget variance alert`)
      } else {
        addResult(`❌ Failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      addResult(`❌ Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-4">📧 Email System Test</h1>
          <p className="text-gray-600 mb-8">
            Test email notifications and templates to verify Resend integration.
          </p>

          {/* Email Input */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Email Address
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your-email@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter your email to receive test notifications
            </p>
          </div>

          {/* Test Buttons */}
          <div className="space-y-4 mb-8">
            <h2 className="text-xl font-semibold mb-4">Email Tests:</h2>
            
            <button
              onClick={testSimpleEmail}
              disabled={loading || !testEmail}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              📧 Send Simple Test Email
            </button>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={testOrderNotification}
                disabled={loading || !testEmail}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                📝 Order Request
              </button>

              <button
                onClick={testExpenseNotification}
                disabled={loading || !testEmail}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                💰 Expense Submission
              </button>

              <button
                onClick={testDeliveryNotification}
                disabled={loading || !testEmail}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                📦 Delivery Confirmation
              </button>

              <button
                onClick={testBudgetAlert}
                disabled={loading || !testEmail}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                ⚠️ Budget Alert
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
              <li>Enter your email address above</li>
              <li>Click <strong>"Send Simple Test Email"</strong> to test basic sending</li>
              <li>Check your inbox (and spam folder) for the test email</li>
              <li>Try the notification templates to see real email designs</li>
              <li>All emails are sent via Resend API</li>
            </ol>
          </div>

          {/* Configuration Info */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3 text-blue-900">⚙️ Configuration:</h3>
            <ul className="space-y-2 text-blue-800 text-sm">
              <li><strong>Provider:</strong> Resend</li>
              <li><strong>Free Tier:</strong> 100 emails/day, 3,000/month</li>
              <li><strong>From Address:</strong> onboarding@resend.dev (default)</li>
              <li><strong>API Key:</strong> {process.env.RESEND_API_KEY ? '✅ Configured' : '❌ Missing'}</li>
            </ul>
          </div>

          {/* Next Steps */}
          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3 text-green-900">🚀 Next Steps:</h3>
            <ol className="space-y-2 text-green-800 list-decimal list-inside">
              <li>Verify domain in Resend to use custom email address</li>
              <li>Add RESEND_API_KEY to Vercel environment variables</li>
              <li>Integrate notifications into order/expense/delivery workflows</li>
              <li>Add user notification preferences UI</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
