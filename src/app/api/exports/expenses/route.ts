import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getIds, requireRole } from '@/lib/api'
import { expensesCsv } from '@/lib/qb'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { companyId, role } = getIds(req)
    requireRole(role, 'bookkeeper')
    const sb = supabaseService()
    const { data, error } = await sb.from('expenses').select('spent_at,amount,memo,supplier_id,cost_code_id').eq('company_id', companyId).order('spent_at',{ascending:false}).limit(1000)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const csv = expensesCsv((data||[]).map(r=> ({ ...r })))
    return new NextResponse(csv, { status:200, headers:{ 'content-type':'text/csv; charset=utf-8', 'content-disposition':'attachment; filename="expenses.csv"' } })
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
