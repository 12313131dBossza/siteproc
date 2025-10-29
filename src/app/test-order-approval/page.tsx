'use client'

import { useState } from 'react'

export default function TestOrderApprovalPage() {
  const [orderId, setOrderId] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const approveOrder = async () => {
    if (!orderId) {
      alert('Please enter an order ID')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      console.log('🔔 Approving order:', orderId)
      
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'approved',
          notes: 'Test approval for notification'
        }),
      })

      const data = await response.json()
      console.log('🔔 Approval response:', data)
      
      setResult({
        success: response.ok,
        status: response.status,
        data
      })

      if (response.ok) {
        // Wait a moment then check notifications
        setTimeout(async () => {
          console.log('🔔 Checking notifications...')
          const notifResponse = await fetch('/api/notifications')
          const notifData = await notifResponse.json()
          console.log('🔔 Notifications:', notifData)
          
          setResult((prev: any) => ({
            ...prev,
            notifications: notifData
          }))
        }, 2000)
      }
    } catch (error) {
      console.error('❌ Error:', error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Order Approval & Notification</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step-by-Step Test</h2>
          
          <ol className="list-decimal list-inside space-y-3 mb-6 text-gray-700">
            <li>Go to <a href="/orders" className="text-blue-600 underline">/orders</a> and create a new order</li>
            <li>Copy the order ID from the URL (e.g., /orders/<strong>abc-123</strong>)</li>
            <li>Paste it below and click "Approve Order"</li>
            <li>Check the console logs (F12) for detailed notification flow</li>
            <li>Look at bell icon in navbar - should show badge</li>
          </ol>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order ID
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter order ID (UUID)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={approveOrder}
              disabled={loading || !orderId}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Approving...' : 'Approve Order & Create Notification'}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {result.success ? '✅ Result' : '❌ Error'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Status:</p>
                <p className="text-lg">{result.status}</p>
              </div>

              {result.data && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Order Response:</p>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}

              {result.notifications && (
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Notifications ({result.notifications.unreadCount || 0} unread):
                  </p>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                    {JSON.stringify(result.notifications, null, 2)}
                  </pre>
                </div>
              )}

              {result.error && (
                <div>
                  <p className="text-sm font-medium text-red-700">Error:</p>
                  <p className="text-red-600">{result.error}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-yellow-800 mb-2">🔍 What to Check:</h3>
          <ul className="list-disc list-inside space-y-2 text-yellow-800 text-sm">
            <li>Open browser console (F12) before clicking approve</li>
            <li>Look for logs starting with 🔔 (notification check)</li>
            <li>Check if "TESTING MODE" appears in logs</li>
            <li>Look for "Sending notification to user" message</li>
            <li>After approval, bell icon should show badge within 30 seconds</li>
            <li>Notifications section below should show the new notification</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-blue-800 mb-2">💡 Quick Links:</h3>
          <div className="space-y-2">
            <a href="/orders/new" className="block text-blue-600 hover:underline">
              → Create New Order
            </a>
            <a href="/orders" className="block text-blue-600 hover:underline">
              → View All Orders
            </a>
            <a href="/test-order-notif" className="block text-blue-600 hover:underline">
              → Direct Trigger Test (working version)
            </a>
            <a href="/debug-notifications" className="block text-blue-600 hover:underline">
              → Debug Notifications
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
