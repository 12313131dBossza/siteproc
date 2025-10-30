"use client"
import { useState, useEffect } from 'react'
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/Button"
import { SearchBar, FilterPanel, useFilters } from "@/components/ui"
import { StatCard } from "@/components/StatCard"
import { Package, Truck, MapPin, Clock, CheckCircle, CheckCircle2, AlertCircle, Search, Filter, Eye, Calendar, Lock, Edit, X, Upload } from 'lucide-react'
import { format } from '@/lib/date-format'
import { cn, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'
import RecordDeliveryForm from '@/components/RecordDeliveryForm'
import { DeliveryStatusTransitionModal } from '@/components/DeliveryStatusTransitionModal'
import { useToast } from '@/components/ui/Toast'
import { DeliveriesFilterPanel } from '@/components/DeliveriesFilterPanel'
import { SortControl, sortArray } from "@/components/SortControl"

interface Delivery {
  id: string
  order_id: string
  driver_name?: string
  vehicle_number?: string
  status: 'pending' | 'partial' | 'delivered'
  delivery_date: string
  notes?: string
  proof_url?: string
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
  partial: { 
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
  }
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { filters, setFilters } = useFilters()
  const [selectedTab, setSelectedTab] = useState<'pending' | 'partial' | 'delivered'>('pending')
  const [sortBy, setSortBy] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [updatingDelivery, setUpdatingDelivery] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [showNewDeliveryModal, setShowNewDeliveryModal] = useState(false)
  const [statusTransitionModal, setStatusTransitionModal] = useState<{ open: boolean; deliveryId?: string }>({ open: false })
  const [podUploadModal, setPodUploadModal] = useState<{ open: boolean; deliveryId?: string }>({ open: false })
  const [uploadingFile, setUploadingFile] = useState<string | null>(null)
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [showDeliveryDetailModal, setShowDeliveryDetailModal] = useState(false)

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
      
      console.log('Auth session data:', data)
      
      if (data.authenticated) {
        setAuthenticated(true)
        // Role is in data.user.profile.role
        const role = data.user?.profile?.role || null
        console.log('Setting user role:', role, 'from profile:', data.user?.profile)
        setUserRole(role)
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

  // Check if user has permission to change delivery status
  const canChangeStatus = () => {
    const hasPermission = userRole && ['admin', 'manager', 'owner', 'bookkeeper'].includes(userRole.toLowerCase())
    console.log('canChangeStatus check:', { userRole, hasPermission })
    return hasPermission
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
          console.log('Unauthorized (401) - session expired, refreshing page to trigger middleware redirect')
          // Session expired - the middleware will handle the redirect
          // Give it a moment to process
          await new Promise(r => setTimeout(r, 500))
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

  let filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = (delivery.driver_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (delivery.vehicle_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (delivery.order_id || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatusFilter = statusFilter === 'all' || delivery.status === statusFilter
    
    // Advanced filters
    const matchesAdvStatus = !filters.status || delivery.status === filters.status
    
    // Date range filter - safely handle null/undefined dates
    const matchesDateRange = (!filters.startDate || (delivery.delivery_date && new Date(delivery.delivery_date) >= new Date(filters.startDate))) &&
                             (!filters.endDate || (delivery.delivery_date && new Date(delivery.delivery_date) <= new Date(filters.endDate)))
    
    // Amount range filter - use total_amount from delivery
    const amount = delivery.total_amount || 0;
    const matchesAmountRange = (!filters.minAmount || amount >= Number(filters.minAmount)) &&
                               (!filters.maxAmount || amount <= Number(filters.maxAmount))
    
    // Has proof filter
    const matchesProof = !filters.hasProof || delivery.proof_url
    
    return matchesSearch && matchesStatusFilter && matchesAdvStatus && matchesDateRange && matchesAmountRange && matchesProof
  })

  // Apply sorting
  if (sortBy) {
    filteredDeliveries = sortArray(filteredDeliveries, sortBy, sortOrder, (item, key) => {
      if (key === 'delivery_date') return item.delivery_date ? new Date(item.delivery_date).getTime() : 0;
      if (key === 'amount') return item.total_amount || 0;
      if (key === 'driver_name') return item.driver_name || '';
      if (key === 'status') return item.status || '';
      return item[key as keyof Delivery] || '';
    });
  }

  const getTabDeliveries = (status: string) => {
    return deliveries.filter(d => d.status === status)
  }

  const stats = {
    pending: getTabDeliveries('pending').length,
    partial: getTabDeliveries('partial').length,
    delivered: getTabDeliveries('delivered').length,
    total: deliveries.length
  }

  const markAsInTransit = async (deliveryId: string) => {
    if (!canChangeStatus()) {
      toast.error('Permission denied', {
        description: 'Only Admin or Manager roles can change delivery status.',
        duration: 4000,
      })
      return
    }

    setUpdatingDelivery(deliveryId)
    try {
      const response = await fetch(`/api/order-deliveries/${deliveryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'partial'
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update delivery status')
      }

      // Update the local state
      setDeliveries(prev => prev.map(delivery => 
        delivery.id === deliveryId 
          ? { ...delivery, status: 'partial' as const }
          : delivery
      ))

      // Switch to In Transit (partial) tab
      setSelectedTab('partial')
      
      // Show success toast
      toast.success('Delivery marked as In Transit', {
        description: 'Status updated successfully.',
        duration: 3000,
      })
      
    } catch (error) {
      console.error('Error updating delivery status:', error)
      toast.error('Failed to update delivery status', {
        description: 'Please try again or contact support if the issue persists.',
        duration: 4000,
      })
    } finally {
      setUpdatingDelivery(null)
    }
  }

  const markAsDelivered = async (deliveryId: string, notes?: string) => {
    if (!canChangeStatus()) {
      toast.error('Permission denied', {
        description: 'Only Admin or Manager roles can change delivery status.',
        duration: 4000,
      })
      return
    }

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
      
      // Show success toast with order sync info
      if (result.orderSync) {
        toast.success('Delivery marked as delivered', {
          description: `Order status: ${result.orderSync.status.toUpperCase()} (${result.orderSync.percentComplete.toFixed(0)}% complete)`,
          duration: 4000,
        })
      } else {
        toast.success('Delivery marked as delivered', {
          description: 'Status updated successfully. Order and project actuals have been updated.',
          duration: 3000,
        })
      }
      
    } catch (error) {
      console.error('Error marking delivery as delivered:', error)
      toast.error('Failed to mark delivery as delivered', {
        description: 'Please try again or contact support if the issue persists.',
        duration: 4000,
      })
    } finally {
      setUpdatingDelivery(null)
    }
  }

  const handlePodUpload = async (deliveryId: string, file: File) => {
    setUploadingFile(deliveryId)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/deliveries/${deliveryId}/upload-proof`, {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const { proof_url } = await res.json()
      
      // Update the delivery with proof URL
      setDeliveries(prev => prev.map(d =>
        d.id === deliveryId ? { ...d, proof_url } : d
      ))

      toast.success('POD uploaded successfully', {
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
        duration: 3000,
      })
    } catch (err: any) {
      console.error('POD upload error:', err)
      toast.error('Failed to upload POD', {
        description: err.message || 'Please try again',
        duration: 4000,
      })
    } finally {
      setUploadingFile(null)
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
          {userRole && (
            <span className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg">
              Role: {userRole}
            </span>
          )}
          <Button variant="ghost" leftIcon={<Calendar className="h-4 w-4" />}>
            Schedule
          </Button>
          <Button 
            variant="primary" 
            leftIcon={<Package className="h-4 w-4" />}
            onClick={() => {
              console.log('New Delivery button clicked - opening modal...')
              setShowNewDeliveryModal(true)
            }}
          >
            New Delivery
          </Button>
        </div>
      }
    >
      <div className="p-6">
        {/* Stats Grid - Top Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Deliveries"
            value={stats.total.toString()}
            icon={Package}
            iconColor="text-gray-600"
            iconBgColor="bg-gray-50"
          />

          <StatCard
            title="Pending"
            value={stats.pending.toString()}
            icon={Clock}
            iconColor="text-yellow-600"
            iconBgColor="bg-yellow-50"
          />

          <StatCard
            title="In Transit"
            value={stats.partial.toString()}
            icon={Truck}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-50"
          />

          <StatCard
            title="Delivered"
            value={stats.delivered.toString()}
            icon={CheckCircle}
            iconColor="text-green-600"
            iconBgColor="bg-green-50"
          />
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search by driver, vehicle, or order ID..."
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial (In Transit)</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <DeliveriesFilterPanel
              onFiltersChange={(newFilters) => {
                setFilters(newFilters);
              }}
            />
            
            <SortControl
              options={[
                { label: 'Delivery Date', value: 'delivery_date' },
                { label: 'Amount', value: 'amount' },
                { label: 'Driver Name', value: 'driver_name' },
                { label: 'Status', value: 'status' },
              ]}
              onSortChange={(sortBy, sortOrder) => {
                setSortBy(sortBy);
                setSortOrder(sortOrder);
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'pending', label: 'Pending', count: stats.pending },
                { key: 'partial', label: 'In Transit', count: stats.partial },
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
                    console.log('Create First Delivery button clicked - opening modal...')
                    setShowNewDeliveryModal(true)
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
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
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
                        <div className="sm:text-right text-left w-full sm:w-auto flex-shrink-0">
                          <div className="text-lg font-bold text-gray-900 whitespace-nowrap sm:whitespace-normal">{formatCurrency(delivery.total_amount)}</div>
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
                            <div className="flex items-center gap-2">
                              <div className="text-green-600 font-medium">
                                ✓ Delivered - Record is locked from editing
                              </div>
                              {delivery.proof_url && (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                  </svg>
                                  POD Uploaded
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            leftIcon={<Eye className="h-4 w-4" />}
                            onClick={() => {
                              setSelectedDelivery(delivery)
                              setShowDeliveryDetailModal(true)
                            }}
                          >
                            View Details
                          </Button>
                          
                          {/* POD Upload button for delivered deliveries */}
                          {delivery.status === 'delivered' && canChangeStatus() && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              leftIcon={<Upload className="h-4 w-4" />}
                              onClick={() => setPodUploadModal({ open: true, deliveryId: delivery.id })}
                            >
                              {delivery.proof_url ? 'Change POD' : 'Upload POD'}
                            </Button>
                          )}
                          
                          {/* Status transition button - for pending or partial */}
                          {(delivery.status === 'pending' || delivery.status === 'partial') && canChangeStatus() && (
                            <Button 
                              variant="primary" 
                              size="sm" 
                              leftIcon={delivery.status === 'pending' ? <Truck className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                              onClick={() => setStatusTransitionModal({ open: true, deliveryId: delivery.id })}
                              disabled={updatingDelivery === delivery.id}
                            >
                              {delivery.status === 'pending' ? 'Change Status' : 'Complete'}
                            </Button>
                          )}
                          
                          {/* Lock indicator for delivered */}
                          {delivery.status === 'delivered' && (
                            <div className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500">
                              <Lock className="h-3.5 w-3.5" />
                              Locked
                            </div>
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

      {/* New Delivery Modal */}
      {showNewDeliveryModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">New Delivery</h2>
              <button
                onClick={() => setShowNewDeliveryModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <RecordDeliveryForm
                isModal={true}
                onSuccess={(delivery) => {
                  // Add the new delivery to the list
                  setDeliveries(prev => [delivery, ...prev])
                  // Close the modal
                  setShowNewDeliveryModal(false)
                  // Show success message
                  toast.success('Delivery created successfully!', {
                    description: 'The delivery has been added to the list.',
                    duration: 3000,
                  })
                  // Refresh the deliveries list to get updated data
                  fetchDeliveries()
                }}
                onCancel={() => setShowNewDeliveryModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Status Transition Modal */}
      {statusTransitionModal.deliveryId && (
        <DeliveryStatusTransitionModal
          isOpen={statusTransitionModal.open}
          onClose={() => setStatusTransitionModal({ open: false })}
          deliveryId={statusTransitionModal.deliveryId}
          currentStatus={deliveries.find(d => d.id === statusTransitionModal.deliveryId)?.status || 'pending'}
          items={(deliveries.find(d => d.id === statusTransitionModal.deliveryId)?.items || []).map(item => ({
            description: item.product_name,
            qty: item.quantity,
            unit: item.unit
          }))}
          onSuccess={(updated) => {
            // Update delivery in list
            setDeliveries(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d))
            // Show success
            toast.success(`Delivery status updated to ${updated.status}`, {
              description: 'Changes will sync to orders and projects.',
              duration: 3000,
            })
            // Refresh list to get latest data
            fetchDeliveries()
          }}
        />
      )}

      {/* POD Upload Modal */}
      {podUploadModal.open && podUploadModal.deliveryId && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Upload Proof of Delivery</h2>
              <button
                onClick={() => setPodUploadModal({ open: false })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900 mb-1">Drop file here or click to browse</p>
                <p className="text-xs text-gray-500 mb-3">PNG, JPG, GIF, or PDF (max 5MB)</p>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handlePodUpload(podUploadModal.deliveryId!, file)
                      setPodUploadModal({ open: false })
                    }
                  }}
                  disabled={uploadingFile === podUploadModal.deliveryId}
                  className="hidden"
                  id={`pod-file-input-${podUploadModal.deliveryId}`}
                />
                <label htmlFor={`pod-file-input-${podUploadModal.deliveryId}`}>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={uploadingFile === podUploadModal.deliveryId}
                    onClick={() => document.getElementById(`pod-file-input-${podUploadModal.deliveryId}`)?.click()}
                  >
                    {uploadingFile === podUploadModal.deliveryId ? 'Uploading...' : 'Select File'}
                  </Button>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Detail Modal */}
      {showDeliveryDetailModal && selectedDelivery && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" onClick={() => setShowDeliveryDetailModal(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl relative z-10" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Delivery Details</h2>
              <button
                onClick={() => setShowDeliveryDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border", statusConfig[selectedDelivery.status].color)}>
                  {statusConfig[selectedDelivery.status].label}
                </div>
                <span className="text-sm text-gray-500">
                  {format(new Date(selectedDelivery.delivery_date), 'MMM d, yyyy')}
                </span>
              </div>

              {/* Delivery Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</label>
                  <p className="mt-1 text-sm font-mono text-gray-900">{selectedDelivery.order_id || 'N/A'}</p>
                </div>
                {selectedDelivery.driver_name && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDelivery.driver_name}</p>
                  </div>
                )}
                {selectedDelivery.vehicle_number && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDelivery.vehicle_number}</p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Date</label>
                  <p className="mt-1 text-sm text-gray-900">{format(new Date(selectedDelivery.delivery_date), 'MMMM d, yyyy')}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-3">Items Delivered</label>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedDelivery.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.quantity} {item.unit}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">Total Amount:</td>
                        <td className="px-4 py-3 text-base font-bold text-gray-900 text-right">{formatCurrency(selectedDelivery.total_amount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {selectedDelivery.notes && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">Notes</label>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedDelivery.notes}</p>
                </div>
              )}

              {/* Proof of Delivery */}
              {selectedDelivery.proof_url && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">Proof of Delivery</label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <img 
                      src={selectedDelivery.proof_url} 
                      alt="Proof of Delivery"
                      className="w-full h-auto max-h-96 object-contain bg-gray-50"
                      onError={(e) => {
                        console.error('Failed to load POD image:', selectedDelivery.proof_url)
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg=='
                      }}
                    />
                  </div>
                  <a 
                    href={selectedDelivery.proof_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open in new tab
                  </a>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                  <div>
                    <span className="font-medium">Created:</span> {format(new Date(selectedDelivery.created_at), 'MMM d, yyyy h:mm a')}
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span> {format(new Date(selectedDelivery.updated_at), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
              <Button variant="ghost" onClick={() => setShowDeliveryDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}