import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { renderJobReport } from 'pdf/jobReport'
import { computeJobKpis } from '@/lib/kpi'
import { getIds } from '@/lib/api'
import { billsCsv, expensesCsv } from '@/lib/qb'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { companyId } = getIds(req)
  const jobId = params.id
  const format = (new URL(req.url).searchParams.get('format') || 'csv') as 'csv' | 'pdf' | 'json'
  const type = (new URL(req.url).searchParams.get('type') || 'expenses') as 'expenses' | 'bills'

  const sb = supabaseService()
  if (format === 'csv') {
    if (type === 'expenses') {
      const { data } = await sb.from('expenses').select('*').eq('company_id', companyId).eq('job_id', jobId)
      const csv = expensesCsv(data || [])
      return new NextResponse(csv, { headers: { 'content-type': 'text/csv' } })
    } else {
      const { data } = await sb.from('pos').select('*').eq('company_id', companyId).eq('job_id', jobId)
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
