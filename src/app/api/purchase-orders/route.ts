import { NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await sbServer()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch orders with items
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          id,
          product_name,
          quantity,
          quantity_delivered,
          unit,
          unit_price,
          total_price
        )
      `)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Database error:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: ordersError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      orders: orders || []
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await sbServer()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's company_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const body = await request.json()
    console.log('Purchase order POST body:', body)

    // Support both formats: legacy (order_number, supplier) and new (vendor, product_name, qty)
    const vendor = body.vendor || body.supplier
    const product_name = body.product_name
    const qty = body.qty || body.quantity || 1
    const unit_price = body.unit_price || 0
    const status = body.status || 'pending'
    const project_id = body.project_id

    // Validate required fields
    if (!vendor) {
      return NextResponse.json(
        { error: 'Missing required field: vendor' },
        { status: 400 }
      )
    }

    // Generate order number if not provided
    const order_number = body.order_number || `PO-${Date.now().toString().slice(-8)}`
    const total_amount = qty * unit_price

    // Prepare order data
    const orderData: any = {
      order_number,
      supplier: vendor,
      order_date: body.order_date || new Date().toISOString().split('T')[0],
      expected_delivery: body.expected_delivery || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_amount,
      status,
      delivery_status: 'pending',
      quantity_delivered: 0,
    }

    // Add optional fields
    if (body.po_number) orderData.po_number = body.po_number
    if (body.notes) orderData.notes = body.notes
    if (project_id) orderData.project_id = project_id
    if (profile?.company_id) orderData.company_id = profile.company_id

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return NextResponse.json(
        { error: 'Failed to create order', details: orderError.message },
        { status: 500 }
      )
    }

    // Create order item if product_name provided
    if (product_name && order.id) {
      const { error: itemError } = await supabase
        .from('order_items')
        .insert([{
          order_id: order.id,
          product_name,
          quantity: qty,
          quantity_delivered: 0,
          unit: body.unit || 'units',
          unit_price,
          total_price: total_amount
        }])

      if (itemError) {
        console.error('Error creating order item:', itemError)
        // Don't fail - order was created successfully
      }
    }

    // Handle legacy items array format
    if (body.items && body.items.length > 0) {
      const orderItems = body.items.map((item: any) => ({
        order_id: order.id,
        product_name: item.product_name,
        quantity: item.quantity,
        quantity_delivered: 0,
        unit: item.unit || 'units',
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Error creating order items:', itemsError)
      }
    }

    return NextResponse.json({ 
      success: true,
      order,
      message: 'Purchase order created successfully'
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
