'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Upload, X, Trash2 } from 'lucide-react'
import { sbBrowser } from '@/lib/supabase-browser'

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

interface RecordDeliveryFormProps {
  onSuccess?: (delivery: any) => void
  onCancel?: () => void
}

export default function RecordDeliveryForm({ onSuccess, onCancel }: RecordDeliveryFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  
  const [formData, setFormData] = useState({
    order_id: '',
    driver_name: '',
    vehicle_number: '',
    delivery_date: new Date().toISOString().split('T')[0],
    status: 'pending' as 'pending' | 'in_transit' | 'delivered' | 'cancelled',
    notes: '',
    projectId: '',
    items: [
      {
        product_name: '',
        quantity: 1,
        unit: 'pieces',
        unit_price: 0
      }
    ] as DeliveryItem[]
  })

  // Fetch projects for dropdown
  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

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
        order_id: formData.order_id || `ORDER-${Date.now()}`,
        driver_name: formData.driver_name,
        vehicle_number: formData.vehicle_number,
        delivery_date: formData.delivery_date + 'T00:00:00.000Z',
        status: formData.status,
        notes: formData.notes || undefined,
        items: formData.items,
        proof_urls: proofUrls.length > 0 ? proofUrls : undefined
      }

      const response = await fetch('/api/order-deliveries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deliveryData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        const msg = result.error || 'Failed to record delivery'
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
      
      // Reset form
      setFormData({
        order_id: '',
        driver_name: '',
        vehicle_number: '',
        delivery_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        notes: '',
        projectId: '',
        items: [{
          product_name: '',
          quantity: 1,
          unit: 'pieces',
          unit_price: 0
        }]
      })
  setImages([])
  setImagePreviews([])

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

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Record New Delivery
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="order_id" className="block text-sm font-medium text-gray-700 mb-1">
              Order ID (Optional)
            </label>
            <input
              type="text"
              id="order_id"
              value={formData.order_id}
              onChange={(e) => setFormData(prev => ({ ...prev, order_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="AUTO-GENERATED"
            />
          </div>

          <div>
            <label htmlFor="delivery_date" className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Date *
            </label>
            <input
              type="date"
              id="delivery_date"
              required
              value={formData.delivery_date}
              onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="driver_name" className="block text-sm font-medium text-gray-700 mb-1">
              Driver Name
            </label>
            <input
              type="text"
              id="driver_name"
              value={formData.driver_name}
              onChange={(e) => setFormData(prev => ({ ...prev, driver_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., John Smith"
            />
          </div>

          <div>
            <label htmlFor="vehicle_number" className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Number
            </label>
            <input
              type="text"
              id="vehicle_number"
              value={formData.vehicle_number}
              onChange={(e) => setFormData(prev => ({ ...prev, vehicle_number: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., TRK-001"
            />
          </div>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="pending">Pending</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-1">
            Project (Optional)
          </label>
          <select
            id="project_id"
            value={formData.projectId}
            onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a project (optional)...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

  {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-700">Delivery Items *</h4>
            <button
              type="button"
              onClick={addItem}
              className="text-blue-600 hover:text-blue-500 text-sm font-medium flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">Item {index + 1}</span>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
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
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
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
                  <div className="md:col-span-2 flex items-end">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Total: </span>
                      ${roundToTwo(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">Grand Total:</span>
              <span className="font-semibold text-lg text-gray-900">${calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Delivery Notes
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Optional notes about the delivery..."
          />
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photo Proof (optional)</label>
          <div className="flex items-center space-x-3">
            <label className="inline-flex items-center px-3 py-2 border rounded-lg cursor-pointer text-gray-700 hover:bg-gray-50">
              <Upload className="h-4 w-4 mr-2" />
              <span>Upload Images</span>
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
            {images.length > 0 && (
              <span className="text-sm text-gray-600">{images.length} selected</span>
            )}
          </div>
          {imagePreviews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative w-24 h-24 border rounded overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`preview-${i}`} className="object-cover w-full h-full" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex space-x-3 pt-4 border-t">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Recording...' : 'Record Delivery'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
