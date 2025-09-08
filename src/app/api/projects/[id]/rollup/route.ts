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

  // Load project
  const proj = await supabase.from('projects').select('id, budget, company_id, status').eq('id', id).single()
  if (proj.error || !proj.data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // actual_expenses: approved expenses on this project
  const exp = await supabase
    .from('expenses')
    .select('amount, status', { count: 'exact' })
    .eq('project_id', id)
    .eq('status', 'approved')
  const actual_expenses = (exp.data || []).reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)

  // committed_orders: prefer total_estimated, else qty*unit_price if present, else 0
  const ord = await supabase
    .from('orders')
    .select('total_estimated, qty, unit_price', { count: 'exact' })
    .eq('project_id', id)
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
  counts.deliveries = del.count || 0

  const budget = Number((proj.data as any).budget || 0)
  const variance = budget - actual_expenses

  return NextResponse.json({ data: { budget, actual_expenses, committed_orders, variance, counts } })
}
