import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getIds, requireRole } from '@/lib/api'
import { billsCsv } from '@/lib/qb'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { companyId, role } = getIds(req)
    requireRole(role, 'bookkeeper')
    const sb = supabaseService()
    const { data, error } = await sb.from('pos').select('created_at,supplier_id,po_number,total').eq('company_id', companyId).order('created_at',{ascending:false}).limit(1000)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const csv = billsCsv((data||[]).map(r=> ({ ...r })))
    return new NextResponse(csv, { status:200, headers:{ 'content-type':'text/csv; charset=utf-8', 'content-disposition':'attachment; filename="bills.csv"' } })
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
