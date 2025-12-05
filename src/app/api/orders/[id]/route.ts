import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/server-utils'
import { sendOrderApprovalNotification, sendOrderRejectionNotification } from '@/lib/email'
import { notifyOrderApproval, notifyOrderRejection } from '@/lib/notification-triggers'
import { autoSyncOrderToZoho } from '@/lib/zoho-autosync'

// PUT /api/orders/[id] - Update order details
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { description, category, vendor, amount, project_id, payment_terms } = body
    const orderId = params.id

    // Get the order first to verify it exists and user has access
    const { data: order, error: fetchError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        projects!inner(
          id,
          name,
          company_id
        )
      `)
      .eq('id', orderId)
      .eq('projects.company_id', profile.company_id)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (vendor !== undefined) updateData.vendor = vendor
    if (amount !== undefined) updateData.amount = amount
    if (project_id !== undefined) updateData.project_id = project_id
    if (payment_terms !== undefined) updateData.payment_terms = payment_terms

    // Update the order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('id', orderId)
      .select(`
        *,
        projects(
          id,
          name,
          company_id
        )
      `)
      .single()

    if (updateError) {
      console.error('Order update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update order', 
        details: updateError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ ok: true, order: updatedOrder })
  } catch (error) {
    console.error('Error in PUT /api/orders/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/orders/[id] - Approve or reject an order
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, notes, rejection_reason } = body
    const orderId = params.id

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be approved or rejected' }, { status: 400 })
    }

    // Get the order first to verify it exists and user has access
    const { data: order, error: fetchError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        projects!inner(
          id,
          name,
          company_id
        )
      `)
      .eq('id', orderId)
      .eq('projects.company_id', profile.company_id)
      .single()

    if (fetchError || !order) {
      console.error('Order fetch error:', fetchError)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString()
    }

    if (status === 'approved') {
      updateData.approved_by = profile.id
      updateData.approved_at = new Date().toISOString()
      // Initialize delivery tracking fields
      updateData.delivery_progress = 'not_started'
      updateData.ordered_qty = order.quantity || order.qty || 0
      updateData.delivered_qty = 0
      updateData.remaining_qty = order.quantity || order.qty || 0
      updateData.delivered_value = 0
    } else if (status === 'rejected') {
      updateData.rejected_by = profile.id
      updateData.rejected_at = new Date().toISOString()
      updateData.rejection_reason = rejection_reason || notes || 'No reason provided'
    }

    // Update the order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('id', orderId)
      .select(`
        *,
        projects(
          id,
          name,
          company_id
        )
      `)
      .single()

    if (updateError) {
      console.error('Order update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update order', 
        details: updateError.message 
      }, { status: 500 })
    }

    // Send email notification to the order creator
    try {
      // Note: Skipping email notification for now due to schema limitations
      // TODO: Fetch creator info separately if needed
      console.log(`Order ${orderId} ${status} by ${profile.email}`)
    } catch (emailError) {
      console.error('Failed to send order decision notification:', emailError)
      // Don't fail the request if email fails
    }

    // Create in-app notification for order creator
    try {
      console.log('🔔 Notification check:', {
        order_created_by: order.created_by,
        approver_id: profile.id,
        is_same_user: order.created_by === profile.id,
        will_notify: order.created_by ? true : false,
        note: 'TESTING MODE: Self-notifications enabled'
      })

      if (order.created_by) {
        // Get approver's name
        const { data: approverProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', profile.id)
          .single()
        
        const approverName = approverProfile 
          ? `${approverProfile.first_name || ''} ${approverProfile.last_name || ''}`.trim() || profile.email
          : profile.email

        console.log('🔔 Sending notification to user:', order.created_by)

        if (status === 'approved') {
          await notifyOrderApproval({
            orderId: orderId,
            orderCreatorId: order.created_by,
            companyId: profile.company_id,
            orderNumber: order.order_number || undefined,
            projectName: order.projects?.name || undefined,
            approverName
          })
          console.log('✅ Order approval notification sent')
          
          // Sync approved order to Zoho Books
          try {
            const zohoResult = await autoSyncOrderToZoho(profile.company_id, orderId, 'approved')
            if (zohoResult.synced) {
              console.log(`✅ Order synced to Zoho Books: ${zohoResult.zohoId}`)
            } else if (zohoResult.error) {
              console.log(`⚠️ Zoho sync skipped: ${zohoResult.error}`)
            }
          } catch (zohoError) {
            console.error('❌ Zoho sync error:', zohoError)
            // Don't fail - order was approved successfully
          }
        } else {
          await notifyOrderRejection({
            orderId: orderId,
            orderCreatorId: order.created_by,
            companyId: profile.company_id,
            orderNumber: order.order_number || undefined,
            projectName: order.projects?.name || undefined,
            rejectionReason: rejection_reason || notes || undefined,
            rejectorName: approverName
          })
          console.log('✅ Order rejection notification sent')
        }
        console.log(`✅ In-app notification sent to user ${order.created_by}`)
      } else {
        console.log('⚠️ Skipping notification: No created_by field on order')
      }
    } catch (notifError) {
      console.error('❌ Failed to create in-app notification:', notifError)
      console.error('Notification error details:', {
        message: notifError instanceof Error ? notifError.message : String(notifError),
        stack: notifError instanceof Error ? notifError.stack : undefined
      })
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ 
      ok: true, 
      order: updatedOrder,
      message: `Order ${status} successfully` 
    })
  } catch (error) {
    console.error('Error in PATCH /api/orders/[id]:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET /api/orders/[id] - Get a single order
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderId = params.id

    const { data: order, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        projects!inner(
          id,
          name,
          company_id
        )
      `)
      .eq('id', orderId)
      .eq('projects.company_id', profile.company_id)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, data: order })
  } catch (error) {
    console.error('Error in GET /api/orders/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/orders/[id] - Delete an order
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderId = params.id

    // Get the order first to verify it exists and user has access
    const { data: order, error: fetchError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        projects!inner(
          id,
          name,
          company_id
        )
      `)
      .eq('id', orderId)
      .eq('projects.company_id', profile.company_id)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if order has deliveries
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('id')
      .eq('order_id', orderId)
      .limit(1)

    if (deliveries && deliveries.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete order with existing deliveries. Delete deliveries first.' 
      }, { status: 400 })
    }

    // Delete the order
    const { error: deleteError } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', orderId)

    if (deleteError) {
      console.error('Order delete error:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete order', 
        details: deleteError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: 'Order deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/orders/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}