"use client"
import { useState, useEffect } from 'react'
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/Button"
import { Package, Truck, MapPin, Clock, CheckCircle, AlertCircle, Search, Filter, Eye, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { cn, formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface Delivery {
  id: string
  order_id: string
  recipient_name: string
  address: string
  city: string
  status: 'pending' | 'in_transit' | 'delivered' | 'failed'
  scheduled_date: string
  delivered_date?: string
  driver_name?: string
  tracking_number: string
  items_count: number
  total_value: number
  notes?: string
  created_at: string
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
  failed: { 
    icon: AlertCircle, 
    color: 'text-red-600 bg-red-50 border-red-200', 
    label: 'Failed',
    bgColor: 'bg-red-50'
  }
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedTab, setSelectedTab] = useState<'pending' | 'in_transit' | 'delivered'>('pending')

  useEffect(() => {
    fetchDeliveries()
  }, [])

  const fetchDeliveries = async () => {
    try {
      // Fetch deliveries from API
      const response = await fetch('/api/deliveries', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch deliveries: ${response.status}`);
      }

      const data = await response.json();
      const fetchedDeliveries: Delivery[] = data.deliveries || [];
      
      setDeliveries(fetchedDeliveries);
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
      
      // Fallback to empty state - no mock data
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = delivery.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  if (loading) {
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
          <Link href="/deliveries/new">
            <Button variant="primary" leftIcon={<Package className="h-4 w-4" />}>
              New Delivery
            </Button>
          </Link>
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
                    placeholder="Search deliveries by recipient, tracking number, or order ID..."
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
                  <option value="failed">Failed</option>
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
                <p className="text-gray-500">Deliveries will appear here when they match this status.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDeliveries.filter(d => d.status === selectedTab).map((delivery) => {
                  const config = statusConfig[delivery.status]
                  const StatusIcon = config.icon
                  
                  return (
                    <div key={delivery.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {delivery.tracking_number}
                            </span>
                            <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium", config.color)}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {config.label}
                            </div>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{delivery.recipient_name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <MapPin className="h-4 w-4" />
                            <span>{delivery.address}, {delivery.city}</span>
                          </div>
                          {delivery.driver_name && (
                            <div className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">Driver:</span> {delivery.driver_name}
                            </div>
                          )}
                          {delivery.notes && (
                            <div className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">Notes:</span> {delivery.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{formatCurrency(delivery.total_value)}</div>
                          <div className="text-sm text-gray-500">{delivery.items_count} items</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-500">
                          <div>Order: {delivery.order_id}</div>
                          <div>
                            Scheduled: {format(new Date(delivery.scheduled_date), 'MMM dd, yyyy')}
                          </div>
                          {delivery.delivered_date && (
                            <div>Delivered: {format(new Date(delivery.delivered_date), 'MMM dd, yyyy')}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" leftIcon={<Eye className="h-4 w-4" />}>
                            View Details
                          </Button>
                          <Button variant="ghost" size="sm" leftIcon={<MapPin className="h-4 w-4" />}>
                            Track
                          </Button>
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