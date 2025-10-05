import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'
import { syncOrderStatus } from '@/lib/orderSync'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { notes, delivered_at } = await request.json()
    const deliveryId = params.id

    if (!deliveryId) {
      return NextResponse.json(
        { success: false, error: 'Delivery ID is required' },
        { status: 400 }
      )
    }

    const supabase = await sbServer()

    // First, get the delivery to check current status and get order info
    const { data: delivery, error: fetchError } = await supabase
      .from('deliveries')
      .select('*, order_id')
      .eq('id', deliveryId)
      .single()

    if (fetchError || !delivery) {
      return NextResponse.json(
        { success: false, error: 'Delivery not found' },
        { status: 404 }
      )
    }

    // Check if delivery is already delivered
    if (delivery.status === 'delivered') {
      return NextResponse.json(
        { success: false, error: 'Delivery is already marked as delivered' },
        { status: 400 }
      )
    }

    // Update the delivery status to delivered
    const updateData: any = {
      status: 'delivered',
      updated_at: new Date().toISOString()
    }

    // Add notes if provided
    if (notes) {
      updateData.notes = notes
    }

    // Add delivered_at timestamp (check if column exists)
    if (delivered_at) {
      updateData.delivered_at = delivered_at
    }

    const { data: updatedDelivery, error: updateError } = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('id', deliveryId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating delivery:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update delivery status' },
        { status: 500 }
      )
    }

    // Sync order status automatically using the comprehensive sync function
    let orderSyncResult = null
    if (delivery.order_id) {
      try {
        orderSyncResult = await syncOrderStatus(supabase, delivery.order_id)
        console.log('Order synced successfully:', orderSyncResult)
      } catch (orderError) {
        console.warn('Error syncing order status:', orderError)
        // Don't fail the delivery update if order sync fails
      }
    }

    // Try to update project actuals if delivery is linked to a project
    try {
      // Calculate total cost from delivery items
      const { data: deliveryItems, error: itemsError } = await supabase
        .from('delivery_items')
        .select('*')
        .eq('delivery_id', deliveryId)

      if (!itemsError && deliveryItems && deliveryItems.length > 0) {
        const totalCost = deliveryItems.reduce((sum, item) => 
          sum + (item.quantity * item.unit_price), 0
        )

        // Try to find if this delivery is linked to a project
        const { data: projectDelivery, error: projectLinkError } = await supabase
          .from('project_deliveries')
          .select('project_id')
          .eq('delivery_id', deliveryId)
          .single()

        if (!projectLinkError && projectDelivery) {
          // Try to update project actuals using a stored procedure or direct update
          try {
            const { error: projectError } = await supabase.rpc('update_project_actuals', {
              p_project_id: projectDelivery.project_id,
              p_additional_cost: totalCost,
              p_delivery_id: deliveryId
            })

            if (projectError) {
              console.warn('Could not update project actuals via RPC:', projectError)
              // Try direct update as fallback - get current cost first
              const { data: project, error: projectFetchError } = await supabase
                .from('projects')
                .select('actual_cost')
                .eq('id', projectDelivery.project_id)
                .single()

              if (!projectFetchError && project) {
                const currentCost = project.actual_cost || 0
                const { error: directUpdateError } = await supabase
                  .from('projects')
                  .update({
                    actual_cost: currentCost + totalCost,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', projectDelivery.project_id)

                if (directUpdateError) {
                  console.warn('Could not update project actuals directly:', directUpdateError)
                }
              }
            }
          } catch (projectError) {
            console.warn('Error updating project actuals:', projectError)
          }
        }
      }
    } catch (projectError) {
      console.warn('Error in project actuals update:', projectError)
      // Don't fail the delivery update if project actuals update fails
    }

    return NextResponse.json({
      success: true,
      delivery: updatedDelivery,
      orderSync: orderSyncResult,
      message: orderSyncResult 
        ? `Delivery marked as delivered. Order status: ${orderSyncResult.status.toUpperCase()} (${orderSyncResult.percentComplete.toFixed(0)}% complete)`
        : 'Delivery marked as delivered successfully'
    })

  } catch (error) {
    console.error('Error in mark-delivered endpoint:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}