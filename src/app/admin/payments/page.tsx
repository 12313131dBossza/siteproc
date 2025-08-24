import { sbServer } from '@/lib/supabase-server';
import RoleGate from '@/components/RoleGate';
import PageClient from './pageClient';
export const dynamic = 'force-dynamic';
export default async function Page(){
	type Row = { id:string; project_id:string|null; amount:number|null; due:string|null; status:string };
	let rows: Row[] = [];
	try {
		const supabase = await sbServer();
		const { data, error } = await supabase
			.from('payments')
			.select('id, project_id, amount, due:due_date, status')
			.order('due_date', { ascending:false });
		if(error) console.error('payments fetch error', error.message); else if(data){
			rows = data.map((p:any)=>({ id:p.id, project_id:p.project_id, amount:p.amount, due:p.due, status:p.status }));
		}
	} catch(e:any){ console.error('payments unexpected', e?.message||e); }
	return <RoleGate role="admin"><PageClient rows={rows} /></RoleGate>;
}
