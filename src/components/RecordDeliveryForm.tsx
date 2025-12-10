'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Upload, X, Trash2, Truck, Package, Calendar, FileText, UserPlus } from 'lucide-react'
import { sbBrowser } from '@/lib/supabase-browser'
import { Input, Select, TextArea } from '@/components/ui'
import { FormModal } from '@/components/ui/FormModal'
import { useCurrency } from '@/lib/CurrencyContext'

interface DeliveryItem {
  product_name: string
  quantity: number
  unit: string
  unit_price: number
}

interface Project {
  id: string
  name: string
}

interface Supplier {
  id: string
  email: string
  full_name: string
}

interface RecordDeliveryFormProps {
  onSuccess?: (delivery: any) => void
  onCancel?: () => void
  initialData?: any
  deliveryId?: string
  isModal?: boolean
  preselectedOrderId?: string // UUID of the purchase order
}

export default function RecordDeliveryForm({ onSuccess, onCancel, initialData, deliveryId, isModal = false, preselectedOrderId }: RecordDeliveryFormProps) {
  const { formatAmount } = useCurrency()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  
  const [formData, setFormData] = useState({
    order_uuid: preselectedOrderId || '',
    order_id: '',
    driver_name: '',
    vehicle_number: '',
    delivery_date: new Date().toISOString().split('T')[0],
    status: 'pending' as 'pending' | 'partial' | 'delivered',
    notes: '',
    projectId: '',
    supplierId: '',
    items: [
      {
        product_name: '',
        quantity: 1,
        unit: 'pieces',
        unit_price: 0
      }
    ] as DeliveryItem[]
  })

  // Fetch suppliers when project is selected
  const fetchProjectSuppliers = async (projectId: string) => {
    if (!projectId) {
      setSuppliers([])
      return
    }
    
    try {
      setLoadingSuppliers(true)
      const response = await fetch(`/api/projects/${projectId}/suppliers`)
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data.suppliers || [])
      } else {
        setSuppliers([])
      }
    } catch (error) {
      console.error('Error fetching project suppliers:', error)
      setSuppliers([])
    } finally {
      setLoadingSuppliers(false)
    }
  }

  // Fetch projects for dropdown
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true)
      console.log('[fetchProjects] Starting fetch...')
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      const response = await fetch('/api/projects', { signal: controller.signal })
      clearTimeout(timeoutId)
      
      console.log('[fetchProjects] Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('[fetchProjects] Success, data:', data)
        // API returns {success: true, data: [...]} format
        const projectsList = data.data || data || []
        console.log('[fetchProjects] Projects list:', projectsList)
        setProjects(Array.isArray(projectsList) ? projectsList : [])
      } else {
        console.error('[fetchProjects] Failed response:', response.status)
        setProjects([])
      }
    } catch (error) {
      console.error('[fetchProjects] Error:', error)
      setProjects([])
    } finally {
      setLoadingProjects(false)
    }
  }

  // Fetch orders for dropdown
  const fetchOrders = async () => {
    try {
      setLoadingOrders(true)
      console.log('[fetchOrders] Starting fetch...')
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      const response = await fetch('/api/orders', { signal: controller.signal })
      clearTimeout(timeoutId)
      
      console.log('[fetchOrders] Response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('[fetchOrders] Success, data:', result)
        // API returns {ok: true, data: [...]} format
        const ordersList = result.data || result.orders || result || []
        console.log('[fetchOrders] Orders list:', ordersList)
        setOrders(Array.isArray(ordersList) ? ordersList : [])
      } else {
        console.error('[fetchOrders] Failed response:', response.status, response.statusText)
        setOrders([])
      }
    } catch (error) {
      console.error('[fetchOrders] Error:', error)
      // Set empty array instead of staying in loading state
      setOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    fetchProjects()
    fetchOrders()
  }, [])

  // Load initial data for editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        order_uuid: initialData.order_uuid || '',
        order_id: initialData.order_id || '',
        driver_name: initialData.driver_name || '',
        vehicle_number: initialData.vehicle_number || '',
        delivery_date: initialData.delivery_date ? new Date(initialData.delivery_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: initialData.status || 'pending',
        notes: initialData.notes || '',
        projectId: '',
        supplierId: '',
        items: initialData.items && initialData.items.length > 0 
          ? initialData.items.map((item: any) => ({
              product_name: item.product_name || '',
              quantity: item.quantity || 1,
              unit: item.unit || 'pieces',
              unit_price: item.unit_price || 0
            }))
          : [{
              product_name: '',
              quantity: 1,
              unit: 'pieces',
              unit_price: 0
            }]
      })
    }
  }, [initialData])

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product_name: '',
        quantity: 1,
        unit: 'pieces',
        unit_price: 0
      }]
    }))
  }

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }))
    }
  }

  const updateItem = (index: number, field: keyof DeliveryItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  // Helper function for precise calculations
  const roundToTwo = (num: number): number => {
    return Math.round(num * 100) / 100
  }

  const calculateTotal = () => {
    return roundToTwo(formData.items.reduce((total, item) => {
      const itemTotal = roundToTwo(item.quantity * item.unit_price)
      return total + itemTotal
    }, 0))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate items
      if (formData.items.length === 0 || formData.items.some(item => !item.product_name || item.quantity <= 0 || item.unit_price < 0)) {
        throw new Error('Please fill in all item details with valid quantities and prices')
      }

      // 1) Upload images first (optional). We'll try but won't fail the submission if uploads fail.
      let proofUrls: string[] = []
      if (images.length > 0) {
        try {
          const supabase = sbBrowser()
          const bucket = 'delivery-proofs'
          const uploaded: string[] = []
          for (let i = 0; i < images.length; i++) {
            const file = images[i]
            const ext = file.name.split('.').pop() || 'jpg'
            const path = `uploads/${Date.now()}_${i}.${ext}`
            const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
              cacheControl: '3600',
              upsert: false,
            })
            if (upErr) throw upErr
            const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
            if (pub?.publicUrl) uploaded.push(pub.publicUrl)
          }
          proofUrls = uploaded
        } catch (uploadErr) {
          console.warn('Image upload failed, continuing without proofs:', uploadErr)
        }
      }

      const deliveryData = {
        order_uuid: formData.order_uuid || undefined,
        order_id: formData.order_id || `ORDER-${Date.now()}`,
        driver_name: formData.driver_name,
        vehicle_number: formData.vehicle_number,
        delivery_date: formData.delivery_date + 'T00:00:00.000Z',
        status: formData.status,
        notes: formData.notes || undefined,
        items: formData.items,
        proof_urls: proofUrls.length > 0 ? proofUrls : undefined
      }

      // Use PATCH for editing, POST for creating
      const url = deliveryId ? `/api/order-deliveries/${deliveryId}` : '/api/order-deliveries'
      const method = deliveryId ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deliveryData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        const msg = result.error || `Failed to ${deliveryId ? 'update' : 'record'} delivery`
        const details = result.details ? `: ${result.details}` : ''
        throw new Error(msg + details)
      }

      // If a project is selected, assign the delivery to the project
      if (formData.projectId && result.delivery) {
        try {
          const assignResponse = await fetch(`/api/projects/${formData.projectId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deliveries: [result.delivery.id]
            })
          });

          if (!assignResponse.ok) {
            console.error('Failed to assign delivery to project');
            // Don't throw error here, delivery was created successfully
          }
        } catch (error) {
          console.error('Error assigning delivery to project:', error);
          // Don't throw error here, delivery was created successfully
        }
      }

      // If a supplier is selected, assign the supplier to this delivery
      if (formData.supplierId && result.delivery) {
        try {
          const assignSupplierResponse = await fetch(`/api/deliveries/${result.delivery.id}/assign-supplier`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              supplier_id: formData.supplierId
            })
          });

          if (!assignSupplierResponse.ok) {
            console.error('Failed to assign supplier to delivery');
            // Don't throw error here, delivery was created successfully
          }
        } catch (error) {
          console.error('Error assigning supplier to delivery:', error);
          // Don't throw error here, delivery was created successfully
        }
      }
      
      // Reset form
      setFormData({
        order_uuid: '',
        order_id: '',
        driver_name: '',
        vehicle_number: '',
        delivery_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        notes: '',
        projectId: '',
        supplierId: '',
        items: [{
          product_name: '',
          quantity: 1,
          unit: 'pieces',
          unit_price: 0
        }]
      })
  setImages([])
  setImagePreviews([])
  setSuppliers([])

      if (onSuccess) {
        onSuccess(result.delivery)
      } else {
        // Navigate to deliveries page if no callback is provided
        window.location.href = '/deliveries'
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record delivery')
    } finally {
      setLoading(false)
    }
  }

  const units = ['pieces', 'bags', 'cubic meters', 'sheets', 'tons', 'liters', 'meters', 'square meters']
  const commonProducts = [
    'Portland Cement',
    'Steel Rebar 12mm',
    'Concrete Blocks',
    'Sand (Fine)',
    'Gravel',
    'Lumber 2x4',
    'Plywood 18mm',
    'Roofing Tiles'
  ]

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Basic Information Section */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 text-sm">Basic Information</h4>
        
        <Select
          label="Select Purchase Order"
          required
          value={formData.order_uuid}
          onChange={(e) => {
            const selectedOrder = orders.find(o => o.id === e.target.value)
            const generatedOrderId = selectedOrder ? `ORD-${Date.now()}` : ''
            setFormData(prev => ({ 
              ...prev, 
              order_uuid: e.target.value,
              order_id: generatedOrderId
            }))
          }}
          options={[
            { value: '', label: loadingOrders ? 'Loading orders...' : 'Select an order...' },
            ...orders.map(order => ({ 
              value: order.id, 
              label: `${order.description || 'Unnamed Order'} - ${formatAmount(order.amount || 0)} (${order.status || 'pending'})`
            }))
          ]}
          helpText={orders.length === 0 && !loadingOrders ? 
            'No orders found. Create an order first or run QUICK-TEST-SETUP.sql to create test data.' : 
            `Select the purchase order this delivery is for (${orders.length} orders available)`
          }
          disabled={!!preselectedOrderId}
          fullWidth
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Delivery Date"
            type="date"
            required
            value={formData.delivery_date}
            onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
            leftIcon={<Calendar className="h-4 w-4" />}
            fullWidth
          />

          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'partial', label: 'In Transit' },
              { value: 'delivered', label: 'Delivered' }
            ]}
            fullWidth
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Driver Name"
            value={formData.driver_name}
            onChange={(e) => setFormData(prev => ({ ...prev, driver_name: e.target.value }))}
            placeholder="e.g., John Smith"
            fullWidth
          />

          <Input
            label="Vehicle Number"
            value={formData.vehicle_number}
            onChange={(e) => setFormData(prev => ({ ...prev, vehicle_number: e.target.value }))}
            placeholder="e.g., TRK-001"
            leftIcon={<Truck className="h-4 w-4" />}
            fullWidth
          />
        </div>
      </div>

      {/* Project Link Section */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 text-sm">Project Link</h4>
        
        <Select
          label="Project (Optional)"
          value={formData.projectId}
          onChange={(e) => {
            const projectId = e.target.value
            setFormData(prev => ({ ...prev, projectId, supplierId: '' }))
            fetchProjectSuppliers(projectId)
          }}
          options={[
            { value: '', label: loadingProjects ? 'Loading projects...' : 'Select a project (optional)...' },
            ...projects.map(project => ({ value: project.id, label: project.name }))
          ]}
          helpText={!formData.projectId ? "Link this delivery to a project for tracking" : undefined}
          fullWidth
        />

        {/* Supplier Selection - only show when project is selected */}
        {formData.projectId && (
          <Select
            label="Assign Supplier (Optional)"
            value={formData.supplierId}
            onChange={(e) => setFormData(prev => ({ ...prev, supplierId: e.target.value }))}
            options={[
              { value: '', label: loadingSuppliers ? 'Loading suppliers...' : 'Select a supplier (optional)...' },
              ...suppliers.map(supplier => ({ 
                value: supplier.id, 
                label: supplier.full_name || supplier.email 
              }))
            ]}
            helpText={
              suppliers.length === 0 && !loadingSuppliers 
                ? "No suppliers found for this project. Add suppliers via Project Access first." 
                : "Assign a supplier to this delivery for tracking"
            }
            fullWidth
          />
        )}
      </div>

      {/* Delivery Items Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900 text-sm">Delivery Items</h4>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>

        <div className="space-y-3">
          {formData.items.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                </div>
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    list={`products-${index}`}
                    value={item.product_name}
                    onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Select or type product name"
                  />
                  <datalist id={`products-${index}`}>
                    {commonProducts.map(product => (
                      <option key={product} value={product} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Unit *</label>
                    <select
                      required
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      {units.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-xs font-medium text-gray-500">Item Total</span>
                  <span className="text-sm font-semibold text-gray-900">
                    ${roundToTwo(item.quantity * item.unit_price).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900">Grand Total:</span>
            <span className="text-xl font-bold text-blue-600">${calculateTotal().toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Delivery Notes Section */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 text-sm">Delivery Notes</h4>
        
        <TextArea
          label="Notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          placeholder="Optional notes about the delivery..."
          fullWidth
        />
      </div>

      {/* Photo Proof Section */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 text-sm">Photo Proof (optional)</h4>
        
        <div>
          <label className="inline-flex items-center px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all">
            <Upload className="h-5 w-5 mr-2 text-gray-500" />
            <span className="font-medium">Upload Images</span>
            {images.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                {images.length} selected
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []) as File[]
                const limited = files.slice(0, 5)
                setImages(limited)
                const urls = limited.map(f => URL.createObjectURL(f))
                setImagePreviews(urls)
              }}
            />
          </label>
          <p className="text-xs text-gray-500 mt-1">Upload photos of delivery (max 5 images)</p>
        </div>

        {imagePreviews.length > 0 && (
          <div className="grid grid-cols-5 gap-3">
            {imagePreviews.map((src, i) => (
              <div key={i} className="relative aspect-square border-2 border-gray-200 rounded-lg overflow-hidden group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`preview-${i}`} className="object-cover w-full h-full" />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {loading ? 'Saving...' : (deliveryId ? 'Update Delivery' : 'Add Delivery')}
        </button>
      </div>
    </form>
  )

  if (isModal) {
    return formContent
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Truck className="h-5 w-5 text-blue-600" />
          {deliveryId ? 'Edit Delivery' : 'New Delivery'}
        </h3>
      </div>
      {formContent}
    </div>
  )
}
