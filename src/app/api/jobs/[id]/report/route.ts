import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { renderJobReport } from 'pdf/jobReport'
import { computeJobKpis } from '@/lib/kpi'
import { getSessionProfile } from '@/lib/auth'
import { billsCsv, expensesCsv } from '@/lib/qb'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, context: any) {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  const jobId = context?.params?.id
  const format = (new URL(req.url).searchParams.get('format') || 'csv') as 'csv' | 'pdf' | 'json'
  const type = (new URL(req.url).searchParams.get('type') || 'expenses') as 'expenses' | 'bills'

  const sb = supabaseService()
  if (format === 'csv') {
    if (type === 'expenses') {
  const { data } = await sb.from('expenses').select('*').eq('company_id', session.companyId).eq('job_id', jobId)
      const csv = expensesCsv(data || [])
      return new NextResponse(csv, { headers: { 'content-type': 'text/csv' } })
    } else {
  const { data } = await sb.from('pos').select('*').eq('company_id', session.companyId).eq('job_id', jobId)
      const csv = billsCsv(data || [])
      return new NextResponse(csv, { headers: { 'content-type': 'text/csv' } })
    }
  }

  const kpis = await computeJobKpis(jobId)
  if (format === 'json') {
    return NextResponse.json({ job_id: jobId, kpis })
  }

  const pdfBuf = await renderJobReport(jobId, kpis)
  return new NextResponse(new Uint8Array(pdfBuf), { headers: { 'content-type': 'application/pdf' } })
}
