import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { audit } from '@/lib/audit'
import { parseJson } from '@/lib/api'
import { rfqCreateSchema } from '@/lib/validation'
import { broadcastDashboardUpdated } from '@/lib/realtime'
import { getSessionProfile, enforceRole } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  enforceRole('bookkeeper', session)
  const data = await parseJson(req, rfqCreateSchema)
    const sb = supabaseService()
    const token = crypto.randomUUID()

    const { data: rfq, error } = await (sb as any)
      .from('rfqs')
      .insert({
  company_id: session.companyId,
        job_id: data.job_id,
        title: data.title,
        needed_date: data.needed_date,
        public_token: token,
      } as any)
      .select('*')
      .single()

    if (error || !rfq) {
      return NextResponse.json({ error: error?.message || 'Failed to create RFQ' }, { status: 500 })
    }

    const items = data.items.map((it: typeof data.items[number]) => ({
  company_id: session.companyId,
      rfq_id: rfq.id,
      description: it.description,
      qty: it.qty,
      unit: it.unit,
      sku: it.sku,
    }))

  const { error: itemsErr } = await (sb as any).from('rfq_items').insert(items as any)
    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 })
    }

  await audit(session.companyId!, session.user.id, 'rfq', rfq.id as string, 'create', { item_count: items.length })
  try { await broadcastDashboardUpdated(session.companyId!) } catch {}

    return NextResponse.json({ id: rfq.id, public_token: token })
  } catch (err: any) {
    // Normalize thrown Response or generic errors to JSON
    if (err instanceof Response) {
      const status = (err as any).status || 400
      let text = ''
      try {
        text = await err.text()
      } catch {
        text = 'Bad Request'
      }
      return NextResponse.json({ error: text }, { status })
    }
    const status = err?.status || 500
    const message = err?.message || 'Internal Server Error'
    return NextResponse.json({ error: message }, { status })
  }
}

export async function GET(req: NextRequest) {
  try {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
    const url = new URL(req.url)
    const jobId = url.searchParams.get('job_id')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)
    const sb = supabaseService()
  let query = sb.from('rfqs').select('id,job_id,title,status,needed_date,created_at,public_token').eq('company_id', session.companyId).order('created_at', { ascending: false }).limit(limit)
    if (jobId) query = query.eq('job_id', jobId)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ items: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
