'use client'

import React, { useState, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Upload, X, Calendar, Package, FileText } from 'lucide-react'

interface RecordDeliveryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  orderItem: {
    order_id: string
    product_id: string
    product_name: string
    sku: string
    unit: string
    ordered_qty: number
    delivered_qty: number
  }
}

export default function RecordDeliveryModal({
  isOpen,
  onClose,
  onSuccess,
  orderItem
}: RecordDeliveryModalProps) {
  const [formData, setFormData] = useState({
    delivered_qty: '',
    delivered_at: new Date().toISOString().split('T')[0], // Today's date
    note: '',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const remainingQty = orderItem.ordered_qty - (orderItem.delivered_qty || 0)
  const maxDeliveryQty = Math.max(0, remainingQty)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    setSelectedFile(file)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setFilePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const deliveredQty = parseFloat(formData.delivered_qty)

      // Validation
      if (!deliveredQty || deliveredQty <= 0) {
        throw new Error('Please enter a valid quantity')
      }

      if (deliveredQty > maxDeliveryQty) {
        throw new Error(`Quantity cannot exceed remaining ${maxDeliveryQty} ${orderItem.unit}`)
      }

      let proofUrl = null

      // Upload proof image if selected
      if (selectedFile) {
        setUploading(true)
        const uploadFormData = new FormData()
        uploadFormData.append('file', selectedFile)
        uploadFormData.append('order_id', orderItem.order_id)
        uploadFormData.append('product_id', orderItem.product_id)

        const uploadResponse = await fetch('/api/order-deliveries/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json()
          throw new Error(uploadError.error || 'Failed to upload proof')
        }

        const uploadResult = await uploadResponse.json()
        proofUrl = uploadResult.url
        setUploading(false)
      }

      // Create delivery record
      const deliveryData = {
        order_id: orderItem.order_id,
        product_id: orderItem.product_id,
        delivered_qty: deliveredQty,
        delivered_at: formData.delivered_at + 'T12:00:00.000Z',
        note: formData.note.trim() || undefined,
        proof_url: proofUrl,
      }

      const response = await fetch('/api/order-deliveries/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deliveryData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to record delivery')
      }

      // Success!
      onSuccess()
      onClose()
      
      // Reset form
      setFormData({
        delivered_qty: '',
        delivered_at: new Date().toISOString().split('T')[0],
        note: '',
      })
      setSelectedFile(null)
      setFilePreview(null)

    } catch (err) {
      console.error('Error recording delivery:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (submitting) return // Prevent closing while submitting
    onClose()
    setError(null)
    setFormData({
      delivered_qty: '',
      delivered_at: new Date().toISOString().split('T')[0],
      note: '',
    })
    setSelectedFile(null)
    setFilePreview(null)
  }

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="Record Delivery"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Package className="h-4 w-4 text-gray-600" />
            <h3 className="font-medium text-gray-900">{orderItem.product_name}</h3>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>SKU: {orderItem.sku}</div>
            <div>Ordered: {orderItem.ordered_qty} {orderItem.unit}</div>
            <div>Previously Delivered: {orderItem.delivered_qty || 0} {orderItem.unit}</div>
            <div className="font-medium text-blue-600">
              Remaining: {maxDeliveryQty} {orderItem.unit}
            </div>
          </div>
        </div>

        {/* Delivery Quantity */}
        <div>
          <label htmlFor="delivered_qty" className="block text-sm font-medium text-gray-700 mb-1">
            Quantity Delivered *
          </label>
          <div className="flex">
            <input
              type="number"
              id="delivered_qty"
              min="0"
              max={maxDeliveryQty}
              step="0.01"
              value={formData.delivered_qty}
              onChange={(e) => setFormData({ ...formData, delivered_qty: e.target.value })}
              className="flex-1 rounded-l-md border-gray-300 border focus:border-blue-500 focus:ring-blue-500"
              placeholder="0.00"
              required
            />
            <span className="inline-flex items-center px-3 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-600 text-sm">
              {orderItem.unit}
            </span>
          </div>
        </div>

        {/* Delivery Date */}
        <div>
          <label htmlFor="delivered_at" className="flex items-center text-sm font-medium text-gray-700 mb-1">
            <Calendar className="h-4 w-4 mr-1" />
            Delivery Date *
          </label>
          <input
            type="date"
            id="delivered_at"
            value={formData.delivered_at}
            onChange={(e) => setFormData({ ...formData, delivered_at: e.target.value })}
            max={new Date().toISOString().split('T')[0]} // Can't be future date
            className="w-full rounded-md border-gray-300 border focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        {/* Delivery Notes */}
        <div>
          <label htmlFor="note" className="flex items-center text-sm font-medium text-gray-700 mb-1">
            <FileText className="h-4 w-4 mr-1" />
            Notes (Optional)
          </label>
          <textarea
            id="note"
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            className="w-full rounded-md border-gray-300 border focus:border-blue-500 focus:ring-blue-500"
            rows={3}
            placeholder="Add any delivery notes or conditions..."
          />
        </div>

        {/* Proof Upload */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <Upload className="h-4 w-4 mr-1" />
            Delivery Proof (Optional)
          </label>
          
          {!filePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors"
            >
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Click to upload delivery photo
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Images only, max 5MB
              </p>
            </div>
          ) : (
            <div className="relative">
              <img
                src={filePreview}
                alt="Delivery proof preview"
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={handleRemoveFile}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {submitting || uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                {uploading ? 'Uploading...' : 'Recording...'}
              </>
            ) : (
              'Record Delivery'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
