import { createClient } from '@supabase/supabase-js'

interface DeliveryItem {
  product_name: string
  quantity: number
  unit: string
}

interface OrderItem {
  product_name: string
  quantity: number
  quantity_delivered: number
  unit: string
}

interface OrderSyncResult {
  status: 'pending' | 'partial' | 'completed'
  totalOrdered: number
  totalDelivered: number
  percentComplete: number
  items: OrderItem[]
}

/**
 * Syncs order status based on delivered quantities
 * Calculates total ordered vs delivered and determines order completion status
 */
export async function syncOrderStatus(
  supabase: ReturnType<typeof createClient>,
  orderId: string
): Promise<OrderSyncResult> {
  // Fetch all order items
  const { data: orderItems, error: orderError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)

  if (orderError || !orderItems) {
    throw new Error('Failed to fetch order items')
  }

  // Fetch all delivered deliveries for this order
  const { data: deliveries, error: deliveriesError } = await supabase
    .from('deliveries')
    .select(`
      id,
      status,
      delivery_items (
        product_name,
        quantity,
        unit
      )
    `)
    .eq('order_id', orderId)
    .eq('status', 'delivered')

  if (deliveriesError) {
    throw new Error('Failed to fetch deliveries')
  }

  // Calculate delivered quantities per product
  const deliveredQuantities: Record<string, number> = {}

  deliveries?.forEach((delivery: any) => {
    delivery.delivery_items?.forEach((item: DeliveryItem) => {
      const key = `${item.product_name}-${item.unit}`
      deliveredQuantities[key] = (deliveredQuantities[key] || 0) + item.quantity
    })
  })

  // Calculate totals and match with order items
  let totalOrdered = 0
  let totalDelivered = 0

  const itemsWithDelivery: OrderItem[] = orderItems.map((orderItem: any) => {
    const key = `${orderItem.product_name}-${orderItem.unit}`
    const delivered = deliveredQuantities[key] || 0
    
    totalOrdered += orderItem.quantity
    totalDelivered += Math.min(delivered, orderItem.quantity)

    return {
      product_name: orderItem.product_name,
      quantity: orderItem.quantity,
      quantity_delivered: delivered,
      unit: orderItem.unit
    }
  })

  // Determine order status
  let status: 'pending' | 'partial' | 'completed'
  if (totalDelivered === 0) {
    status = 'pending'
  } else if (totalDelivered >= totalOrdered) {
    status = 'completed'
  } else {
    status = 'partial'
  }

  const percentComplete = totalOrdered > 0 ? (totalDelivered / totalOrdered) * 100 : 0

  // Update order record with calculated values
  await supabase
    .from('orders')
    .update({
      delivery_status: status,
      quantity_delivered: totalDelivered,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  return {
    status,
    totalOrdered,
    totalDelivered,
    percentComplete,
    items: itemsWithDelivery
  }
}

export function getStatusColor(status: 'pending' | 'partial' | 'completed'): string {
  switch (status) {
    case 'pending':
      return 'yellow'
    case 'partial':
      return 'blue'
    case 'completed':
      return 'green'
    default:
      return 'gray'
  }
}

export function getStatusLabel(status: 'pending' | 'partial' | 'completed'): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'partial':
      return 'Partially Delivered'
    case 'completed':
      return 'Completed'
    default:
      return 'Unknown'
  }
}

export function getStatusBadgeClasses(status: 'pending' | 'partial' | 'completed'): string {
  const color = getStatusColor(status)
  const colorClasses = {
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200'
  }
  return colorClasses[color] || colorClasses.gray
}
