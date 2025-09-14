"use client"
import RecordDeliveryForm from '@/components/RecordDeliveryForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewDeliveryPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/deliveries" className="inline-flex items-center text-gray-600 hover:text-gray-800">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Deliveries
          </Link>
        </div>
  <RecordDeliveryForm />
      </div>
    </div>
  )
}
