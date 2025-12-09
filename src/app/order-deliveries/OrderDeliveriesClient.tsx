'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from '@/lib/date-format'
import { useCurrency } from '@/lib/CurrencyContext'
import { 
  Truck, 
  Eye, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Package,
  DollarSign,
  Users,
  TrendingUp,
  MoreHorizontal,
  XCircle
} from 'lucide-react'
import { useCompanyId } from '@/lib/useCompanyId'
import RecordDeliveryForm from '@/components/RecordDeliveryForm'

interface DeliveryItem {
  id: string
  product_name: string
  quantity: number
  unit: string
  unit_price: number
  total_price: number
}

interface Delivery {
  id: string
  order_id: string
  delivery_date: string
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled'
  driver_name?: string
  vehicle_number?: string
  notes?: string
  total_amount: number
  items: DeliveryItem[]
  created_at: string
  updated_at: string
}

interface DeliveriesResponse {
  success: boolean
  deliveries: Delivery[]
  pagination: {
    current_page: number
    per_page: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
  summary: {
    total_deliveries: number
    pending: number
    in_transit: number
    delivered: number
    cancelled: number
    total_value: number
  }
  error?: string
  user_info?: {
    role: string
    permissions: {
      canView: boolean
      canCreate: boolean
      canUpdate: boolean
      canDelete: boolean
    }
    company_id: string
  }
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_transit: 'bg-blue-100 text-blue-800 border-blue-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

const statusIcons = {
  pending: Clock,
  in_transit: Truck,
  delivered: CheckCircle,
  cancelled: AlertTriangle,
}

export default function OrderDeliveriesClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const companyId = useCompanyId()
  const { formatAmount } = useCurrency()

  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [summary, setSummary] = useState({
    total_deliveries: 0,
    pending: 0,
    in_transit: 0,
    delivered: 0,
    cancelled: 0,
    total_value: 0
  })
  const [userInfo, setUserInfo] = useState<{
    role: string
    permissions: {
      canView: boolean
      canCreate: boolean
      canUpdate: boolean
      canDelete: boolean
    }
    company_id: string
  } | null>(null)
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  })

  const page = parseInt(searchParams?.get('page') || '1')

  const fetchDeliveries = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      })

      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }

      const response = await fetch(`/api/order-deliveries?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch deliveries: ${response.statusText}`)
      }

      const data: DeliveriesResponse = await response.json()
      // Debug: surface what the API actually returned so we can compare items vs delivery_items
      try {
        const ds = (data as any)?.deliveries || []
        const lens = ds.map((d: any) => ({
          id: String(d?.id).slice(-6),
          items: Array.isArray(d?.items) ? d.items.length : -1,
          delivery_items: Array.isArray(d?.delivery_items) ? d.delivery_items.length : -1
        }))
        // eslint-disable-next-line no-console
        console.log('[OrderDeliveriesClient] API result summary:', {
          success: (data as any)?.success,
          total: (data as any)?.pagination?.total,
          deliveries: lens
        })
      } catch {}
      
      if (data.success) {
        setDeliveries(data.deliveries)
        setPagination(data.pagination)
        setSummary(data.summary)
        if (data.user_info) {
          setUserInfo(data.user_info)
        }
      } else {
        throw new Error(data.error || 'Failed to fetch deliveries')
      }
      
    } catch (err) {
      console.error('Error fetching deliveries:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch deliveries')
    } finally {
      setLoading(false)
    }
  }

  // Update delivery status (approve/reject)
  const updateDeliveryStatus = async (deliveryId: string, newStatus: 'delivered' | 'cancelled') => {
    try {
      const response = await fetch(`/api/order-deliveries/${deliveryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Refresh the deliveries list
        fetchDeliveries()
      } else {
        const error = await response.json()
        alert(`Failed to update delivery: ${error.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Error updating delivery:', err)
      alert('Failed to update delivery status')
    }
  }

  useEffect(() => {
    fetchDeliveries()
  }, [page, statusFilter, searchTerm])

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`/order-deliveries?${params}`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchDeliveries()
  }

  const StatCard = ({ title, value, icon: Icon, color = "blue", subtitle }: {
    title: string
    value: string | number
    icon: any
    color?: string
    subtitle?: string
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-6 w-48"></div>
            
            {/* Stats skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>

            {/* List skeleton */}
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm h-32"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <div>
                <h3 className="text-red-800 font-medium">Error Loading Deliveries</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
                <button 
                  onClick={fetchDeliveries}
                  className="mt-3 text-red-600 hover:text-red-500 text-sm font-medium"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="flex items-center text-gray-600 hover:text-gray-800 mr-4 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                Back to Dashboard
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Truck className="h-8 w-8 mr-3 text-blue-600" />
                  Delivery Management
                </h1>
                <p className="mt-1 text-gray-600">
                  Track and manage all delivery operations
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {userInfo && (
                <div className="bg-gray-50 px-4 py-2 rounded-lg border">
                  <span className="text-sm text-gray-600">Role: </span>
                  <span className="font-medium text-gray-900 capitalize">{userInfo.role}</span>
                </div>
              )}
              
              {userInfo?.permissions.canCreate ? (
                <button
                  onClick={() => setShowRecordForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg flex items-center transition-colors shadow-sm"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  New Delivery
                </button>
              ) : (
                <div className="bg-gray-100 text-gray-500 font-medium py-3 px-6 rounded-lg flex items-center cursor-not-allowed">
                  <Plus className="h-5 w-5 mr-2 opacity-50" />
                  New Delivery
                  <span className="ml-2 text-xs">(Read Only)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Total Deliveries"
            value={summary.total_deliveries}
            icon={Package}
            color="blue"
          />
          <StatCard
            title="Pending"
            value={summary.pending}
            icon={Clock}
            color="yellow"
          />
          <StatCard
            title="In Transit"
            value={summary.in_transit}
            icon={Truck}
            color="blue"
          />
          <StatCard
            title="Delivered"
            value={summary.delivered}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Total Value"
            value={formatAmount(summary.total_value)}
            icon={DollarSign}
            color="green"
            subtitle="Cumulative value"
          />
        </div>

        {/* Role-based permissions info */}
        {userInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">
                  Access Level: {userInfo.role.charAt(0).toUpperCase() + userInfo.role.slice(1)}
                </h4>
                <div className="text-sm text-blue-800">
                  <span className="font-medium">Permissions:</span>
                  <div className="mt-1 space-x-4">
                    <span className={userInfo.permissions.canView ? 'text-green-700' : 'text-gray-500'}>
                      {userInfo.permissions.canView ? '✓' : '✗'} View Deliveries
                    </span>
                    <span className={userInfo.permissions.canCreate ? 'text-green-700' : 'text-gray-500'}>
                      {userInfo.permissions.canCreate ? '✓' : '✗'} Create Deliveries
                    </span>
                    <span className={userInfo.permissions.canUpdate ? 'text-green-700' : 'text-gray-500'}>
                      {userInfo.permissions.canUpdate ? '✓' : '✗'} Update Deliveries
                    </span>
                    <span className={userInfo.permissions.canDelete ? 'text-green-700' : 'text-gray-500'}>
                      {userInfo.permissions.canDelete ? '✓' : '✗'} Delete Deliveries
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            <form onSubmit={handleSearch} className="flex-1 max-w-md">
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search deliveries, drivers, vehicles..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </form>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Record Delivery Form */}
        {showRecordForm && (
          <div className="mb-6">
            <RecordDeliveryForm
              onSuccess={(delivery) => {
                setShowRecordForm(false)
                fetchDeliveries()
              }}
              onCancel={() => setShowRecordForm(false)}
            />
          </div>
        )}

        {/* Deliveries List */}
        <div className="space-y-4">
          {deliveries.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Truck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                No deliveries found
              </h3>
              <p className="text-gray-600 mb-4">
                {statusFilter !== 'all' || searchTerm 
                  ? 'Try adjusting your filters or search terms.'
                  : 'Start by creating your first delivery record.'
                }
              </p>
              {(statusFilter !== 'all' || searchTerm) && (
                <button
                  onClick={() => {
                    setStatusFilter('all')
                    setSearchTerm('')
                  }}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            deliveries.map((delivery) => {
              const StatusIcon = statusIcons[delivery.status]
              // Fallback: if API didn't populate items, try raw delivery_items from the response
              const fallbackItems = (delivery as any)?.delivery_items || []
              const itemsToRender = (delivery.items && delivery.items.length > 0) ? delivery.items : fallbackItems
              // eslint-disable-next-line no-console
              try { console.log('[Render] del', delivery.id.slice(-6), 'len', itemsToRender.length, 'items=', delivery.items?.length, 'delivery_items=', (delivery as any)?.delivery_items?.length) } catch {}
              return (
                <div key={delivery.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 ${statusColors[delivery.status].split(' ')[0]} rounded-lg flex items-center justify-center`}>
                            <StatusIcon className={`h-6 w-6 ${statusColors[delivery.status].split(' ')[1]}`} />
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Delivery #{delivery.id.slice(-8).toUpperCase()}
                            </h3>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusColors[delivery.status]}`}>
                              {delivery.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Order ID:</span> #{delivery.order_id.slice(-8)}
                            </div>
                            {delivery.driver_name && (
                              <div>
                                <span className="font-medium">Driver:</span> {delivery.driver_name}
                              </div>
                            )}
                            {delivery.vehicle_number && (
                              <div>
                                <span className="font-medium">Vehicle:</span> {delivery.vehicle_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            {formatAmount(delivery.total_amount)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {itemsToRender.length} item{itemsToRender.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        
                        {/* Approve/Reject Buttons */}
                        {delivery.status === 'pending' && userInfo?.permissions?.canUpdate && (
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => updateDeliveryStatus(delivery.id, 'delivered')}
                              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1"
                              title="Approve Delivery"
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => updateDeliveryStatus(delivery.id, 'cancelled')}
                              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-1"
                              title="Reject Delivery"
                            >
                              <XCircle className="h-4 w-4" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}
                        
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Delivery Items:</h4>
                      <div className="space-y-2">
                        {itemsToRender.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <span className="font-medium text-gray-900">{item.product_name || item.description}</span>
                              <span className="text-gray-600 ml-2">
                                {Number(item.quantity)} {item.unit || 'pieces'} × ${Number(item.unit_price).toFixed(2)}
                              </span>
                            </div>
                            <div className="font-medium text-gray-900">
                              ${Number(item.total_price || (Number(item.quantity) * Number(item.unit_price))).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-6 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>{new Date(delivery.delivery_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{formatDistanceToNow(new Date(delivery.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                      
                      {delivery.notes && (
                        <div className="text-sm text-gray-600 italic">
                          "{delivery.notes}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="mt-8 flex items-center justify-between bg-white px-6 py-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
              {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of{' '}
              {pagination.total} results
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.current_page - 1)}
                disabled={!pagination.has_prev}
                className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      pageNum === pagination.current_page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                onClick={() => handlePageChange(pagination.current_page + 1)}
                disabled={!pagination.has_next}
                className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
