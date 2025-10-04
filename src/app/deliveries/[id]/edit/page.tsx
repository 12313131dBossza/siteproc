"use client"
import { useState, useEffect } from 'react'
import { AppLayout } from "@/components/app-layout"
import { useRouter } from 'next/navigation'
import RecordDeliveryForm from '@/components/RecordDeliveryForm'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Delivery {
  id: string
  order_id: string
  driver_name?: string
  vehicle_number?: string
  status: 'pending' | 'partial' | 'delivered'
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

export default function EditDeliveryPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDelivery()
  }, [params.id])

  const fetchDelivery = async () => {
    try {
      const response = await fetch(`/api/order-deliveries/${params.id}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Delivery not found')
          return
        }
        throw new Error('Failed to fetch delivery')
      }

      const data = await response.json()
      
      // Check if delivery is already delivered (locked)
      if (data.status === 'delivered') {
        toast.error('Cannot edit delivered delivery', {
          description: 'Delivered deliveries are locked and cannot be edited.',
          duration: 4000,
        })
        router.push('/deliveries')
        return
      }
      
      setDelivery(data)
    } catch (error) {
      console.error('Error fetching delivery:', error)
      setError('Failed to load delivery')
      toast.error('Failed to load delivery', {
        description: 'Please try again or go back to the deliveries list.',
        duration: 4000,
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="Edit Delivery" description="Update delivery information">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading delivery...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !delivery) {
    return (
      <AppLayout title="Edit Delivery" description="Update delivery information">
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 mb-4">{error || 'Delivery not found'}</p>
            <Button
              variant="primary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => router.push('/deliveries')}
            >
              Back to Deliveries
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Edit Delivery"
      description="Update delivery information"
      actions={
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push('/deliveries')}
        >
          Back to Deliveries
        </Button>
      }
    >
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Edit Delivery</h2>
              <p className="text-gray-600">
                Update the delivery information for order <span className="font-mono bg-gray-100 px-2 py-1 rounded">{delivery.order_id}</span>
              </p>
              {delivery.status === 'delivered' && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">
                    ⚠️ This delivery has been marked as delivered and is locked from editing.
                  </p>
                </div>
              )}
            </div>
            
            <RecordDeliveryForm
              initialData={delivery}
              deliveryId={delivery.id}
              onSuccess={(updatedDelivery) => {
                toast.success('Delivery updated successfully!', {
                  description: 'The delivery has been updated.',
                  duration: 3000,
                })
                router.push('/deliveries')
              }}
              onCancel={() => router.push('/deliveries')}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
