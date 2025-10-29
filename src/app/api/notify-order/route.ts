import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'
import { getCurrentUserProfile } from '@/lib/server-utils'

// Manually trigger an order approval notification
export async function POST(request: NextRequest) {
  try {
    const { profile, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated' 
      }, { status: 401 })
    }

    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Order ID required' 
      }, { status: 400 })
    }

    console.log('📬 Manual order notification for order:', orderId)

    // Use service client to get order details
    const supabase = createServiceClient()

    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        projects(name)
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ 
        success: false, 
        error: 'Order not found' 
      }, { status: 404 })
    }

    // Create notification
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: profile.id,
        company_id: profile.company_id,
        type: 'order_approved',
        title: '✅ Order Approved',
        message: `Your order #${order.order_number || orderId.slice(0, 8)} for ${order.projects?.name || 'project'} has been approved by ${profile.email}`,
        link: `/orders/${orderId}`,
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (notifError) {
      console.error('❌ Notification error:', notifError)
      return NextResponse.json({ 
        success: false, 
        error: notifError.message 
      }, { status: 500 })
    }

    console.log('✅ Manual notification created:', notification.id)

    return NextResponse.json({ 
      success: true, 
      notification,
      message: 'Notification sent! Check the bell icon.'
    })

  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
