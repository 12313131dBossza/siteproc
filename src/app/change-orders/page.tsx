"use client"
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, AlertCircle, Eye, EyeOff, Plus, Filter, Trash2 } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { PlanGate } from '@/components/PlanGate'
import { Button } from '@/components/ui/Button'
import { format } from '@/lib/date-format'
import { cn } from '@/lib/utils'
import { useCurrency } from '@/lib/CurrencyContext'

type ChangeOrder = {
  id: string
  job_id: string | null
  order_id: string | null
  cost_delta: number
  description: string | null
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  approved_at?: string
  created_by?: string
  approver_email?: string | null
  purchase_orders?: {
    product_name: string | null
    vendor: string | null
    amount: number | null
  } | null
}

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: 'Pending Review' },
  approved: { icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200', label: 'Rejected' }
}

type Project = {
  id: string
  name: string
}

type Order = {
  id: string
  product_name: string | null
  vendor: string | null
  amount: number | null
  status: string
}

export default function ChangeOrdersPage() {
  return (
    <PlanGate minPlan="pro" featureName="Change Orders">
      <ChangeOrdersContent />
    </PlanGate>
  );
}

function ChangeOrdersContent() {
  const { formatAmount } = useCurrency()
  const [pending, setPending] = useState<ChangeOrder[]>([])
  const [history, setHistory] = useState<ChangeOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [newForm, setNewForm] = useState({
    project_id: '',
    order_id: '',
    cost_delta: '',
    description: ''
  })

  async function loadPending() {
    const res = await fetch(`/api/change-orders?include_order=true`)
    const json = await res.json()
    if (res.ok) setPending(json.data || [])
  }

  async function loadHistory() {
    const res = await fetch(`/api/change-orders?include_order=true`)
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

  async function loadProjects() {
    const res = await fetch('/api/projects')
    if (res.ok) {
      const json = await res.json()
      // API returns { success: true, data: [...] }
      setProjects(json.data || [])
    } else {
      console.error('Failed to load projects:', await res.text())
    }
  }

  async function loadOrders(projectId: string) {
    if (!projectId) {
      setOrders([])
      return
    }
    setLoadingOrders(true)
    const res = await fetch(`/api/orders?project_id=${projectId}`)
    if (res.ok) {
      const json = await res.json()
      // API returns { data: [...] }
      setOrders(json.data || [])
    } else {
      console.error('Failed to load orders:', await res.text())
      setOrders([])
    }
    setLoadingOrders(false)
  }

  useEffect(() => {
    if (showNewModal) {
      loadProjects()
    }
  }, [showNewModal])

  useEffect(() => {
    if (newForm.project_id) {
      loadOrders(newForm.project_id)
    } else {
      setOrders([])
    }
  }, [newForm.project_id])

  async function approve(id: string) {
    // Store for rollback
    const previousCO = pending.find(co => co.id === id);
    
    // Optimistically update - move to approved and remove from pending
    setPending(prev => prev.filter(co => co.id !== id));
    if (previousCO) {
      setHistory(prev => [{ ...previousCO, status: 'approved' }, ...prev]);
    }
    
    try {
      const res = await fetch(`/api/change-orders/${id}/approve`, { method: 'POST' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Unknown error')
      }
    } catch (err: any) {
      // Rollback on error
      if (previousCO) {
        setPending(prev => [...prev, previousCO]);
        setHistory(prev => prev.filter(co => co.id !== id));
      }
      alert(`Failed to approve: ${err.message}`)
    }
  }

  async function reject(id: string) {
    // Store for rollback
    const previousCO = pending.find(co => co.id === id);
    
    // Optimistically update - move to rejected and remove from pending
    setPending(prev => prev.filter(co => co.id !== id));
    if (previousCO) {
      setHistory(prev => [{ ...previousCO, status: 'rejected' }, ...prev]);
    }
    
    try {
      const res = await fetch(`/api/change-orders/${id}/reject`, { method: 'POST' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Unknown error')
      }
    } catch (err: any) {
      // Rollback on error
      if (previousCO) {
        setPending(prev => [...prev, previousCO]);
        setHistory(prev => prev.filter(co => co.id !== id));
      }
      alert(`Failed to reject: ${err.message}`)
    }
  }

  async function deleteChangeOrder(id: string) {
    if (!confirm('Are you sure you want to delete this change order?')) {
      return
    }
    
    // Store for rollback
    const deletedFromPending = pending.find(co => co.id === id);
    const deletedFromHistory = history.find(co => co.id === id);
    
    // Optimistically remove from both lists
    setPending(prev => prev.filter(co => co.id !== id));
    setHistory(prev => prev.filter(co => co.id !== id));
    
    try {
      const res = await fetch(`/api/change-orders/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Unknown error')
      }
    } catch (err: any) {
      // Rollback on error
      if (deletedFromPending) {
        setPending(prev => [...prev, deletedFromPending]);
      }
      if (deletedFromHistory) {
        setHistory(prev => [...prev, deletedFromHistory]);
      }
      alert(`Failed to delete: ${err.message}`)
    }
  }

  async function createChangeOrder(e: React.FormEvent) {
    e.preventDefault()
    setProcessing('new')
    
    try {
      const res = await fetch('/api/change-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: newForm.order_id,
          proposed_qty: parseFloat(newForm.cost_delta),
          reason: newForm.description
        })
      })
      
      if (res.ok) {
        setShowNewModal(false)
        setNewForm({ project_id: '', order_id: '', cost_delta: '', description: '' })
        setOrders([])
        await load()
      } else {
        const error = await res.json()
        alert(`Failed to create: ${error.error || 'Unknown error'}`)
      }
    } catch (err) {
      alert('Failed to create change order')
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
              {order.purchase_orders && (
                <span className="font-medium text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">
                  {order.purchase_orders.product_name || order.purchase_orders.vendor || 'Order'}
                </span>
              )}
              <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium", color)}>
                <StatusIcon className="w-3.5 h-3.5" />
                {label}
              </div>
            </div>
            {order.purchase_orders && (
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Original Cost:</span> {formatAmount(order.purchase_orders.amount || 0)}
                {order.status === 'approved' && (
                  <span className="ml-2">
                    → <span className="font-medium text-green-600">{formatAmount((order.purchase_orders.amount || 0) + order.cost_delta)}</span>
                  </span>
                )}
              </div>
            )}
            <div className="text-lg font-semibold text-gray-900 mb-1">
              Cost Change: <span className={order.cost_delta >= 0 ? 'text-red-600' : 'text-green-600'}>
                {order.cost_delta >= 0 ? '+' : ''}{formatAmount(order.cost_delta)}
              </span>
            </div>
            {(order.description || order.reason) && (
              <div className="text-gray-600 mb-3">
                <span className="text-sm font-medium text-gray-500">Reason: </span>
                {order.description || order.reason}
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
          
          <div className="flex gap-2">
            {showActions && order.status === 'pending' && (
              <>
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
              </>
            )}
            <Button
              onClick={() => deleteChangeOrder(order.id)}
              disabled={processing === order.id}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
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
          <Button 
            variant="primary" 
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowNewModal(true)}
          >
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

      {/* New Request Modal */}
      {showNewModal && (
        <>
          {/* Backdrop with opacity and animation */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            style={{
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={() => {
              setShowNewModal(false)
              setNewForm({ project_id: '', order_id: '', cost_delta: '', description: '' })
              setOrders([])
            }}
          />
          
          {/* Modal with slide up animation */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div 
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl pointer-events-auto"
              style={{
                animation: 'slideUp 0.3s ease-out'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-6">New Change Order Request</h3>
            
            <form onSubmit={createChangeOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project
                </label>
                <select
                  value={newForm.project_id}
                  onChange={(e) => setNewForm({...newForm, project_id: e.target.value, order_id: ''})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order
                </label>
                <select
                  value={newForm.order_id}
                  onChange={(e) => setNewForm({...newForm, order_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  disabled={!newForm.project_id || loadingOrders}
                  required
                >
                  <option value="">
                    {!newForm.project_id ? 'Select a project first' : loadingOrders ? 'Loading orders...' : 'Select an order'}
                  </option>
                  {orders.map(order => (
                    <option key={order.id} value={order.id}>
                      {order.product_name || order.vendor || 'Order'} - {formatAmount(order.amount || 0)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Change ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newForm.cost_delta}
                  onChange={(e) => setNewForm({...newForm, cost_delta: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newForm.description}
                  onChange={(e) => setNewForm({...newForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Describe the reason for this change"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowNewModal(false)
                    setNewForm({ project_id: '', order_id: '', cost_delta: '', description: '' })
                    setOrders([])
                  }}
                  disabled={processing === 'new'}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={processing === 'new'}
                >
                  {processing === 'new' ? 'Creating...' : 'Create Request'}
                </Button>
              </div>
            </form>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  )
}