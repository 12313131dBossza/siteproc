export const dynamic = 'force-dynamic';
import RoleGate from '@/components/RoleGate';
import DashboardPageClient, { DashboardData } from './pageClient';
import { sbServer } from '@/lib/supabase-server';

export default async function AdminDashboardPage(){
  let data: DashboardData = {
    stats: { activeProjects:0, pendingBids:0, openDeliveries:0, unpaidInvoices:0 },
    recentActivity: [],
    openItems: []
  };
  try {
    const supabase = await sbServer();
    // Jobs -> active projects (no status column yet, so count all)
    const { data: jobs, error: jobsErr } = await supabase.from('jobs').select('id');
    if(!jobsErr && jobs) data.stats.activeProjects = jobs.length;

    // Quotes with status submitted => treat as pending bids
    const { data: quotes, error: quotesErr } = await supabase.from('quotes').select('id,status').eq('status','submitted');
    if(!quotesErr && quotes) data.stats.pendingBids = quotes.length;

    // Deliveries not delivered
    const { data: dels, error: delsErr } = await supabase.from('deliveries').select('id,status').not('status','eq','delivered');
    if(!delsErr && dels) data.stats.openDeliveries = dels.length;

    // POs not complete => unpaid invoices proxy (until dedicated invoices table)
    const { data: pos, error: posErr } = await supabase.from('pos').select('id,status').neq('status','complete');
    if(!posErr && pos) data.stats.unpaidInvoices = pos.length;

    // Recent activity from events table (latest 10)
    const { data: events, error: eventsErr } = await supabase
      .from('events')
      .select('id, entity, verb, actor_id, created_at')
      .order('created_at',{ ascending:false })
      .limit(10);
    if(!eventsErr && events){
      data.recentActivity = events.map(e=>({
        time: new Date(e.created_at).toLocaleString(),
        entity: e.entity,
        action: e.verb,
        by: e.actor_id?.slice(0,8) || 'system'
      }));
    }

    // Open Items: combine pending change orders + undelivered deliveries (limit few each)
    const openItems: any[] = [];
    const { data: coPending } = await supabase.from('change_orders').select('id, job_id, status, created_at').eq('status','pending').limit(5);
    if(coPending){
      openItems.push(...coPending.map(c=>({ type:'Change Order', project: c.job_id?.slice(0,6), due: '-', status: c.status, action:'Review' })));
    }
    if(dels){
      openItems.push(...dels.slice(0,5).map(d=>({ type:'Delivery', project: d.id.slice(0,6), due: '-', status: d.status, action:'Check In' })));
    }
    data.openItems = openItems;
  } catch(e:any){
    console.error('dashboard fetch error', e?.message||e);
  }
  return <RoleGate role="admin"><DashboardPageClient data={data} /></RoleGate>;
}
