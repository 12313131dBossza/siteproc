/**
 * API endpoint for updating delivery status
 * PATCH /api/deliveries/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { audit } from '@/lib/audit'
import { getSessionProfile, enforceRole } from '@/lib/auth'
import { broadcastDeliveryUpdated, broadcastDashboardUpdated } from '@/lib/realtime'
import {
  isValidStatusTransition,
  updateOrderAndProjectActuals,
  DeliveryStatus
} from '@/lib/delivery-sync'

export const runtime = 'nodejs'

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

    // Enforce editor role for status changes
    enforceRole('editor', session)

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
      .select(`
        id,
        company_id,
        order_id,
        project_id,
        status,
        created_at,
        updated_at
      `)
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
      if (
        currentDelivery.status === 'delivered' &&
        session.userRole !== 'admin'
      ) {
        return NextResponse.json(
          {
            error: 'Delivered records are locked and cannot be modified',
            code: 'DELIVERY_LOCKED'
          },
          { status: 403 }
        )
      }

      // Validate state transition
      if (!isValidStatusTransition(currentDelivery.status, status)) {
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
    enforceRole('admin', session)

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
