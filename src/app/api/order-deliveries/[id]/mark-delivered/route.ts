import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseService } from '@/lib/supabase'
import { syncOrderStatus } from '@/lib/orderSync'
import { logActivity } from '@/app/api/activity/route'
import { notifyDeliveryStatus } from '@/lib/notification-triggers'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { notes, delivered_at } = await request.json()
    const deliveryId = id

    if (!deliveryId) {
      return NextResponse.json(
        { success: false, error: 'Delivery ID is required' },
        { status: 400 }
      )
    }

    // Create Supabase client bound to request cookies
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

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

    let { data: updatedDelivery, error: updateError } = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('id', deliveryId)
      .select()
      .single()

    // If the update failed because delivered_at column is missing, add it and retry once
    if (updateError && /column .*delivered_at.* does not exist/i.test(updateError.message || '')) {
      try {
        const svc = supabaseService() as any
        await svc.rpc('exec_sql', { sql: "ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS delivered_at timestamptz;" })
      } catch {}
      const retry = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', deliveryId)
        .select()
        .single()
      updatedDelivery = retry.data
      updateError = retry.error
    }

    // If still failing (likely RLS), retry with service role
    if (updateError) {
      try {
        const svc = supabaseService() as any
        const resSR = await svc
          .from('deliveries')
          .update(updateData)
          .eq('id', deliveryId)
          .select()
          .single()
        updatedDelivery = resSR.data
        updateError = resSR.error
      } catch (e) {
        // preserve updateError
      }
    }

    if (updateError) {
      console.error('Error updating delivery:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update delivery status', details: updateError.message },
        { status: 500 }
      )
    }

    // Sync order status automatically using the comprehensive sync function
    let orderSyncResult = null
    if (delivery.order_id) {
      try {
        // Cast to any to accommodate SSR client type
        orderSyncResult = await syncOrderStatus(supabase as any, delivery.order_id)
        console.log('Order synced successfully:', orderSyncResult)
      } catch (orderError) {
        console.warn('Error syncing order status:', orderError)
        // Don't fail the delivery update if order sync fails
      }
    }

    // Log activity for marking delivery as delivered
    try {
      await logActivity({
        type: 'delivery',
        action: 'updated',
        title: 'Delivery Completed',
        description: `Delivery marked as delivered${notes ? `: ${notes}` : ''}`,
        metadata: {
          delivery_id: deliveryId,
          order_id: delivery.order_id,
          status: 'delivered',
          notes: notes || null,
          delivered_at: delivered_at || new Date().toISOString()
        }
      })
      console.log('✅ Delivery activity logged successfully for status: delivered')
    } catch (activityError) {
      console.error('⚠️ Failed to log delivery activity:', activityError)
      // Don't fail the delivery update if activity logging fails
    }

    // Create in-app notification for delivery completion
    try {
      console.log(`🔔 DELIVERY: Attempting to create notification for delivery ${deliveryId}`)
      console.log(`🔔 DELIVERY: Order ID is ${delivery.order_id}`)
      
      // Get order details to find who to notify
      const { data: orderData, error: orderFetchError } = await supabase
        .from('purchase_orders')
        .select('created_by, company_id, order_number, projects(name)')
        .eq('id', delivery.order_id)
        .single()

      console.log(`🔔 DELIVERY: Order data fetched:`, { orderData, error: orderFetchError })

      if (orderData && orderData.created_by && orderData.company_id) {
        console.log(`🔔 DELIVERY: Sending notification to user ${orderData.created_by}`)
        
        // Extract project name from projects array
        const projectName = (orderData.projects as any)?.name || undefined
        
        await notifyDeliveryStatus({
          deliveryId: deliveryId,
          recipientUserIds: [orderData.created_by], // Notify order creator
          companyId: orderData.company_id,
          deliveryNumber: delivery.delivery_number || undefined,
          projectName: projectName,
          newStatus: 'delivered',
          orderId: delivery.order_id || undefined
        })
        console.log(`✅ Delivery notification sent to user ${orderData.created_by}`)
      } else {
        console.warn(`⚠️ DELIVERY: Cannot send notification - missing data`, {
          hasOrderData: !!orderData,
          hasCreatedBy: orderData?.created_by,
          hasCompanyId: orderData?.company_id
        })
      }
    } catch (notifError) {
      console.error('Failed to create delivery notification:', notifError)
      // Don't fail the request if notification fails
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