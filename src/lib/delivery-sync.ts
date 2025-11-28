/**
 * Delivery Sync Utilities
 * 
 * Handles automatic synchronization of delivery status changes with:
 * - Order status and delivered value updates
 * - Project actual cost and variance calculations
 * - Activity logging
 * - Real-time broadcasts
 */

import { supabaseService } from '@/lib/supabase'
import { audit } from '@/lib/audit'
import { broadcast, broadcastDashboardUpdated } from '@/lib/realtime'

export type DeliveryStatus = 'pending' | 'partial' | 'delivered'

/**
 * Validates status transitions
 * Allowed transitions:
 * - pending → partial
 * - pending → delivered
 * - partial → delivered
 * Locked: delivered (cannot transition out)
 */
export function isValidStatusTransition(
  from: DeliveryStatus,
  to: DeliveryStatus
): boolean {
  if (from === 'delivered') {
    return false // Delivered is final state
  }
  if (from === 'pending') {
    return to === 'partial' || to === 'delivered'
  }
  if (from === 'partial') {
    return to === 'delivered'
  }
  return false
}

/**
 * Updates order and project actuals after a delivery status change
 * Called after delivery is updated
 */
export async function updateOrderAndProjectActuals(
  deliveryId: string,
  companyId: string,
  userId?: string
) {
  try {
    const sb = supabaseService()

    // Step 1: Get delivery details with items
    const { data: delivery, error: deliveryError } = await (sb as any)
      .from('deliveries')
      .select(`
        id,
        order_id,
        project_id,
        status,
        delivered_at,
        created_at
      `)
      .eq('company_id', companyId)
      .eq('id', deliveryId)
      .single()

    if (deliveryError || !delivery) {
      console.error('Error fetching delivery:', deliveryError)
      return
    }

    // Step 2: Get all delivery items for this delivery
    const { data: deliveryItems } = await (sb as any)
      .from('delivery_items')
      .select('id, product_id, quantity, unit_price, total_price')
      .eq('company_id', companyId)
      .eq('delivery_id', deliveryId)

    const totalDeliveredValue = (deliveryItems || []).reduce(
      (sum: number, item: any) => sum + (item.total_price || 0),
      0
    )

    // Step 3: Update order if order_id exists
    if (delivery.order_id) {
      await updateOrderStatus(
        delivery.order_id,
        companyId,
        delivery.status,
        totalDeliveredValue,
        userId
      )
    }

    // Step 4: Update project if project_id exists
    if (delivery.project_id) {
      await updateProjectActuals(
        delivery.project_id,
        companyId,
        userId
      )
    }

    console.log('✅ Synced delivery updates:', {
      delivery_id: deliveryId,
      order_id: delivery.order_id,
      project_id: delivery.project_id,
      status: delivery.status,
      delivered_value: totalDeliveredValue
    })
  } catch (error) {
    console.error('Error updating order and project actuals:', error)
    // Don't throw - allow delivery update to succeed even if sync fails
  }
}

/**
 * Updates order status based on delivery progress
 */
async function updateOrderStatus(
  orderId: string,
  companyId: string,
  deliveryStatus: DeliveryStatus,
  addedDeliveredValue: number,
  userId?: string
) {
  const sb = supabaseService()

  // Get order details from purchase_orders table
  const { data: order, error: orderError } = await (sb as any)
    .from('purchase_orders')
    .select('id, status, delivered_value, ordered_qty, delivered_qty, quantity')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    console.error('Error fetching order from purchase_orders:', orderError)
    return
  }

  // Get all delivery items for this order across all deliveries
  const { data: allDeliveryItems } = await (sb as any)
    .from('delivery_items')
    .select(`
      quantity,
      total_price,
      deliveries!inner(order_id, status)
    `)
    .filter('deliveries.order_id', 'eq', orderId)

  // Calculate totals
  const totalDeliveredQty = (allDeliveryItems || []).reduce(
    (sum: number, item: any) => sum + (item.quantity || 0),
    0
  )
  const totalDeliveredValue = (allDeliveryItems || []).reduce(
    (sum: number, item: any) => sum + (item.total_price || 0),
    0
  )

  // Use ordered_qty or quantity for comparison
  const orderedQty = order.ordered_qty || order.quantity || 0
  const remainingQty = Math.max(0, orderedQty - totalDeliveredQty)

  // Determine delivery_progress status
  let deliveryProgress = 'not_started'
  if (totalDeliveredQty > 0) {
    if (totalDeliveredQty >= orderedQty && orderedQty > 0) {
      deliveryProgress = 'completed'
    } else {
      deliveryProgress = 'partially_delivered'
    }
  }

  // Update purchase_orders with delivery tracking fields
  const { error: updateError } = await (sb as any)
    .from('purchase_orders')
    .update({
      delivery_progress: deliveryProgress,
      delivered_qty: totalDeliveredQty,
      remaining_qty: remainingQty,
      delivered_value: totalDeliveredValue,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (updateError) {
    console.error('Error updating purchase_order:', updateError)
    return
  }

  // Log activity
  if (userId) {
    await audit(
      companyId,
      userId,
      'order',
      orderId,
      'delivery_progress_updated',
      {
        previous_progress: order.delivery_progress,
        new_progress: deliveryProgress,
        delivered_value: totalDeliveredValue,
        delivered_qty: totalDeliveredQty,
        remaining_qty: remainingQty,
        reason: 'delivery_status_changed'
      }
    )
  }

  // Broadcast order update
  await broadcast(`order:${orderId}`, 'updated', {
    delivery_progress: deliveryProgress,
    delivered_value: totalDeliveredValue,
    delivered_qty: totalDeliveredQty,
    remaining_qty: remainingQty
  })
  await broadcastDashboardUpdated(companyId)

  console.log('✅ Updated purchase_order delivery progress:', {
    order_id: orderId,
    delivery_progress: deliveryProgress,
    delivered_qty: totalDeliveredQty,
    remaining_qty: remainingQty
  })
}

/**
 * Updates project actual cost and variance
 * Actual = SUM(delivered_items.total_price) + SUM(expenses.amount)
 */
async function updateProjectActuals(
  projectId: string,
  companyId: string,
  userId?: string
) {
  const sb = supabaseService()

  // Get project budget
  const { data: project, error: projectError } = await (sb as any)
    .from('projects')
    .select('id, budget, actual_cost, variance')
    .eq('company_id', companyId)
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    console.error('Error fetching project:', projectError)
    return
  }

  // Calculate actual cost from all deliveries
  const { data: deliveryItems } = await (sb as any)
    .from('delivery_items')
    .select(`
      total_price,
      deliveries!inner(project_id, status)
    `)
    .eq('company_id', companyId)
    .filter('deliveries.project_id', 'eq', projectId)
    .filter('deliveries.status', 'in', '(partial,delivered)')

  const deliveredAmount = (deliveryItems || []).reduce(
    (sum: number, item: any) => sum + (item.total_price || 0),
    0
  )

  // Calculate actual cost from expenses
  const { data: expenses } = await (sb as any)
    .from('expenses')
    .select('amount')
    .eq('company_id', companyId)
    .eq('project_id', projectId)

  const expenseAmount = (expenses || []).reduce(
    (sum: number, item: any) => sum + (item.amount || 0),
    0
  )

  // Calculate totals
  const newActualCost = deliveredAmount + expenseAmount
  const newVariance = (project.budget || 0) - newActualCost

  // Update project only if values changed
  if (
    newActualCost !== project.actual_cost ||
    newVariance !== project.variance
  ) {
    const { error: updateError } = await (sb as any)
      .from('projects')
      .update({
        actual_cost: newActualCost,
        variance: newVariance,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .eq('company_id', companyId)

    if (updateError) {
      console.error('Error updating project:', updateError)
      return
    }

    // Log activity
    if (userId) {
      await audit(
        companyId,
        userId,
        'project',
        projectId,
        'actuals_auto_updated',
        {
          old_actual_cost: project.actual_cost,
          new_actual_cost: newActualCost,
          old_variance: project.variance,
          new_variance: newVariance,
          delivered_amount: deliveredAmount,
          expense_amount: expenseAmount,
          reason: 'delivery_status_changed'
        }
      )
    }

    // Broadcast project update
    await broadcast(`project:${projectId}`, 'updated', {
      actual_cost: newActualCost,
      variance: newVariance
    })
    await broadcastDashboardUpdated(companyId)

    console.log('✅ Updated project actuals:', {
      project_id: projectId,
      actual_cost: newActualCost,
      variance: newVariance
    })
  }
}

/**
 * Archive/soft-delete a delivery (mark as deleted)
 */
export async function archiveDelivery(
  deliveryId: string,
  companyId: string,
  userId: string
) {
  const sb = supabaseService()

  // Get delivery before archiving
  const { data: delivery } = await (sb as any)
    .from('deliveries')
    .select('id, order_id, project_id, status')
    .eq('id', deliveryId)
    .eq('company_id', companyId)
    .single()

  // Mark as deleted
  const { error } = await (sb as any)
    .from('deliveries')
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', deliveryId)
    .eq('company_id', companyId)

  if (error) {
    console.error('Error archiving delivery:', error)
    throw error
  }

  // Log activity
  await audit(companyId, userId, 'delivery', deliveryId, 'archived', {
    status: delivery?.status
  })

  // Resync affected order/project
  if (delivery) {
    if (delivery.order_id) {
      await updateOrderStatus(delivery.order_id, companyId, 'pending', 0, userId)
    }
    if (delivery.project_id) {
      await updateProjectActuals(delivery.project_id, companyId, userId)
    }
  }

  console.log('✅ Archived delivery:', deliveryId)
}
