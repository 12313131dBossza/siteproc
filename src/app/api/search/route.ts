import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/server-utils'

// Global search across all modules
export async function GET(request: NextRequest) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        ok: true,
        results: {
          orders: [],
          projects: [],
          deliveries: [],
          expenses: [],
          payments: [],
          products: []
        },
        total: 0
      })
    }

    const searchQuery = query.trim().toLowerCase()

    // Search Orders
    const { data: orders } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        order_number,
        description,
        vendor,
        amount,
        status,
        created_at,
        projects(id, name)
      `)
      .eq('company_id', profile.company_id)
      .or(`order_number.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,vendor.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`)
      .order('created_at', { ascending: false })
      .limit(5)

    // Search Projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, address, description, status, budget, actual_cost, created_at')
      .eq('company_id', profile.company_id)
      .or(`name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      .order('created_at', { ascending: false })
      .limit(5)

    // Search Deliveries
    const { data: deliveries } = await supabase
      .from('order_deliveries')
      .select(`
        id,
        delivery_number,
        status,
        delivery_date,
        notes,
        purchase_orders(
          order_number,
          projects(name)
        )
      `)
      .eq('company_id', profile.company_id)
      .or(`delivery_number.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`)
      .order('delivery_date', { ascending: false })
      .limit(5)

    // Search Expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select(`
        id,
        vendor,
        amount,
        category,
        description,
        status,
        expense_date,
        projects(id, name)
      `)
      .eq('company_id', profile.company_id)
      .or(`vendor.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,memo.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
      .order('expense_date', { ascending: false })
      .limit(5)

    // Search Payments
    const { data: payments } = await supabase
      .from('payments')
      .select(`
        id,
        vendor,
        amount,
        payment_method,
        reference_number,
        status,
        payment_date,
        projects(id, name)
      `)
      .eq('company_id', profile.company_id)
      .or(`vendor.ilike.%${searchQuery}%,reference_number.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`)
      .order('payment_date', { ascending: false })
      .limit(5)

    // Search Products
    const { data: products } = await supabase
      .from('products')
      .select('id, sku, name, category, description, unit_price, quantity')
      .eq('company_id', profile.company_id)
      .or(`sku.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
      .order('name')
      .limit(5)

    const results = {
      orders: orders || [],
      projects: projects || [],
      deliveries: deliveries || [],
      expenses: expenses || [],
      payments: payments || [],
      products: products || []
    }

    const total = Object.values(results).reduce((sum, arr) => sum + arr.length, 0)

    return NextResponse.json({
      ok: true,
      results,
      total,
      query: searchQuery
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
