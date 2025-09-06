import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile, enforceRole } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { sendDeliveryNotifications } from '@/lib/notifications'
import { z } from 'zod'

export const runtime = 'nodejs'

// Validation schema for creating deliveries
const createDeliverySchema = z.object({
  order_id: z.string().uuid(),
  product_id: z.string().uuid(),
  delivered_qty: z.number().positive(),
  delivered_at: z.string().transform((str) => new Date(str)),
  note: z.string().optional(),
  proof_url: z.string().url().optional(),
  supplier_id: z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionProfile()
    if (!session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!session.companyId) return NextResponse.json({ error: 'Company required' }, { status: 400 })
    
    // Only bookkeeper and above can record deliveries
    enforceRole('bookkeeper', session)

    const body = await req.json()
    const validatedData = createDeliverySchema.parse(body)

    const sb = supabaseService()

    // Verify the order belongs to the company and get order details
    const { data: order, error: orderError } = await sb
      .from('orders')
      .select('id, status, company_id')
      .eq('id', validatedData.order_id)
      .eq('company_id', session.companyId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify the product exists and belongs to the order
    const { data: orderItem, error: itemError } = await (sb as any)
      .from('order_items')
      .select('product_id, ordered_qty, delivered_qty')
      .eq('order_id', validatedData.order_id)
      .eq('product_id', validatedData.product_id)
      .single()

    if (itemError || !orderItem) {
      return NextResponse.json({ error: 'Product not found in order' }, { status: 404 })
    }

    // Check if delivery quantity would exceed remaining quantity
    const remainingQty = orderItem.ordered_qty - (orderItem.delivered_qty || 0)
    if (validatedData.delivered_qty > remainingQty) {
      return NextResponse.json({ 
        error: `Delivery quantity (${validatedData.delivered_qty}) exceeds remaining quantity (${remainingQty})` 
      }, { status: 400 })
    }

    // Create the delivery record
    const { data: delivery, error: deliveryError } = await (sb as any)
      .from('deliveries')
      .insert({
        order_id: validatedData.order_id,
        product_id: validatedData.product_id,
        delivered_qty: validatedData.delivered_qty,
        delivered_at: validatedData.delivered_at,
        note: validatedData.note,
        proof_url: validatedData.proof_url,
        supplier_id: validatedData.supplier_id,
        company_id: session.companyId,
        created_by: session.user.id,
      })
      .select(`
        *,
        orders(id, status, supplier_name, total_amount),
        products(name, sku, unit)
      `)
      .single()

    if (deliveryError || !delivery) {
      return NextResponse.json({ error: 'Failed to create delivery' }, { status: 500 })
    }

    // Log audit trail
    await audit(
      session.companyId,
      session.user.id,
      'delivery',
      delivery.id,
      'create',
      {
        order_id: validatedData.order_id,
        product_id: validatedData.product_id,
        delivered_qty: validatedData.delivered_qty,
      }
    )

    // Send email notifications for delivery creation
    await sendDeliveryNotifications(delivery.id, 'created')

    // Check if order is now fully delivered and send completion notification
    const { data: orderSummary } = await (sb as any)
      .from('order_delivery_summary')
      .select('*')
      .eq('order_id', validatedData.order_id)
      .single()

    if (orderSummary && orderSummary.is_fully_delivered) {
      await sendDeliveryNotifications(delivery.id, 'order_completed')
    }

    return NextResponse.json(delivery, { status: 201 })

  } catch (error) {
    console.error('Error creating delivery:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionProfile()
    if (!session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!session.companyId) return NextResponse.json({ error: 'Company required' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('order_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = (page - 1) * limit

    const sb = supabaseService()

    let query = (sb as any)
      .from('deliveries')
      .select(`
        *,
        orders(id, status, supplier_name, total_amount),
        products(name, sku, unit),
        profiles!created_by(full_name)
      `)
      .eq('company_id', session.companyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by order_id if provided
    if (orderId) {
      query = query.eq('order_id', orderId)
    }

    const { data: deliveries, error, count } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 })
    }

    // Get total count for pagination
    const { count: totalCount } = await (sb as any)
      .from('deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', session.companyId)
      .eq(orderId ? 'order_id' : 'company_id', orderId || session.companyId)

    return NextResponse.json({
      deliveries: deliveries || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    })

  } catch (error) {
    console.error('Error fetching deliveries:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
