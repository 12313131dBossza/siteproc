import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'

/**
 * Debug endpoint for Orders - uses service-role to bypass RLS
 * GET /api/orders-debug - List last 20 orders
 */
export async function GET() {
  try {
    const supabase = createServiceClient()
    
    // Get last 20 orders from purchase_orders table
    const { data: orders, error } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        project_id,
        company_id,
        created_by,
        amount,
        vendor,
        product_name,
        quantity,
        unit_price,
        status,
        requested_by,
        requested_at,
        approved_by,
        approved_at,
        rejected_by,
        rejected_at,
        delivery_progress,
        ordered_qty,
        delivered_qty,
        remaining_qty,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching orders (debug):', error)
      return NextResponse.json({
        ok: false,
        error: error.message,
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      count: orders.length,
      orders
    })
  } catch (error: any) {
    console.error('Unexpected error in orders-debug:', error)
    return NextResponse.json({
      ok: false,
      error: error.message
    }, { status: 500 })
  }
}
