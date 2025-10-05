import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile, response } from '@/lib/server-utils'

// PATCH /api/orders/[id] - Update order status (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      return response.error('Unauthorized', 401)
    }

    const body = await request.json()
    const { status, notes, rejection_reason } = body
    const orderId = params.id

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return response.error('Invalid status. Must be "approved" or "rejected"', 400)
    }

    // Get the order to verify it exists and belongs to user's company
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
      return response.error('Order not found', 404)
    }

    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'approved') {
      updateData.approved_by = profile.id
      updateData.approved_at = new Date().toISOString()
      updateData.rejected_by = null
      updateData.rejected_at = null
      updateData.rejection_reason = null
    } else if (status === 'rejected') {
      updateData.rejected_by = profile.id
      updateData.rejected_at = new Date().toISOString()
      updateData.rejection_reason = rejection_reason || notes || 'No reason provided'
      updateData.approved_by = null
      updateData.approved_at = null
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
      console.error('Error updating order:', updateError)
      return response.error('Failed to update order', 500)
    }

    return response.success(updatedOrder)
  } catch (error) {
    console.error('Error in PATCH /api/orders/[id]:', error)
    return response.error('Internal server error', 500)
  }
}

// GET /api/orders/[id] - Get single order details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      return response.error('Unauthorized', 401)
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
      return response.error('Order not found', 404)
    }

    return response.success(order)
  } catch (error) {
    console.error('Error in GET /api/orders/[id]:', error)
    return response.error('Internal server error', 500)
  }
}
