"use client"
import { useState, useEffect } from 'react'
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/Button"
import { Package, Truck, MapPin, Clock, CheckCircle, CheckCircle2, AlertCircle, Search, Filter, Eye, Calendar, Lock } from 'lucide-react'
import { format } from 'date-fns'
import { cn, formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface Delivery {
  id: string
  order_id: string
  driver_name?: string
  vehicle_number?: string
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled'
  delivery_date: string
  notes?: string
  total_amount: number
  items: Array<{
    id: string
    product_name: string
    quantity: number
    unit: string
    unit_price: number
    total_price: number
  }>
  created_at: string
  updated_at: string
}

const statusConfig = {
  pending: { 
    icon: Clock, 
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200', 
    label: 'Pending',
    bgColor: 'bg-yellow-50'
  },
  in_transit: { 
    icon: Truck, 
    color: 'text-blue-600 bg-blue-50 border-blue-200', 
    label: 'In Transit',
    bgColor: 'bg-blue-50'
  },
  delivered: { 
    icon: CheckCircle, 
    color: 'text-green-600 bg-green-50 border-green-200', 
    label: 'Delivered',
    bgColor: 'bg-green-50'
  },
  cancelled: { 
    icon: AlertCircle, 
    color: 'text-red-600 bg-red-50 border-red-200', 
    label: 'Cancelled',
    bgColor: 'bg-red-50'
  }
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedTab, setSelectedTab] = useState<'pending' | 'in_transit' | 'delivered'>('pending')
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [updatingDelivery, setUpdatingDelivery] = useState<string | null>(null)

  // Check authentication first
  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (authenticated === true) {
      fetchDeliveries()
    } else if (authenticated === false) {
      // User not authenticated, but still show the page with empty state
      // The New Delivery button will handle authentication when clicked
      setLoading(false)
    }
  }, [authenticated])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session')
      const data = await response.json()
      
      if (data.authenticated) {
        setAuthenticated(true)
      } else {
        console.log('Not authenticated, but allowing page to load')
        // Don't redirect immediately - let user try to use New Delivery button
        // The form itself will handle authentication
        setAuthenticated(false)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      // Don't redirect - let the page load and handle auth in the form
      setAuthenticated(false)
    }
  }

  const fetchDeliveries = async () => {
    try {
      console.log('Fetching deliveries...')
      // Fetch deliveries from API
      const response = await fetch('/api/order-deliveries', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status)

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Unauthorized - redirecting to login')
          window.location.href = '/login?redirectTo=' + encodeURIComponent(window.location.pathname)
          return
        }
        throw new Error(`Failed to fetch deliveries: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched deliveries data:', data)
      const fetchedDeliveries: Delivery[] = data.deliveries || [];
      
      setDeliveries(fetchedDeliveries);
      console.log('Set deliveries:', fetchedDeliveries.length, 'items')
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
      
      // Don't block the UI - just show empty state but allow New Delivery button to work
      setDeliveries([]);
      
      // Check if it's a network error vs API error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Network error - API may be down')
        // Still allow the page to load so the New Delivery button works
      }
    } finally {
      setLoading(false);
    }
  }

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = (delivery.driver_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (delivery.vehicle_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.order_id.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (statusFilter === 'all') return matchesSearch
    return matchesSearch && delivery.status === statusFilter
  })

  const getTabDeliveries = (status: string) => {
    return deliveries.filter(d => d.status === status)
  }

  const stats = {
    pending: getTabDeliveries('pending').length,
    in_transit: getTabDeliveries('in_transit').length,
    delivered: getTabDeliveries('delivered').length,
    total: deliveries.length
  }

  const markAsDelivered = async (deliveryId: string, notes?: string) => {
    setUpdatingDelivery(deliveryId)
    try {
      const response = await fetch(`/api/order-deliveries/${deliveryId}/mark-delivered`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: notes,
          delivered_at: new Date().toISOString()
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to mark delivery as delivered')
      }

      const result = await response.json()
      
      // Update the local state
      setDeliveries(prev => prev.map(delivery => 
        delivery.id === deliveryId 
          ? { ...delivery, status: 'delivered' as const, notes: notes || delivery.notes }
          : delivery
      ))

      // Switch to delivered tab to show the updated delivery
      setSelectedTab('delivered')
      
      // Show success message
      alert('✓ Delivery marked as delivered successfully!\n\n' +
            'The following updates have been completed:\n' +
            '• Delivery status changed to Delivered\n' +
            '• Order status updated (if applicable)\n' +
            '• Project actuals updated (if linked)\n' +
            '• Record locked from further editing')
      
    } catch (error) {
      console.error('Error marking delivery as delivered:', error)
      alert('❌ Failed to mark delivery as delivered. Please try again.')
    } finally {
      setUpdatingDelivery(null)
    }
  }

  if (authenticated === null) {
    return (
      <AppLayout title="Deliveries" description="Track and manage delivery status">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loading && authenticated === true) {
    return (
      <AppLayout title="Deliveries" description="Track and manage delivery status">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-2" />
                <div className="h-8 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Deliveries"
      description="Track and manage delivery status"
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" leftIcon={<Calendar className="h-4 w-4" />}>
            Schedule
          </Button>
          <Button 
            variant="primary" 
            leftIcon={<Package className="h-4 w-4" />}
            onClick={() => {
              console.log('New Delivery button clicked - navigating...')
              window.location.href = '/deliveries/new'
            }}
          >
            New Delivery
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
            <p className="text-sm text-gray-500">Total Deliveries</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.pending}</h3>
            <p className="text-sm text-gray-500">Pending</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.in_transit}</h3>
            <p className="text-sm text-gray-500">In Transit</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.delivered}</h3>
            <p className="text-sm text-gray-500">Delivered</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search deliveries by driver, vehicle number, or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'pending', label: 'Pending', count: stats.pending },
                { key: 'in_transit', label: 'In Transit', count: stats.in_transit },
                { key: 'delivered', label: 'Delivered', count: stats.delivered }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedTab(tab.key as any)}
                  className={cn(
                    "py-4 px-2 border-b-2 font-medium text-sm transition-colors",
                    selectedTab === tab.key
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>

          {/* Delivery List */}
          <div className="p-6">
            {filteredDeliveries.filter(d => d.status === selectedTab).length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No {selectedTab.replace('_', ' ')} deliveries</h3>
                <p className="text-gray-500 mb-4">
                  {authenticated === false 
                    ? "Please log in to view deliveries or create new ones."
                    : "Deliveries will appear here when they match this status."
                  }
                </p>
                <Button 
                  variant="primary" 
                  leftIcon={<Package className="h-4 w-4" />}
                  onClick={() => {
                    console.log('Create First Delivery button clicked - navigating...')
                    window.location.href = '/deliveries/new'
                  }}
                >
                  Create Your First Delivery
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDeliveries.filter(d => d.status === selectedTab).map((delivery) => {
                  const config = statusConfig[delivery.status]
                  const StatusIcon = config.icon
                  
                  return (
                    <div key={delivery.id} className={cn(
                      "border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow",
                      delivery.status === 'delivered' && "bg-green-50 border-green-200"
                    )}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {delivery.order_id}
                            </span>
                            <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium", config.color)}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {config.label}
                            </div>
                            {delivery.status === 'delivered' && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                                <Lock className="w-3 h-3" />
                                Locked
                              </div>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {delivery.driver_name ? `Driver: ${delivery.driver_name}` : 'Delivery'}
                          </h3>
                          {delivery.vehicle_number && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <Truck className="h-4 w-4" />
                              <span>Vehicle: {delivery.vehicle_number}</span>
                            </div>
                          )}
                          {delivery.notes && (
                            <div className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">Notes:</span> {delivery.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{formatCurrency(delivery.total_amount)}</div>
                          <div className="text-sm text-gray-500">{delivery.items?.length || 0} items</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-500">
                          <div>Order: {delivery.order_id}</div>
                          <div>
                            Delivery Date: {format(new Date(delivery.delivery_date), 'MMM dd, yyyy')}
                          </div>
                          {delivery.status === 'delivered' && (
                            <div className="text-green-600 font-medium">
                              ✓ Delivered - Record is locked from editing
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" leftIcon={<Eye className="h-4 w-4" />}>
                            View Details
                          </Button>
                          <Button variant="ghost" size="sm" leftIcon={<MapPin className="h-4 w-4" />}>
                            Track
                          </Button>
                          {(delivery.status === 'pending' || delivery.status === 'in_transit') && (
                            <Button 
                              variant="primary" 
                              size="sm" 
                              leftIcon={<CheckCircle2 className="h-4 w-4" />}
                              onClick={() => {
                                const notes = prompt('Add any delivery notes (optional):')
                                if (notes !== null) { // User didn't cancel
                                  markAsDelivered(delivery.id, notes || undefined)
                                }
                              }}
                              disabled={updatingDelivery === delivery.id}
                            >
                              {updatingDelivery === delivery.id ? 'Updating...' : 'Mark as Delivered'}
                            </Button>
                          )}
                        </div>
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