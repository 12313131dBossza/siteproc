'use client'

import { useState, useEffect } from 'react'

export default function SimpleNotificationTestPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])

  // Get current user on mount
  useEffect(() => {
    fetch('/api/me')
      .then(res => res.json())
      .then(data => {
        console.log('Current user:', data)
        setUser(data)
      })
      .catch(err => console.error('Failed to get user:', err))
  }, [])

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      console.log('Notifications:', data)
      setNotifications(data.data || [])
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const createNotification = async () => {
    if (!user) {
      alert('User not loaded yet. Wait a moment and try again.')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const payload = {
        userId: user.id,
        companyId: user.company_id,
        type: 'system',
        title: 'Test Notification',
        message: `This is a test notification created at ${new Date().toLocaleTimeString()}`,
        link: '/dashboard'
      }

      console.log('Sending payload:', payload)

      const res = await fetch('/api/create-notification-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      console.log('Response:', data)

      setResult(data)

      if (data.success) {
        // Refresh notifications after 1 second
        setTimeout(fetchNotifications, 1000)
      }
    } catch (error) {
      console.error('Error:', error)
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      fetchNotifications()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Simple Notification Test</h1>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current User</h2>
          {user ? (
            <div className="space-y-2">
              <p><strong>ID:</strong> <code className="text-xs bg-gray-100 px-2 py-1 rounded">{user.id}</code></p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Company ID:</strong> <code className="text-xs bg-gray-100 px-2 py-1 rounded">{user.company_id}</code></p>
            </div>
          ) : (
            <p className="text-gray-500">Loading user...</p>
          )}
        </div>

        {/* Create Button */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create Test Notification</h2>
          <button
            onClick={createNotification}
            disabled={loading || !user}
            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Creating...' : '✨ Create Notification Now'}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-lg shadow p-6 mb-6 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h2 className="text-xl font-semibold mb-4">
              {result.success ? '✅ Success!' : '❌ Error'}
            </h2>
            <pre className="bg-white p-4 rounded text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Your Notifications ({notifications.length})
            </h2>
            <button
              onClick={fetchNotifications}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              🔄 Refresh
            </button>
          </div>

          {notifications.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No notifications yet. Create one above!</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-lg border ${notif.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-500 uppercase">{notif.type}</span>
                        {!notif.read && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">NEW</span>}
                      </div>
                      <h3 className="font-semibold text-gray-900">{notif.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notif.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-blue-900 mb-3">📋 How This Works:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
            <li>Click "Create Notification Now" button</li>
            <li>Notification is inserted directly into database</li>
            <li>List below refreshes automatically after 1 second</li>
            <li>Check bell icon in navbar - should show badge</li>
            <li>Click bell to see notification in dropdown</li>
          </ol>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>No complex triggers, no order approvals - just pure notification creation!</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
