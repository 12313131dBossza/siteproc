import { Metadata } from 'next'
import OrderDeliveriesClient from './OrderDeliveriesClient'

export const metadata: Metadata = {
  title: 'Order Deliveries - SiteProc',
  description: 'View and manage order delivery records',
}

export default function OrderDeliveriesPage() {
  return <OrderDeliveriesClient />
}
