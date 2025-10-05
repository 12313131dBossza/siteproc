import { NextResponse } from 'next/server'
import { sbServer } from '@/lib/sbServer'

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

    const body = await request.json()
    const { 
      order_number, 
      supplier, 
      order_date, 
      expected_delivery,
      total_amount,
      po_number,
      notes,
      items 
    } = body

    // Validate required fields
    if (!order_number || !supplier || !order_date || !expected_delivery || !total_amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        order_number,
        supplier,
        order_date,
        expected_delivery,
        total_amount,
        po_number,
        notes,
        status: 'pending',
        delivery_status: 'pending',
        quantity_delivered: 0
      }])
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return NextResponse.json(
        { error: 'Failed to create order', details: orderError.message },
        { status: 500 }
      )
    }

    // Create order items if provided
    if (items && items.length > 0) {
      const orderItems = items.map((item: any) => ({
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
        // Don't fail the whole request, order was created
      }
    }

    return NextResponse.json({ 
      success: true,
      order,
      message: 'Order created successfully'
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
