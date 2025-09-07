import { supabaseService } from '@/lib/supabase'

export interface JobKpis {
  rfq_cycles: number
  rfq_cycle_time_hours_avg: number | null
  rfq_cycle_time_hours_median: number | null
  on_time_delivery_pct: number | null
  deliveries_considered: number
}

function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a,b)=>a-b)
  const mid = Math.floor(sorted.length/2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2
}

export async function computeJobKpis(jobId: string): Promise<JobKpis> {
  const sb = supabaseService()
  // RFQ cycle times (RFQ created -> selected quote created)
  const [rfqsRes, selectedQuotesRes] = await Promise.all([
    sb.from('rfqs').select('id,created_at,job_id').eq('job_id', jobId),
    sb.from('quotes').select('id,rfq_id,created_at,status').eq('status','selected')
  ])
  const rfqs = rfqsRes.data || []
  const rfqCreatedAt: Record<string,string> = {}
  rfqs.forEach((r: any)=>{ if (r.id) rfqCreatedAt[r.id as string] = r.created_at as string })
  const cycles: number[] = []
  ;(selectedQuotesRes.data||[]).forEach((q: any) => {
    const rfqId = q.rfq_id as string | undefined
    if (!rfqId) return
    const start = rfqCreatedAt[rfqId]
    const end = q.created_at as string | undefined
    if (start && end) {
      const diffMs = new Date(end).getTime() - new Date(start).getTime()
      if (diffMs >= 0) cycles.push(diffMs / 1000 / 3600) // hours
    }
  })
  const rfq_cycles = cycles.length
  const rfq_cycle_time_hours_avg = rfq_cycles ? Number((cycles.reduce((a,b)=>a+b,0)/rfq_cycles).toFixed(2)) : null
  const rfq_cycle_time_hours_median = rfq_cycles ? Number((median(cycles) as number).toFixed(2)) : null

  // On-time deliveries (% delivered_at date <= needed_date)
  // Need mapping: delivery -> po -> rfq -> needed_date
  const posRes = await sb.from('pos').select('id,rfq_id,job_id').eq('job_id', jobId)
  const pos = posRes.data || []
  const rfqIds = Array.from(new Set(pos.map((p: any)=>p.rfq_id).filter(Boolean))) as string[]
  let rfqNeeded: Record<string,string> = {}
  if (rfqIds.length) {
    const needRes = await sb.from('rfqs').select('id,needed_date').in('id', rfqIds)
    ;(needRes.data||[]).forEach((r: any)=> { if (r.id && r.needed_date) rfqNeeded[r.id as string] = r.needed_date as string })
  }
  const deliveriesRes = await sb.from('deliveries').select('id,po_id,delivered_at,status').eq('job_id', jobId).eq('status','delivered')
  const deliveries = deliveriesRes.data || []
  const posRfqMap: Record<string,string> = {}
  pos.forEach((p: any)=> { if (p.id && p.rfq_id) posRfqMap[p.id as string] = p.rfq_id as string })
  let onTime = 0
  let considered = 0
  deliveries.forEach((d: any) => {
    const poId = d.po_id as string | undefined
    if (!poId) return
    const rfqId = posRfqMap[poId]
    if (!rfqId) return
    const needed = rfqNeeded[rfqId]
    const deliveredAt = (d as any).delivered_at as string | undefined
    if (!needed || !deliveredAt) return
    considered++
    if (new Date(deliveredAt).toISOString().slice(0,10) <= needed) onTime++
  })
  const on_time_delivery_pct = considered ? Number(((onTime/considered)*100).toFixed(1)) : null

  return { rfq_cycles, rfq_cycle_time_hours_avg, rfq_cycle_time_hours_median, on_time_delivery_pct, deliveries_considered: considered }
}
