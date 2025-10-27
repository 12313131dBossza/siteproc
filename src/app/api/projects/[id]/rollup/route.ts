import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } as any }
  )
  const id = params.id
  console.log('Rollup API: fetching rollup for project ID:', id)

  try {
    // Load project - handle case where project doesn't exist
    const proj = await supabase.from('projects').select('id, budget, company_id, status').eq('id', id).maybeSingle()
    console.log('Rollup API: project query result - data:', proj.data, 'error:', proj.error)
    
    if (proj.error) {
      console.error('Rollup API: Database error:', proj.error)
      return NextResponse.json({ error: 'database_error: ' + proj.error.message }, { status: 500 })
    }
    
    if (!proj.data) {
      console.error('Rollup API: Project not found:', id)
      return NextResponse.json({ error: 'project_not_found' }, { status: 404 })
    }

    // actual_expenses: approved expenses on this project
    const exp = await supabase
      .from('expenses')
      .select('amount, status', { count: 'exact' })
      .eq('project_id', id)
      .eq('status', 'approved')
    console.log('Rollup API: expenses query result - count:', exp.count, 'error:', exp.error)
    
    const actual_expenses = (exp.data || []).reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)

    // committed_orders: prefer total_estimated, else qty*unit_price if present, else 0
    const ord = await supabase
      .from('purchase_orders')
      .select('total_estimated, qty, unit_price', { count: 'exact' })
      .eq('project_id', id)
    console.log('Rollup API: orders query result - count:', ord.count, 'error:', ord.error)
    console.log('Rollup API: orders data sample:', ord.data?.slice(0, 2))
    
    const committed_orders = (ord.data || []).reduce((sum: number, o: any) => {
      if (o.total_estimated != null) return sum + Number(o.total_estimated || 0)
      if (o.qty != null && o.unit_price != null) return sum + Number(o.qty) * Number(o.unit_price)
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
    const variance = budget - actual_expenses
    
    const result = { budget, actual_expenses, committed_orders, variance, counts }
    console.log('Rollup API: returning result:', result)

    return NextResponse.json({ data: result })
  } catch (err: any) {
    console.error('Rollup API: Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 })
  }
}
