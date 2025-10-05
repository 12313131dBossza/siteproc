"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/Button'
import { 
  Package, 
  Plus, 
  CheckCircle, 
  Clock, 
  Truck,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { getStatusLabel, getStatusBadgeClasses } from '@/lib/orderSync'

interface OrderItem {
  id: string
  product_name: string
  quantity: number
  quantity_delivered: number
  unit: string
  unit_price: number
  total_price: number
}

interface PurchaseOrder {
  id: string
  order_number: string
  supplier: string
  status: 'pending' | 'approved' | 'rejected'
  delivery_status: 'pending' | 'partial' | 'completed'
  order_date: string
  expected_delivery: string
  total_amount: number
  quantity_delivered: number
  notes?: string
  po_number?: string
  created_at: string
  items?: OrderItem[]
}

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'pending' | 'partial' | 'completed'>('all')
  const [selectedTab, setSelectedTab] = useState<'pending' | 'approved' | 'rejected'>('approved')
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [syncingOrder, setSyncingOrder] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session')
      const data = await response.json()
      
      if (data.authenticated) {
        setAuthenticated(true)
      } else {
        setAuthenticated(false)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setAuthenticated(false)
    }
  }

  useEffect(() => {
    if (authenticated === true) {
      fetchOrders()
    } else if (authenticated === false) {
      setLoading(false)
    }
  }, [authenticated])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/purchase-orders')
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }

      const data = await response.json()
      setOrders(data.orders || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to load orders')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const syncOrderStatus = async (orderId: string) => {
    try {
      setSyncingOrder(orderId)
      const response = await fetch(`/api/orders/${orderId}/sync`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to sync order')
      }

      const data = await response.json()
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              delivery_status: data.status,
              quantity_delivered: data.totalDelivered
            }
          : order
      ))

      toast.success('Order status synced', {
        description: `Status: ${getStatusLabel(data.status)} (${data.percentComplete.toFixed(0)}% complete)`,
        duration: 4000
      })
    } catch (error) {
      console.error('Error syncing order:', error)
      toast.error('Failed to sync order status')
    } finally {
      setSyncingOrder(null)
    }
  }

  // Calculate statistics
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    approved: orders.filter(o => o.status === 'approved').length,
    rejected: orders.filter(o => o.status === 'rejected').length,
    deliveryPending: orders.filter(o => o.delivery_status === 'pending').length,
    deliveryPartial: orders.filter(o => o.delivery_status === 'partial').length,
    deliveryCompleted: orders.filter(o => o.delivery_status === 'completed').length
  }

  const getDeliveryProgress = (order: PurchaseOrder) => {
    if (!order.items || order.items.length === 0) return 0
    
    const totalOrdered = order.items.reduce((sum, item) => sum + item.quantity, 0)
    const totalDelivered = order.quantity_delivered || 0
    
    return totalOrdered > 0 ? (totalDelivered / totalOrdered) * 100 : 0
  }

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.po_number || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDelivery = deliveryFilter === 'all' || order.delivery_status === deliveryFilter
    const matchesTab = order.status === selectedTab

    return matchesSearch && matchesDelivery && matchesTab
  })

  if (authenticated === null || loading) {
    return (
      <AppLayout title="Purchase Orders" description="Manage purchase orders and track deliveries">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Purchase Orders"
      description="Manage purchase orders and track deliveries"
      actions={
        <div className="flex gap-2">
          <Button
            variant="ghost"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={fetchOrders}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => router.push('/purchase-orders/new')}
          >
            New Order
          </Button>
        </div>
      }
    >
      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <Package className="h-6 w-6 text-gray-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.total}</h3>
            <p className="text-sm text-gray-500">Total Orders</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.deliveryPending}</h3>
            <p className="text-sm text-gray-500">Pending Delivery</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.deliveryPartial}</h3>
            <p className="text-sm text-gray-500">Partially Delivered</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.deliveryCompleted}</h3>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search orders by number, supplier, or PO..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <select
                value={deliveryFilter}
                onChange={(e) => setDeliveryFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Delivery Status</option>
                <option value="pending">Pending</option>
                <option value="partial">Partially Delivered</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setSelectedTab('pending')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  selectedTab === 'pending'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending ({stats.pending})
              </button>
              <button
                onClick={() => setSelectedTab('approved')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  selectedTab === 'approved'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Approved ({stats.approved})
              </button>
              <button
                onClick={() => setSelectedTab('rejected')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  selectedTab === 'rejected'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Rejected ({stats.rejected})
              </button>
            </nav>
          </div>

          {/* Orders List */}
          <div className="p-6">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || deliveryFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first order to get started'}
                </p>
                {!searchTerm && deliveryFilter === 'all' && (
                  <Button
                    variant="primary"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => router.push('/purchase-orders/new')}
                  >
                    Create Order
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const progress = getDeliveryProgress(order)
                  const totalOrdered = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
                  const totalDelivered = order.quantity_delivered || 0
                  const remaining = totalOrdered - totalDelivered

                  return (
                    <div
                      key={order.id}
                      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {order.order_number}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClasses(order.delivery_status)}`}>
                              {getStatusLabel(order.delivery_status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Supplier: <span className="font-medium">{order.supplier}</span>
                          </p>
                          {order.po_number && (
                            <p className="text-sm text-gray-600">
                              PO: <span className="font-medium">{order.po_number}</span>
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(order.total_amount)}
                          </p>
                          <p className="text-sm text-gray-500">Total Amount</p>
                        </div>
                      </div>

                      {/* Delivery Progress */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Delivery Progress</span>
                          <span className="font-medium">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              progress === 100 ? 'bg-green-500' : 
                              progress > 0 ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Quantity Details */}
                      <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Ordered</p>
                          <p className="text-lg font-bold text-gray-900">{totalOrdered}</p>
                          <p className="text-xs text-gray-500">items</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Delivered</p>
                          <p className="text-lg font-bold text-green-600">{totalDelivered}</p>
                          <p className="text-xs text-gray-500">items</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Remaining</p>
                          <p className="text-lg font-bold text-orange-600">{remaining}</p>
                          <p className="text-xs text-gray-500">items</p>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="flex gap-4 text-sm text-gray-600 mb-4">
                        <div>
                          <span className="text-gray-500">Order Date:</span>{' '}
                          <span className="font-medium">
                            {format(new Date(order.order_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Expected:</span>{' '}
                          <span className="font-medium">
                            {format(new Date(order.expected_delivery), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Eye className="h-4 w-4" />}
                          onClick={() => router.push(`/purchase-orders/${order.id}`)}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<RefreshCw className={`h-4 w-4 ${syncingOrder === order.id ? 'animate-spin' : ''}`} />}
                          onClick={() => syncOrderStatus(order.id)}
                          disabled={syncingOrder === order.id}
                        >
                          {syncingOrder === order.id ? 'Syncing...' : 'Sync Status'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Truck className="h-4 w-4" />}
                          onClick={() => router.push(`/deliveries?order=${order.order_number}`)}
                        >
                          View Deliveries
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
