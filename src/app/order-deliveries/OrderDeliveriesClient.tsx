'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { 
  Truck, 
  Eye, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { useCompanyId } from '@/lib/useCompanyId'

interface Delivery {
  id: string
  order_id: string
  delivered_qty: number
  delivered_at: string
  note?: string
  proof_url?: string
  created_at: string
  orders: {
    id: string
    status: string
    supplier_name: string
    total_amount: number
  }
  products: {
    name: string
    sku: string
    unit: string
  }
  profiles: {
    full_name: string
  }
}

interface DeliveriesResponse {
  deliveries: Delivery[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const statusColors = {
  approved: 'bg-blue-100 text-blue-800',
  partially_delivered: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function OrderDeliveriesClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const companyId = useCompanyId()

  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  })

  const orderId = searchParams.get('order_id')
  const page = parseInt(searchParams.get('page') || '1')

  const fetchDeliveries = async () => {
    if (!companyId) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      })

      if (orderId) {
        params.append('order_id', orderId)
      }

      const response = await fetch(`/api/order-deliveries?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch deliveries: ${response.statusText}`)
      }

      const data: DeliveriesResponse = await response.json()
      setDeliveries(data.deliveries)
      setPagination(data.pagination)
    } catch (err) {
      console.error('Error fetching deliveries:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch deliveries')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeliveries()
  }, [companyId, page, orderId])

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`/order-deliveries?${params}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-6 w-48"></div>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow h-24"></div>
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <div>
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
                <button 
                  onClick={fetchDeliveries}
                  className="mt-2 text-red-600 hover:text-red-500 text-sm font-medium"
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
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                <Truck className="h-6 w-6 mr-2" />
                Order Deliveries
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {orderId ? `Deliveries for Order #${orderId.slice(-8)}` : 'View all delivery records'}
              </p>
            </div>

            {orderId && (
              <Link
                href="/order-deliveries"
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                View All Deliveries
              </Link>
            )}
          </div>
        </div>

        {/* Stats */}
        {!orderId && (
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">
                  {pagination.total}
                </div>
                <div className="text-sm text-gray-600">
                  Total delivery records
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deliveries List */}
        <div className="space-y-4">
          {deliveries.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No deliveries found
              </h3>
              <p className="text-gray-600">
                {orderId 
                  ? 'No deliveries have been recorded for this order yet.'
                  : 'No delivery records found. Deliveries will appear here once orders are fulfilled.'
                }
              </p>
            </div>
          ) : (
            deliveries.map((delivery) => (
              <div key={delivery.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Truck className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {delivery.products.name}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusColors[delivery.orders.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
                          }`}>
                            {delivery.orders.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Order:</span> #{delivery.order_id.slice(-8)}
                          </div>
                          <div>
                            <span className="font-medium">Supplier:</span> {delivery.orders.supplier_name}
                          </div>
                          <div>
                            <span className="font-medium">SKU:</span> {delivery.products.sku}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/orders/${delivery.order_id}`}
                      className="text-blue-600 hover:text-blue-500"
                    >
                      <Eye className="h-5 w-5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-gray-600">Quantity:</span>
                      <span className="ml-1 font-medium">
                        {delivery.delivered_qty} {delivery.products.unit}
                      </span>
                    </div>

                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">Delivered:</span>
                      <span className="ml-1 font-medium">
                        {new Date(delivery.delivered_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">Recorded:</span>
                      <span className="ml-1 font-medium">
                        {formatDistanceToNow(new Date(delivery.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    <div className="text-sm">
                      <span className="text-gray-600">By:</span>
                      <span className="ml-1 font-medium">{delivery.profiles.full_name}</span>
                    </div>
                  </div>

                  {delivery.note && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Note:</span> {delivery.note}
                      </p>
                    </div>
                  )}

                  {delivery.proof_url && (
                    <div className="mt-3">
                      <a
                        href={delivery.proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                      >
                        View Delivery Proof →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} results
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      pageNum === pagination.page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
