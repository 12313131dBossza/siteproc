import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'

/**
 * Debug endpoint for Products - uses service-role to bypass RLS
 * GET /api/products-debug - List last 20 products
 */
export async function GET() {
  try {
    const supabase = createServiceClient()
    
    // Get last 20 products
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        category,
        company_id,
        created_by,
        price,
        unit,
        stock_quantity,
        min_stock_level,
        reorder_point,
        status,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching products (debug):', error)
      return NextResponse.json({
        ok: false,
        error: error.message,
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      count: products.length,
      products
    })
  } catch (error: any) {
    console.error('Unexpected error in products-debug:', error)
    return NextResponse.json({
      ok: false,
      error: error.message
    }, { status: 500 })
  }
}
