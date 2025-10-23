"use client"
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, AlertCircle, Eye, EyeOff, Plus, Filter } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/Button'
import { format } from '@/lib/date-format'
import { cn } from '@/lib/utils'

type ChangeOrder = {
  id: string
  job_id: string | null
  cost_delta: number
  description: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  approved_at?: string
  created_by?: string
  approver_email?: string | null
}

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: 'Pending Review' },
  approved: { icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200', label: 'Rejected' }
}

export default function ChangeOrdersPage() {
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
              {order.job_id && (
                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  Job: {order.job_id.slice(0, 8)}...
                </span>
              )}
              <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium", color)}>
                <StatusIcon className="w-3.5 h-3.5" />
                {label}
              </div>
            </div>
            <div className="text-lg font-semibold text-gray-900 mb-1">
              Cost Change: ${order.cost_delta.toLocaleString()}
            </div>
            {order.description && (
              <div className="text-gray-600 mb-3">
                <span className="text-sm font-medium text-gray-500">Description: </span>
                {order.description}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <div>Requested: {formatDateTime(order.created_at)}</div>
            {order.approved_at && (
              <div>Decided: {formatDateTime(order.approved_at)}</div>
            )}
          </div>
          
          {showActions && order.status === 'pending' && (
            <div className="flex gap-2">
              <Button
                onClick={() => approve(order.id)}
                disabled={processing === order.id}
                variant="primary"
                size="sm"
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                {processing === order.id ? 'Approving...' : 'Approve'}
              </Button>
              <Button
                onClick={() => reject(order.id)}
                disabled={processing === order.id}
                variant="danger"
                size="sm"
                leftIcon={<XCircle className="w-4 h-4" />}
              >
                {processing === order.id ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <AppLayout title="Change Orders" description="Review and manage quantity change requests">
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-2" />
              <div className="h-8 bg-gray-200 rounded mb-2" />
              <div className="h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Change Orders"
      description="Review and manage quantity change requests"
      actions={
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            leftIcon={<Filter className="h-4 w-4" />}
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? 'Hide History' : 'Show History'}
          </Button>
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
            New Request
          </Button>
        </div>
      }
    >
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
    </AppLayout>
  )
}