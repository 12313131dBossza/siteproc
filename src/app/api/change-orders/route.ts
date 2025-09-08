import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('orderId')
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } as any }
  )

  if (!orderId) return NextResponse.json({ error: 'orderId_required' }, { status: 400 })

  const { data, error } = await supabase
    .from('change_orders')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } as any }
  )
  const body = await req.json().catch(() => ({}))
  const { order_id, proposed_qty, reason } = body as { order_id?: string; proposed_qty?: number; reason?: string }

  if (!order_id || !proposed_qty || proposed_qty <= 0) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  }

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, company_id, status')
    .eq('id', order_id)
    .single()
  if (orderErr || !order) return NextResponse.json({ error: 'order_not_found' }, { status: 404 })

  if (!['approved', 'partially_delivered'].includes(order.status as any)) {
    return NextResponse.json({ error: 'invalid_order_state' }, { status: 400 })
  }

  const { data: user } = await supabase.auth.getUser()
  const uid = user?.user?.id
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const payload = {
    order_id,
    proposed_qty,
    reason: reason ?? null,
    status: 'pending',
    created_by: uid,
    company_id: order.company_id,
  }

  const { data: co, error } = await supabase
    .from('change_orders')
    .insert(payload)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // TODO: notify admins
  return NextResponse.json({ data: co })
}
