import { sbServer } from '@/lib/supabase-server';
import RoleGate from '@/components/RoleGate';
import PageClient from './pageClient';
export const dynamic = 'force-dynamic';
export default async function Page(){
	type Row = { id:string; name:string; contact:string|null; email:string|null; projects:number|null };
	let rows: Row[] = [];
	try {
		const supabase = await sbServer();
		const { data, error } = await supabase
			.from('clients')
			.select('id, name, contact, email, projects')
			.order('name');
		if(error) console.error('clients fetch error', error.message); else if(data){
			rows = data.map((c:any)=>({ id:c.id, name:c.name, contact:c.contact, email:c.email, projects: c.projects }));
		}
	} catch(e:any){ console.error('clients unexpected', e?.message||e); }
	return <RoleGate role="admin"><PageClient rows={rows} /></RoleGate>;
}
