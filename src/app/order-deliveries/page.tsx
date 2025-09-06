import { Metadata } from 'next'
import { Suspense } from 'react'
import OrderDeliveriesClient from './OrderDeliveriesClient'

export const metadata: Metadata = {
  title: 'Order Deliveries - SiteProc',
  description: 'View and manage order delivery records',
}

function OrderDeliveriesLoading() {
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

export default function OrderDeliveriesPage() {
  return (
    <Suspense fallback={<OrderDeliveriesLoading />}>
      <OrderDeliveriesClient />
    </Suspense>
  )
}
