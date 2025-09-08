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
import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { audit } from '@/lib/audit'
import { appBaseUrl, parseJson } from '@/lib/api'
import { getSessionProfile, enforceRole } from '@/lib/auth'
import { changeOrderCreateSchema } from '@/lib/validation'
import { broadcastDashboardUpdated } from '@/lib/realtime'
import { sendEmail, getFromAddress } from '@/lib/email'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getSessionProfile()
  try { enforceRole('viewer', session) } catch (e: any) { return e as any }
  const companyId = session.companyId as string
  const actorId = session.user?.id
  const payload = await parseJson(req, changeOrderCreateSchema)
  const sb = supabaseService()
  const token = crypto.randomUUID()

    const { data: co, error } = await (sb as any)
      .from('change_orders')
      .insert({
      company_id: companyId,
      job_id: payload.job_id,
      description: payload.description,
      cost_delta: payload.cost_delta,
      approver_email: payload.approver_email,
      public_token: token,
    })
    .select('*')
    .single()

  if (error || !co) return NextResponse.json({ error: error?.message || 'failed' }, { status: 500 })

  const approveUrl = `${appBaseUrl()}/api/change-orders/public/${token}/approve`
  await sendEmail({
    to: payload.approver_email,
    from: getFromAddress(),
    subject: 'Change Order Approval Request',
    text: `Approve here: ${approveUrl}`,
  })

  await audit(companyId, actorId || null, 'change_order', co.id as string, 'create', { approver_email: payload.approver_email })

  try { await broadcastDashboardUpdated(companyId) } catch {}
  return NextResponse.json({ id: co.id, public_token: token })
}

export async function GET(req: NextRequest) {
  try {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  const companyId = session.companyId
    const url = new URL(req.url)
    const jobId = url.searchParams.get('job_id')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 300)
    const sb = supabaseService()
    let query = sb.from('change_orders').select('id,job_id,description,cost_delta,status,approver_email,approved_at,created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(limit)
    if (jobId) query = query.eq('job_id', jobId)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ items: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
