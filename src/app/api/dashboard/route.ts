import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    const supabase = await sbServer()
    const { data: stats } = await supabase.from('dashboard_stats').select('*').single()
    const { data: events } = await supabase
      .from('events')
      .select('id, entity, verb, actor_id, created_at')
      .order('created_at',{ ascending:false })
      .limit(10)
    return NextResponse.json({
      stats: stats ? {
        activeProjects: stats.active_projects,
        pendingBids: stats.pending_bids,
        openDeliveries: stats.open_deliveries,
        unpaidInvoices: stats.unpaid_invoices,
      } : { activeProjects:0,pendingBids:0,openDeliveries:0,unpaidInvoices:0 },
      recentActivity: (events||[]).map(e=>({
        time: e.created_at,
        entity: e.entity,
        action: e.verb,
        by: e.actor_id || 'system'
      }))
    })
  } catch(e:any){
    return NextResponse.json({ error: e?.message||'failed'}, { status: 500 })
  }
}
