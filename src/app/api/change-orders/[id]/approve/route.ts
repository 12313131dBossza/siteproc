import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } as any }
  )
  const coId = params.id

  const { data: co, error: coErr } = await supabase
    .from('change_orders')
    .select('id, order_id, proposed_qty, status, company_id, created_by')
    .eq('id', coId)
    .single()
  if (coErr || !co) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (co.status !== 'pending') return NextResponse.json({ error: 'already_decided' }, { status: 400 })

  const { data: od } = await supabase
    .from('order_delivery_totals')
    .select('ordered_qty, delivered_qty')
    .eq('order_id', co.order_id)
    .single()

  const delivered = Number(od?.delivered_qty ?? 0)
  const proposed = Number(co.proposed_qty)
  if (proposed < delivered) {
    return NextResponse.json({ error: 'proposed_less_than_delivered', detail: { proposed, delivered } }, { status: 400 })
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', co.order_id)
    .single()

  const newStatus = proposed === delivered
    ? 'delivered'
    : ((order as any)?.status === 'delivered' ? 'partially_delivered' : (order as any)?.status || 'approved')

  const up1 = await supabase
    .from('orders')
    .update({ qty: proposed, status: newStatus })
    .eq('id', co.order_id)
  if (up1.error) return NextResponse.json({ error: up1.error.message }, { status: 400 })

  const { data: user } = await supabase.auth.getUser()
  const uid = user?.user?.id
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const up2 = await supabase
    .from('change_orders')
    .update({ status: 'approved', decided_by: uid, decided_at: new Date().toISOString() })
    .eq('id', co.id)
  if (up2.error) return NextResponse.json({ error: up2.error.message }, { status: 400 })

  // TODO: email requester + admins
  return NextResponse.json({ ok: true })
}
