import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile, enforceRole } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { logActivity } from '@/app/api/activity/route'
import { broadcastDeliveryUpdated, broadcastDashboardUpdated } from '@/lib/realtime'
import {
  isValidStatusTransition,
  updateOrderAndProjectActuals,
  DeliveryStatus
} from '@/lib/delivery-sync'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, context: any) {
  try {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  const companyId = session.companyId
    const id = context?.params?.id
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRe.test(String(id))) {
      return NextResponse.json({ error: 'Invalid id format (expected UUID)' }, { status: 400 })
    }

    const sb = supabaseService()
    const { data: delivery, error } = await sb
      .from('deliveries')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .single()

    if (error || !delivery) return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 })

    const [itemsRes, photosRes] = await Promise.all([
      sb.from('delivery_items').select('id,description,qty,unit,sku,partial').eq('company_id', companyId).eq('delivery_id', id),
      sb.from('photos').select('id,url').eq('company_id', companyId).eq('entity', 'delivery').eq('entity_id', id),
    ])

    const base: any = delivery || {}
    const body = {
      ...base,
      items: (itemsRes.data as any[]) || [],
      photos: (photosRes.data as any[]) || [],
    }
    return NextResponse.json(body)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionProfile()
    if (!session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'No company' }, { status: 400 })
    }

    // Enforce manager role for status changes
    try {
      enforceRole('manager', session)
    } catch (e) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const deliveryId = params.id
    const body = await req.json()

    const {
      status,
      driver_name,
      vehicle_number,
      signer_name,
      signature_url,
      notes
    } = body

    const sb = supabaseService()

    // Step 1: Get current delivery
    const { data: currentDelivery, error: fetchError } = await (sb as any)
      .from('deliveries')
      .select(`*`)
      .eq('id', deliveryId)
      .eq('company_id', session.companyId)
      .single()

    if (fetchError || !currentDelivery) {
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      )
    }

    // Step 2: If status is being changed, validate transition
    let updateData: Record<string, any> = {}
    if (status && status !== currentDelivery.status) {
      // Check if delivery is locked (already delivered)
      if (currentDelivery.status === 'delivered' && session.role !== 'admin') {
        return NextResponse.json(
          {
            error: 'Delivered records are locked and cannot be modified',
            code: 'DELIVERY_LOCKED'
          },
          { status: 403 }
        )
      }

      // Validate state transition
      if (!isValidStatusTransition(currentDelivery.status as DeliveryStatus, status as DeliveryStatus)) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${currentDelivery.status} to ${status}`,
            code: 'INVALID_STATUS_TRANSITION',
            current_status: currentDelivery.status,
            requested_status: status
          },
          { status: 400 }
        )
      }

      updateData.status = status
      updateData.updated_at = new Date().toISOString()

      // Set delivered_at when marking delivered
      if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString()
      }
    }

    // Step 3: Update optional fields
    if (driver_name !== undefined) updateData.driver_name = driver_name
    if (vehicle_number !== undefined) updateData.vehicle_number = vehicle_number
    if (signer_name !== undefined) updateData.signer_name = signer_name
    if (signature_url !== undefined) updateData.signature_url = signature_url
    if (notes !== undefined) updateData.notes = notes

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Step 4: Update delivery
    const { data: updatedDelivery, error: updateError } = await (sb as any)
      .from('deliveries')
      .update(updateData)
      .eq('id', deliveryId)
      .eq('company_id', session.companyId)
      .select(`*`)
      .single()

    if (updateError || !updatedDelivery) {
      console.error('Error updating delivery:', updateError)
      return NextResponse.json(
        { error: 'Failed to update delivery' },
        { status: 500 }
      )
    }

    // Step 5: If status changed, sync order and project
    if (status && status !== currentDelivery.status) {
      await updateOrderAndProjectActuals(
        deliveryId,
        session.companyId,
        session.user.id
      )
    }

    // Step 6: Log activity
    const changes: Record<string, any> = {}
    if (status && status !== currentDelivery.status) {
      changes.status_changed = {
        from: currentDelivery.status,
        to: status
      }
    }
    if (driver_name !== undefined) changes.driver_name = driver_name
    if (vehicle_number !== undefined) changes.vehicle_number = vehicle_number
    if (signer_name !== undefined) changes.signer_name = signer_name
    if (signature_url !== undefined) changes.signature_url = !!signature_url
    if (notes !== undefined) changes.notes = notes

    await audit(
      session.companyId,
      session.user.id,
      'delivery',
      deliveryId,
      'updated',
      changes
    )

    // Log to new Activity Log system
    if (status && status !== currentDelivery.status) {
      try {
        const statusActions: Record<string, string> = {
          'pending': 'created',
          'partial': 'status_changed',
          'delivered': 'completed'
        }
        
        const statusTitles: Record<string, string> = {
          'pending': 'Delivery marked as Pending',
          'partial': 'Delivery In Transit',
          'delivered': 'Delivery Completed'
        }
        
        const statusDescriptions: Record<string, string> = {
          'pending': `Delivery status changed to Pending`,
          'partial': `Delivery is now In Transit${driver_name ? ` (Driver: ${driver_name})` : ''}${vehicle_number ? ` - Vehicle: ${vehicle_number}` : ''}`,
          'delivered': `Delivery completed and signed off${signer_name ? ` by ${signer_name}` : ''}`
        }

        await logActivity({
          type: 'delivery',
          action: statusActions[status] || 'updated',
          title: statusTitles[status] || `Delivery status changed to ${status}`,
          description: statusDescriptions[status] || `Delivery #${updatedDelivery.delivery_number || deliveryId.substring(0, 8)} status updated`,
          entity_type: 'delivery',
          entity_id: deliveryId,
          metadata: {
            delivery_id: deliveryId,
            delivery_number: updatedDelivery.delivery_number,
            order_id: updatedDelivery.order_id,
            project_id: updatedDelivery.project_id,
            status_from: currentDelivery.status,
            status_to: status,
            driver_name: driver_name || updatedDelivery.driver_name,
            vehicle_number: vehicle_number || updatedDelivery.vehicle_number,
            signer_name: signer_name || updatedDelivery.signer_name,
          },
          status: status === 'delivered' ? 'success' : 'pending',
          user_id: session.user.id,
          company_id: session.companyId,
        })
        console.log('✅ Delivery activity logged successfully for status:', status)
      } catch (activityError: any) {
        console.error('⚠️ Failed to log delivery activity:', activityError)
        // Don't fail the request if activity logging fails
      }
    }

    // Step 7: Broadcast updates
    await Promise.all([
      broadcastDeliveryUpdated(deliveryId, ['updated']),
      broadcastDashboardUpdated(session.companyId)
    ])

    return NextResponse.json(
      {
        ok: true,
        data: updatedDelivery
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('PATCH /api/deliveries/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionProfile()
    if (!session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'No company' }, { status: 400 })
    }

    // Only admins can delete
    try {
      enforceRole('admin', session)
    } catch (e) {
      return NextResponse.json({ error: 'Only admins can delete deliveries' }, { status: 403 })
    }

    const deliveryId = params.id
    const sb = supabaseService()

    // Get delivery before deleting
    const { data: delivery, error: fetchError } = await (sb as any)
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .eq('company_id', session.companyId)
      .single()

    if (fetchError || !delivery) {
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      )
    }

    // Soft delete - mark as archived
    const { error: deleteError } = await (sb as any)
      .from('deliveries')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', deliveryId)
      .eq('company_id', session.companyId)

    if (deleteError) {
      console.error('Error archiving delivery:', deleteError)
      return NextResponse.json(
        { error: 'Failed to archive delivery' },
        { status: 500 }
      )
    }

    // Resync order and project
    if (delivery.order_id || delivery.project_id) {
      await updateOrderAndProjectActuals(
        deliveryId,
        session.companyId,
        session.user.id
      )
    }

    // Log activity
    await audit(
      session.companyId,
      session.user.id,
      'delivery',
      deliveryId,
      'archived',
      { previous_status: delivery.status }
    )

    // Log to new Activity Log system
    await logActivity({
      type: 'delivery',
      action: 'deleted',
      title: `Delivery archived`,
      description: `Delivery #${delivery.delivery_number || deliveryId.substring(0, 8)} was archived (soft delete)`,
      entity_type: 'delivery',
      entity_id: deliveryId,
      metadata: {
        delivery_id: deliveryId,
        delivery_number: delivery.delivery_number,
        order_id: delivery.order_id,
        project_id: delivery.project_id,
        previous_status: delivery.status,
        driver_name: delivery.driver_name,
        vehicle_number: delivery.vehicle_number,
      },
      status: 'success',
      user_id: session.user.id,
      company_id: session.companyId,
    })

    // Broadcast updates
    await Promise.all([
      broadcastDeliveryUpdated(deliveryId, ['archived']),
      broadcastDashboardUpdated(session.companyId)
    ])

    return NextResponse.json(
      { ok: true, message: 'Delivery archived' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('DELETE /api/deliveries/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
