import { sbServer } from '@/lib/supabase-server';
import RoleGate from '@/components/RoleGate';
import PageClient from './pageClient';
export const dynamic = 'force-dynamic';
export default async function Page(){
	type Row = { id:string; contractor:string|null; amount:number|null; status:string; submitted:string|null };
	let rows: Row[] = [];
	try {
		const supabase = await sbServer();
		const { data, error } = await supabase
			.from('bids')
			.select('id, contractor, amount, status, submitted:created_at')
			.order('created_at', { ascending:false });
		if(error) console.error('bids fetch error', error.message); else if(data){
			rows = data.map((b:any)=>({ id:b.id, contractor:b.contractor, amount:b.amount, status:b.status, submitted:b.submitted }));
		}
	} catch(e:any){ console.error('bids unexpected', e?.message||e); }
	return <RoleGate role="admin"><PageClient rows={rows} /></RoleGate>;
}
