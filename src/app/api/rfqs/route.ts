import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { audit } from '@/lib/audit'
import { parseJson, getIds, requireRole } from '@/lib/api'
import { rfqCreateSchema } from '@/lib/validation'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
  const { companyId, actorId, role } = getIds(req)
  requireRole(role, 'foreman')
  const data = await parseJson(req, rfqCreateSchema)
    const sb = supabaseService()
    const token = crypto.randomUUID()

    const { data: rfq, error } = await sb
      .from('rfqs')
      .insert({
        company_id: companyId,
        job_id: data.job_id,
        title: data.title,
        needed_date: data.needed_date,
        public_token: token,
      })
      .select('*')
      .single()

    if (error || !rfq) {
      return NextResponse.json({ error: error?.message || 'Failed to create RFQ' }, { status: 500 })
    }

    const items = data.items.map((it: typeof data.items[number]) => ({
      company_id: companyId,
      rfq_id: rfq.id,
      description: it.description,
      qty: it.qty,
      unit: it.unit,
      sku: it.sku,
    }))

    const { error: itemsErr } = await sb.from('rfq_items').insert(items)
    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 })
    }

  await audit(companyId, actorId || null, 'rfq', rfq.id as string, 'create', { item_count: items.length })

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
    const { companyId } = getIds(req)
    const url = new URL(req.url)
    const jobId = url.searchParams.get('job_id')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)
    const sb = supabaseService()
    let query = sb.from('rfqs').select('id,job_id,title,status,needed_date,created_at,public_token').eq('company_id', companyId).order('created_at', { ascending: false }).limit(limit)
    if (jobId) query = query.eq('job_id', jobId)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ items: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
