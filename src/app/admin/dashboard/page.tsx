export const dynamic = 'force-dynamic';
import RoleGate from '@/components/RoleGate';
import DashboardPageClient, { DashboardData } from './pageClient';
import { sbServer } from '@/lib/supabase-server';
import { getSessionProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminDashboardPage(){
  const session = await getSessionProfile();
  if(!session.user) redirect('/login');
  if(!session.companyId) redirect('/onboarding');
  let data: DashboardData = {
    stats: { activeProjects:0, pendingBids:0, openDeliveries:0, unpaidInvoices:0 },
    recentActivity: [],
    openItems: []
  };
  try {
    const supabase = await sbServer();
    // Aggregated stats view
    const { data: statsView } = await supabase.from('dashboard_stats').select('*').single();
    if(statsView){
      data.stats.activeProjects = statsView.active_projects;
      data.stats.pendingBids = statsView.pending_bids;
      data.stats.openDeliveries = statsView.open_deliveries;
      data.stats.unpaidInvoices = statsView.unpaid_invoices;
    }

    // Recent activity from events table (latest 10)
    const { data: events, error: eventsErr } = await supabase
      .from('events')
      .select('id, entity, verb, actor_id, created_at')
      .order('created_at',{ ascending:false })
      .limit(10);
    let dels: any[] | null = null;
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
    const { data: delsData } = await supabase.from('deliveries').select('id,status').not('status','eq','delivered').limit(5);
    dels = delsData || [];
    if(coPending){
      openItems.push(...coPending.map(c=>({ type:'Change Order', project: c.job_id?.slice(0,6), due: '-', status: c.status, action:'Review' })));
    }
    if(dels){
      openItems.push(...dels.map(d=>({ type:'Delivery', project: d.id.slice(0,6), due: '-', status: d.status, action:'Check In' })));
    }
    data.openItems = openItems;
  } catch(e:any){
    console.error('dashboard fetch error', e?.message||e);
  }
  return <RoleGate role="admin"><DashboardPageClient data={data} /></RoleGate>;
}
