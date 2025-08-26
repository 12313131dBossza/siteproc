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
