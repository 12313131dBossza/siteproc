import { sbServer } from "@/lib/supabase-server";
import RoleGate from '@/components/RoleGate';
import PageClient from './pageClient';
export const dynamic = 'force-dynamic';
export default async function Page(){
  type Row = { id:string; status:string; eta:string|null; carrier:string|null; job_id:string|null };
  let rows: Row[] = [];
  try {
    const supabase = await sbServer();
    const { data, error } = await supabase
      .from('deliveries')
      .select('id, status, eta:delivered_at, carrier:signer_name, job_id')
      .order('delivered_at', { ascending:false });
    if(error) console.error('deliveries fetch error', error.message); else if(data){
      rows = data.map((d:any)=>({ id:d.id, status:d.status, eta:d.eta, carrier:d.carrier, job_id:d.job_id }));
    }
  } catch(e:any){ console.error('deliveries unexpected', e?.message||e); }
  return <RoleGate role="admin"><PageClient rows={rows} /></RoleGate>;
}
