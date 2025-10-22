import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Bypass auth - direct fetch with service role (for testing only)
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE
    
    if (!supabaseUrl || !serviceRole) {
      return NextResponse.json({
        ok: false,
        error: 'Missing environment variables'
      }, { status: 500 })
    }
    
    // Create admin client (bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Get all orders for your company
    const { data: orders, error } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        project_id,
        amount,
        description,
        category,
        vendor,
        product_name,
        quantity,
        unit_price,
        status,
        created_at,
        projects!inner(
          id,
          name,
          company_id
        )
      `)
      .eq('projects.company_id', 'e39d2f43-c0b7-4d87-bc88-9979448447c8')
      .order('created_at', { ascending: false })
    
    if (error) {
      return NextResponse.json({
        ok: false,
        error: error.message,
        details: error
      }, { status: 500 })
    }
    
    return NextResponse.json({
      ok: true,
      count: orders?.length || 0,
      data: orders,
      message: `Found ${orders?.length || 0} orders for company e39d2f43-c0b7-4d87-bc88-9979448447c8`
    })
    
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message
    }, { status: 500 })
  }
}
