'use client'

import { useState } from 'react'

export default function OneClickTestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const createNotification = async () => {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/one-click-notification', {
        method: 'POST'
      })

      const data = await res.json()
      setResult(data)

      if (data.success) {
        // Auto-refresh page after 2 seconds to update bell
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (error) {
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="text-6xl mb-6">🔔</div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            One-Click Notification Test
          </h1>
          
          <p className="text-xl text-gray-600 mb-8">
            Click the button below to create a notification instantly!
          </p>

          <button
            onClick={createNotification}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-12 py-6 rounded-xl text-xl font-bold hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
          >
            {loading ? '⏳ Creating...' : '✨ Create Notification NOW'}
          </button>

          {result && (
            <div className={`mt-8 p-6 rounded-lg ${result.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
              {result.success ? (
                <>
                  <div className="text-4xl mb-3">✅</div>
                  <h2 className="text-2xl font-bold text-green-800 mb-2">
                    Success!
                  </h2>
                  <p className="text-green-700 mb-4">
                    {result.message}
                  </p>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">What to check:</p>
                    <ul className="text-left text-sm space-y-2">
                      <li>✅ Look at the <strong>bell icon</strong> in the top navbar</li>
                      <li>✅ You should see a <strong>red badge</strong> with a number</li>
                      <li>✅ Click the bell to see your notification</li>
                      <li>✅ Page will auto-refresh in 2 seconds...</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-3">❌</div>
                  <h2 className="text-2xl font-bold text-red-800 mb-2">
                    Error
                  </h2>
                  <p className="text-red-700 text-sm">
                    {result.error}
                  </p>
                </>
              )}
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-3">How it works:</h3>
            <ol className="text-left text-sm text-gray-600 space-y-2 max-w-md mx-auto">
              <li>1️⃣ Click button → Calls API</li>
              <li>2️⃣ API inserts notification into database</li>
              <li>3️⃣ Bell icon automatically shows badge</li>
              <li>4️⃣ Click bell to see notification dropdown</li>
            </ol>
          </div>

          <div className="mt-8">
            <a href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
