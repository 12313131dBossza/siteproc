import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getIds, parseJson, requireRole } from '@/lib/api'
import { expenseCreateSchema } from '@/lib/validation'
import { broadcastExpenseUpdated, broadcast, broadcastDashboardUpdated } from '@/lib/realtime'
import { EVENTS } from '@/lib/constants'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
  const { companyId, role } = getIds(req)
  requireRole(role, 'bookkeeper')
  const payload = await parseJson(req, expenseCreateSchema)
    const sb = supabaseService()
    type InsertedExpense = { id: string; job_id: string }
    const { data, error } = await sb
      .from('expenses' as any)
      .insert({
        company_id: companyId,
        job_id: payload.job_id,
        supplier_id: payload.supplier_id || null,
        cost_code_id: payload.cost_code_id || null,
        amount: payload.amount,
        spent_at: payload.spent_at,
        memo: payload.memo || null,
      } as any)
      .select('id,job_id')
      .single<InsertedExpense>()
    if (error || !data) return NextResponse.json({ error: error?.message || 'create failed' }, { status: 500 })
    // granular expense channel + aggregated job channel
    await Promise.all([
      broadcastExpenseUpdated(data.id as string, ['create']),
      broadcast(`job:${data.job_id}`, EVENTS.JOB_EXPENSE_UPDATED, { kind: 'expense', job_id: data.job_id, expense_id: data.id, at: new Date().toISOString() }),
      broadcastDashboardUpdated(companyId || 'demo')
    ])
    return NextResponse.json({ id: data.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  const { companyId, role } = getIds(req)
  const url = new URL(req.url)
  const jobId = url.searchParams.get('job_id')
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200)
  const cursor = url.searchParams.get('cursor') // expecting created_at ISO
  const sb = supabaseService()
  let q = sb
    .from('expenses')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit + 1)
  if (jobId) q = (q as any).eq('job_id', jobId)
  // If no jobId, restrict to bookkeeper role
  if (!jobId && role !== 'bookkeeper') {
    return NextResponse.json({ error: 'job_id required' }, { status: 400 })
  }
  if (cursor) q = (q as any).lt('created_at', cursor)
  const { data, error } = await q as any
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const items = (data || []) as any[]
  let nextCursor: string | null = null
  if (items.length > limit) {
    const extra = items.pop()
    nextCursor = items[items.length - 1]?.created_at || extra?.created_at || null
  }
  return NextResponse.json({ items, nextCursor })
}
