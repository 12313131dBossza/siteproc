import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile, enforceRole } from '@/lib/auth'
import { billsCsv } from '@/lib/qb'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
  const session = await getSessionProfile()
  try { enforceRole('bookkeeper', session) } catch (e: any) { return e as any }
  const companyId = session.companyId as string
    const sb = supabaseService()
  const { data, error } = await sb.from('pos').select('created_at,supplier_id,po_number,total').eq('company_id', companyId).order('created_at',{ascending:false}).limit(1000) as any
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const csv = billsCsv(((data||[]) as any[]).map(r=> ({ ...r })))
    return new NextResponse(csv, { status:200, headers:{ 'content-type':'text/csv; charset=utf-8', 'content-disposition':'attachment; filename="bills.csv"' } })
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
