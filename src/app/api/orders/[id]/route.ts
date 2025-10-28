import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/server-utils'
import { sendOrderApprovalNotification, sendOrderRejectionNotification } from '@/lib/email'
import { notifyOrderApproval, notifyOrderRejection } from '@/lib/notification-triggers'

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
      if (order.created_by && order.created_by !== profile.id) {
        // Get approver's name
        const { data: approverProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', profile.id)
          .single()
        
        const approverName = approverProfile 
          ? `${approverProfile.first_name || ''} ${approverProfile.last_name || ''}`.trim() || profile.email
          : profile.email

        if (status === 'approved') {
          await notifyOrderApproval({
            orderId: orderId,
            orderCreatorId: order.created_by,
            companyId: profile.company_id,
            orderNumber: order.order_number || undefined,
            projectName: order.projects?.name || undefined,
            approverName
          })
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
        }
        console.log(`✅ In-app notification sent to user ${order.created_by}`)
      }
    } catch (notifError) {
      console.error('Failed to create in-app notification:', notifError)
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
