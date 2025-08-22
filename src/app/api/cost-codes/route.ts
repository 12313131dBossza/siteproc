import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getIds, parseJson } from '@/lib/api'
import { costCodeCreateSchema } from '@/lib/validation'
import { broadcast } from '@/lib/realtime'
import { EVENTS } from '@/lib/constants'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { companyId } = getIds(req)
    const body = await parseJson(req, costCodeCreateSchema)
    const sb = supabaseService()
    const { data, error } = await sb
      .from('cost_codes')
      .insert({ company_id: companyId, job_id: body.job_id || null, code: body.code, description: body.description || null })
      .select('id,job_id')
      .single()
    if (error || !data) return NextResponse.json({ error: error?.message || 'create failed' }, { status: 500 })
    if (data.job_id) {
  await broadcast(`job:${data.job_id}`, EVENTS.JOB_COST_CODE_UPDATED, { kind: 'cost_code', job_id: data.job_id, cost_code_id: data.id, at: new Date().toISOString() })
    }
    return NextResponse.json({ id: data.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  const { companyId } = getIds(req)
  const url = new URL(req.url)
  const jobId = url.searchParams.get('job_id')
  const limit = Math.min(Number(url.searchParams.get('limit') || 100), 300)
  const cursor = url.searchParams.get('cursor') // code ascending
  const sb = supabaseService()
  let q: any = sb.from('cost_codes').select('*').eq('company_id', companyId)
  if (jobId) q = q.eq('job_id', jobId)
  q = q.order('code', { ascending: true }).limit(limit + 1)
  if (cursor) q = q.gt('code', cursor)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const items = (data || []) as any[]
  let nextCursor: string | null = null
  if (items.length > limit) {
    const extra = items.pop()
    nextCursor = items[items.length - 1]?.code || extra?.code || null
  }
  return NextResponse.json({ items, nextCursor })
}
