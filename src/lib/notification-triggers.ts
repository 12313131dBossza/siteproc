/**
 * Notification Triggers Library
 * 
 * Helper functions to create notifications from API routes.
 * Each function creates a notification by calling the notifications API.
 */

import { createServiceClient } from './supabase-service'

interface NotificationData {
  user_id: string
  company_id: string
  type: 'order_approved' | 'order_rejected' | 'expense_approved' | 'expense_rejected' | 'delivery_status' | 'payment_created' | 'payment_updated' | 'project_update' | 'system'
  title: string
  message: string
  link?: string
  metadata?: Record<string, any>
}

/**
 * Create notification directly via database (bypasses API, more reliable)
 */
async function createNotification(data: NotificationData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient()
    
    const { error } = await supabase
      .from('notifications')
      .insert([{
        user_id: data.user_id,
        company_id: data.company_id,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || null,
        metadata: data.metadata || null,
        read: false,
        created_at: new Date().toISOString()
      }])
    
    if (error) {
      console.error('Failed to create notification:', error)
      return { success: false, error: error.message }
    }
    
    console.log(`✅ Notification created: ${data.type} for user ${data.user_id}`)
    return { success: true }
  } catch (error) {
    console.error('Error in createNotification:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Notify user when their order is approved
 */
export async function notifyOrderApproval(params: {
  orderId: string
  orderCreatorId: string
  companyId: string
  orderNumber?: string
  projectName?: string
  approverName?: string
}): Promise<void> {
  const { orderId, orderCreatorId, companyId, orderNumber, projectName, approverName } = params
  
  await createNotification({
    user_id: orderCreatorId,
    company_id: companyId,
    type: 'order_approved',
    title: 'Order Approved',
    message: `Your order${orderNumber ? ` #${orderNumber}` : ''}${projectName ? ` for ${projectName}` : ''} has been approved${approverName ? ` by ${approverName}` : ''}.`,
    link: `/orders/${orderId}`,
    metadata: {
      order_id: orderId,
      order_number: orderNumber,
      project_name: projectName,
      approver: approverName
    }
  })
}

/**
 * Notify user when their order is rejected
 */
export async function notifyOrderRejection(params: {
  orderId: string
  orderCreatorId: string
  companyId: string
  orderNumber?: string
  projectName?: string
  rejectionReason?: string
  rejectorName?: string
}): Promise<void> {
  const { orderId, orderCreatorId, companyId, orderNumber, projectName, rejectionReason, rejectorName } = params
  
  await createNotification({
    user_id: orderCreatorId,
    company_id: companyId,
    type: 'order_rejected',
    title: 'Order Rejected',
    message: `Your order${orderNumber ? ` #${orderNumber}` : ''}${projectName ? ` for ${projectName}` : ''} was rejected${rejectorName ? ` by ${rejectorName}` : ''}${rejectionReason ? `: ${rejectionReason}` : '.'}`,
    link: `/orders/${orderId}`,
    metadata: {
      order_id: orderId,
      order_number: orderNumber,
      project_name: projectName,
      rejector: rejectorName,
      rejection_reason: rejectionReason
    }
  })
}

/**
 * Notify user when their expense is approved
 */
export async function notifyExpenseApproval(params: {
  expenseId: string
  employeeId: string
  companyId: string
  amount?: number
  vendor?: string
  category?: string
  approverName?: string
}): Promise<void> {
  const { expenseId, employeeId, companyId, amount, vendor, category, approverName } = params
  
  const amountStr = amount ? ` for $${amount.toFixed(2)}` : ''
  const vendorStr = vendor ? ` (${vendor})` : ''
  
  await createNotification({
    user_id: employeeId,
    company_id: companyId,
    type: 'expense_approved',
    title: 'Expense Approved',
    message: `Your ${category || 'expense'}${amountStr}${vendorStr} has been approved${approverName ? ` by ${approverName}` : ''}.`,
    link: `/expenses/${expenseId}`,
    metadata: {
      expense_id: expenseId,
      amount,
      vendor,
      category,
      approver: approverName
    }
  })
}

/**
 * Notify user when their expense is rejected
 */
export async function notifyExpenseRejection(params: {
  expenseId: string
  employeeId: string
  companyId: string
  amount?: number
  vendor?: string
  category?: string
  rejectionReason?: string
  rejectorName?: string
}): Promise<void> {
  const { expenseId, employeeId, companyId, amount, vendor, category, rejectionReason, rejectorName } = params
  
  const amountStr = amount ? ` for $${amount.toFixed(2)}` : ''
  const vendorStr = vendor ? ` (${vendor})` : ''
  
  await createNotification({
    user_id: employeeId,
    company_id: companyId,
    type: 'expense_rejected',
    title: 'Expense Rejected',
    message: `Your ${category || 'expense'}${amountStr}${vendorStr} was rejected${rejectorName ? ` by ${rejectorName}` : ''}${rejectionReason ? `: ${rejectionReason}` : '.'}`,
    link: `/expenses/${expenseId}`,
    metadata: {
      expense_id: expenseId,
      amount,
      vendor,
      category,
      rejector: rejectorName,
      rejection_reason: rejectionReason
    }
  })
}

/**
 * Notify relevant users when delivery status changes
 */
export async function notifyDeliveryStatus(params: {
  deliveryId: string
  recipientUserIds: string[]
  companyId: string
  deliveryNumber?: string
  projectName?: string
  newStatus: string
  orderId?: string
}): Promise<void> {
  const { deliveryId, recipientUserIds, companyId, deliveryNumber, projectName, newStatus, orderId } = params
  
  // Create notification for each recipient
  for (const userId of recipientUserIds) {
    await createNotification({
      user_id: userId,
      company_id: companyId,
      type: 'delivery_status',
      title: 'Delivery Status Update',
      message: `Delivery${deliveryNumber ? ` #${deliveryNumber}` : ''}${projectName ? ` for ${projectName}` : ''} is now ${newStatus}.`,
      link: orderId ? `/orders/${orderId}` : `/deliveries/${deliveryId}`,
      metadata: {
        delivery_id: deliveryId,
        delivery_number: deliveryNumber,
        project_name: projectName,
        new_status: newStatus,
        order_id: orderId
      }
    })
  }
}

/**
 * Notify approvers when new payment is created
 */
export async function notifyPaymentCreated(params: {
  paymentId: string
  approverUserIds: string[]
  companyId: string
  amount?: number
  vendor?: string
  paymentMethod?: string
  creatorName?: string
}): Promise<void> {
  const { paymentId, approverUserIds, companyId, amount, vendor, paymentMethod, creatorName } = params
  
  const amountStr = amount ? `$${amount.toFixed(2)}` : 'New payment'
  const vendorStr = vendor ? ` to ${vendor}` : ''
  const methodStr = paymentMethod ? ` via ${paymentMethod}` : ''
  
  // Create notification for each approver
  for (const userId of approverUserIds) {
    await createNotification({
      user_id: userId,
      company_id: companyId,
      type: 'payment_created',
      title: 'New Payment Pending Approval',
      message: `${amountStr}${vendorStr}${methodStr} requires your approval${creatorName ? ` (submitted by ${creatorName})` : ''}.`,
      link: `/payments/${paymentId}`,
      metadata: {
        payment_id: paymentId,
        amount,
        vendor,
        payment_method: paymentMethod,
        creator: creatorName
      }
    })
  }
}

/**
 * Notify user when payment is updated (approved/paid)
 */
export async function notifyPaymentUpdated(params: {
  paymentId: string
  creatorId: string
  companyId: string
  amount?: number
  vendor?: string
  newStatus: string
  updaterName?: string
}): Promise<void> {
  const { paymentId, creatorId, companyId, amount, vendor, newStatus, updaterName } = params
  
  const amountStr = amount ? `$${amount.toFixed(2)}` : 'Payment'
  const vendorStr = vendor ? ` to ${vendor}` : ''
  
  await createNotification({
    user_id: creatorId,
    company_id: companyId,
    type: 'payment_updated',
    title: 'Payment Status Updated',
    message: `${amountStr}${vendorStr} has been ${newStatus}${updaterName ? ` by ${updaterName}` : ''}.`,
    link: `/payments/${paymentId}`,
    metadata: {
      payment_id: paymentId,
      amount,
      vendor,
      new_status: newStatus,
      updater: updaterName
    }
  })
}
