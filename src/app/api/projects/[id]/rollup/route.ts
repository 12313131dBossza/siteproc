import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase-service'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } as any }
  )
  const serviceSupabase = createServiceClient()
  const id = params.id
  console.log('Rollup API: fetching rollup for project ID:', id)

  try {
    // Load project with budget tracking columns - handle case where project doesn't exist
    const proj = await supabase
      .from('projects')
      .select('id, budget, company_id, status, actual_cost, variance')
      .eq('id', id)
      .maybeSingle()
    console.log('Rollup API: project query result - data:', proj.data, 'error:', proj.error)
    
    if (proj.error) {
      console.error('Rollup API: Database error:', proj.error)
      return NextResponse.json({ error: 'database_error: ' + proj.error.message }, { status: 500 })
    }
    
    if (!proj.data) {
      console.error('Rollup API: Project not found:', id)
      return NextResponse.json({ error: 'project_not_found' }, { status: 404 })
    }

    // Use database-calculated actual_cost (auto-synced via triggers)
    // This includes delivered_value from orders + all expenses
    const actual_cost = Number(proj.data.actual_cost || 0)
    
    // Legacy: actual_expenses for backwards compatibility (approved expenses only)
    const exp = await supabase
      .from('expenses')
      .select('amount, status', { count: 'exact' })
      .eq('project_id', id)
      .eq('status', 'approved')
    console.log('Rollup API: expenses query result - count:', exp.count, 'error:', exp.error)
    
    const actual_expenses = (exp.data || []).reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)

    // committed_orders: prefer total_estimated, else qty*unit_price if present, else 0
    // Use service client to bypass RLS for counting
    const ord = await serviceSupabase
      .from('purchase_orders')
      .select('amount, quantity, unit_price, company_id', { count: 'exact' })
      .eq('project_id', id)
    console.log('Rollup API: orders query result - count:', ord.count, 'error:', ord.error)
    console.log('Rollup API: orders data sample:', ord.data?.slice(0, 2))
    
    const committed_orders = (ord.data || []).reduce((sum: number, o: any) => {
      if (o.amount != null) return sum + Number(o.amount || 0)
      if (o.quantity != null && o.unit_price != null) return sum + Number(o.quantity) * Number(o.unit_price)
      return sum
    }, 0)

    const counts = {
      expenses: exp.count || 0,
      orders: ord.count || 0,
      deliveries: 0
    }
    // deliveries count
    const del = await supabase.from('deliveries').select('id', { count: 'exact', head: true }).eq('project_id', id)
    console.log('Rollup API: deliveries query result - count:', del.count, 'error:', del.error)
    counts.deliveries = del.count || 0

    const budget = Number((proj.data as any).budget || 0)
    const variance = Number(proj.data.variance || 0) // Use database-calculated variance
    
    const result = { 
      budget, 
      actual_cost,       // New: Auto-synced from orders + expenses via triggers
      actual_expenses,   // Legacy: Approved expenses only (for backwards compatibility)
      committed_orders, 
      variance,          // Database-calculated: budget - actual_cost
      counts 
    }
    console.log('Rollup API: returning result:', result)

    return NextResponse.json({ data: result })
  } catch (err: any) {
    console.error('Rollup API: Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 })
  }
}
