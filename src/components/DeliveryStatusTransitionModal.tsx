'use client'

import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

export interface DeliveryStatusTransitionModalProps {
  isOpen: boolean
  onClose: () => void
  deliveryId: string
  currentStatus: 'pending' | 'partial' | 'delivered'
  items?: Array<{ description: string; qty: number; unit: string }>
  onSuccess?: (updatedDelivery: any) => void
}

export function DeliveryStatusTransitionModal({
  isOpen,
  onClose,
  deliveryId,
  currentStatus,
  items = [],
  onSuccess
}: DeliveryStatusTransitionModalProps) {
  const { push: toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  // Smart default: if current status is 'partial', default to 'delivered', otherwise 'partial'
  const [newStatus, setNewStatus] = useState<'partial' | 'delivered'>(
    currentStatus === 'partial' ? 'delivered' : 'partial'
  )

  // Determine which statuses are valid transitions from current status
  const validTransitions: Record<string, Array<'partial' | 'delivered'>> = {
    pending: ['partial', 'delivered'],
    partial: ['delivered'],
    delivered: []
  }

  const possibleStatuses = validTransitions[currentStatus] || []

  // Fields based on target status
  const [driverName, setDriverName] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [signerName, setSignerName] = useState('')
  const [signatureUrl, setSignatureUrl] = useState('')
  const [podFile, setPodFile] = useState<File | null>(null)
  const [uploadingPod, setUploadingPod] = useState(false)

  const handleTransition = async () => {
    if (!newStatus) {
      toast({ title: 'Please select a status', variant: 'error' })
      return
    }

    // Validate required fields
    if (newStatus === 'partial' && !driverName.trim()) {
      toast({ title: 'Driver name is required for partial delivery', variant: 'error' })
      return
    }
    if (newStatus === 'delivered' && !signerName.trim()) {
      toast({ title: 'Signer name is required for delivery completion', variant: 'error' })
      return
    }

    setLoading(true)
    try {
      let url = ''
      let method = 'PATCH'
      let body: any = {}

      if (newStatus === 'partial') {
        // Move to In Transit
        url = `/api/order-deliveries/${deliveryId}`
        body = {
          status: 'partial',
          driver_name: driverName || null,
          vehicle_number: vehicleNumber || null
        }
      } else {
        // Complete (Delivered)
        url = `/api/order-deliveries/${deliveryId}/mark-delivered`
        body = {
          notes: signerName ? `Signed by ${signerName}${driverName ? `; Driver ${driverName}` : ''}` : null,
          delivered_at: new Date().toISOString()
        }
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || `HTTP ${res.status}`)
      }

      const json = await res.json()
      const updated = json?.delivery || json?.data || json

      // Upload POD file if provided
      if (podFile) {
        await uploadPodFile()
      }

      toast({
        title: `Delivery status updated to ${newStatus}`,
        variant: 'success'
      })

      // Reset form
      setDriverName('')
      setVehicleNumber('')
      setSignerName('')
      setSignatureUrl('')
      setPodFile(null)
      setNewStatus('partial')

      // Callback
      if (onSuccess) onSuccess(updated)
      onClose()
    } catch (err: any) {
      console.error('Error updating delivery:', err)
      toast({ title: 'Failed to update delivery status', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const uploadPodFile = async () => {
    if (!podFile) return

    setUploadingPod(true)
    try {
      const formData = new FormData()
      formData.append('file', podFile)

      const res = await fetch(`/api/order-deliveries/${deliveryId}/upload-proof`, {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to upload POD')
      }

      toast({ title: 'POD uploaded successfully', variant: 'success' })
    } catch (err: any) {
      console.error('POD upload error:', err)
      toast({ title: err.message || 'Failed to upload POD', variant: 'error' })
    } finally {
      setUploadingPod(false)
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Update Delivery Status"
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          {possibleStatuses.length > 0 && (
            <Button onClick={handleTransition} disabled={loading} loading={loading}>
              Update Status
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Current Status */}
        <div className="sp-card bg-[var(--sp-color-muted)]/30 p-3 rounded">
          <div className="text-xs font-medium text-[var(--sp-color-muted)]">Current Status</div>
          <div className="text-sm font-semibold capitalize">{currentStatus}</div>
        </div>

        {/* Items Being Delivered */}
        {items.length > 0 && (
          <div className="sp-card p-3 rounded border border-[var(--sp-color-border)]">
            <div className="text-xs font-medium mb-2">Items</div>
            <ul className="space-y-1 text-xs">
              {items.map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span className="text-[var(--sp-color-muted)]">{item.description}</span>
                  <span className="font-medium">{item.qty} {item.unit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Status Selection */}
        {possibleStatuses.length > 0 ? (
          <>
            <div className="sp-field">
              <label className="text-xs font-medium">New Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as 'partial' | 'delivered')}
                className="sp-input"
              >
                {possibleStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s === 'partial' ? 'In Transit' : 'Delivered'}
                  </option>
                ))}
              </select>
            </div>

            {/* Partial Delivery Fields */}
            {newStatus === 'partial' && (
              <>
                <div className="sp-field">
                  <label className="text-xs font-medium">Driver Name *</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="sp-input"
                    placeholder="e.g., John Doe"
                  />
                </div>
                <div className="sp-field">
                  <label className="text-xs font-medium">Vehicle Number (optional)</label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="sp-input"
                    placeholder="e.g., ABC-123"
                  />
                </div>
                <div className="sp-field">
                  <label className="text-xs font-medium">Proof of Delivery (POD) - Optional</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) setPodFile(file)
                      }}
                      className="sp-input flex-1"
                      id="pod-upload-partial"
                    />
                    {podFile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPodFile(null)}
                        type="button"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {podFile && (
                    <div className="text-xs text-[var(--sp-color-success)] mt-1">
                      Selected: {podFile.name}
                    </div>
                  )}
                  <div className="text-xs text-[var(--sp-color-muted)] mt-1">
                    Upload POD now or add it later
                  </div>
                </div>
              </>
            )}            {/* Delivered Fields */}
            {newStatus === 'delivered' && (
              <>
                <div className="sp-field">
                  <label className="text-xs font-medium">Signer Name *</label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="sp-input"
                    placeholder="e.g., Jane Smith"
                  />
                </div>
                <div className="sp-field">
                  <label className="text-xs font-medium">Proof of Delivery (POD) - Optional</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) setPodFile(file)
                      }}
                      className="sp-input flex-1"
                      id="pod-upload-delivered"
                    />
                    {podFile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPodFile(null)}
                        type="button"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {podFile && (
                    <div className="text-xs text-[var(--sp-color-success)] mt-1">
                      Selected: {podFile.name}
                    </div>
                  )}
                  <div className="text-xs text-[var(--sp-color-muted)] mt-1">
                    Upload POD signature or document
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="text-sm text-[var(--sp-color-muted)]">
            No valid status transitions available. This delivery is already in a final state.
          </div>
        )}
      </div>
    </Modal>
  )
}
