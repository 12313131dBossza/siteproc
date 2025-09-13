"use client"
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'

type ChangeOrder = {
  id: string
  order_id: string
  proposed_qty: number
  reason: string | null
  description: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  decided_by?: string
  decided_at?: string
  created_by?: string
}

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: 'Pending Review' },
  approved: { icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200', label: 'Rejected' }
}

export default function AdminChangeOrdersPage() {
  const [pending, setPending] = useState<ChangeOrder[]>([])
  const [history, setHistory] = useState<ChangeOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)

  async function loadPending() {
    const res = await fetch(`/api/admin/change-orders`)
    const json = await res.json()
    if (res.ok) setPending(json.data || [])
  }

  async function loadHistory() {
    const res = await fetch(`/api/admin/change-orders?include_history=true`)
    const json = await res.json()
    if (res.ok) {
      const all = json.data || []
      setHistory(all.filter((r: ChangeOrder) => r.status !== 'pending'))
    }
  }

  async function load() {
    setLoading(true)
    await loadPending()
    if (showHistory) await loadHistory()
    setLoading(false)
  }

  useEffect(() => { load() }, [showHistory])

  async function approve(id: string) {
    setProcessing(id)
    const res = await fetch(`/api/change-orders/${id}/approve`, { method: 'POST' })
    if (res.ok) {
      await load()
    } else {
      const error = await res.json()
      alert(`Failed to approve: ${error.error || 'Unknown error'}`)
    }
    setProcessing(null)
  }

  async function reject(id: string) {
    setProcessing(id)
    const res = await fetch(`/api/change-orders/${id}/reject`, { method: 'POST' })
    if (res.ok) {
      await load()
    } else {
      const error = await res.json()
      alert(`Failed to reject: ${error.error || 'Unknown error'}`)
    }
    setProcessing(null)
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  function ChangeOrderCard({ order, showActions = false }: { order: ChangeOrder; showActions?: boolean }) {
    const { icon: StatusIcon, color, label } = statusConfig[order.status]
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                {order.order_id.slice(0, 8)}...
              </span>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium ${color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {label}
              </div>
            </div>
            <div className="text-lg font-semibold text-gray-900 mb-1">
              Quantity Change: {order.proposed_qty}
            </div>
            {(order.reason || order.description) && (
              <div className="text-gray-600 mb-3">
                <span className="text-sm font-medium text-gray-500">Reason: </span>
                {order.reason || order.description}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <div>Requested: {formatDateTime(order.created_at)}</div>
            {order.decided_at && (
              <div>Decided: {formatDateTime(order.decided_at)}</div>
            )}
          </div>
          
          {showActions && order.status === 'pending' && (
            <div className="flex gap-2">
              <button
                onClick={() => approve(order.id)}
                disabled={processing === order.id}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                {processing === order.id ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={() => reject(order.id)}
                disabled={processing === order.id}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <XCircle className="w-4 h-4" />
                {processing === order.id ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <AppLayout
      title="Change Orders"
      description="Review and manage quantity change requests"
    >
      <div className="mb-6">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {showHistory ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showHistory ? 'Hide History' : 'Show History'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending Requests */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Pending Requests ({pending.length})
              </h2>
            </div>
            
            {pending.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No pending change requests</p>
                <p className="text-sm text-gray-500 mt-1">All caught up!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {pending.map(order => (
                  <ChangeOrderCard key={order.id} order={order} showActions={true} />
                ))}
              </div>
            )}
          </div>

          {/* History */}
          {showHistory && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Recent History ({history.length})
                </h2>
              </div>
              
              {history.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No change order history yet</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {history.map(order => (
                    <ChangeOrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  )
}
 
