export const dynamic = 'force-dynamic';
import RoleGate from '@/components/RoleGate';
import ProjectsPageClient from './pageClient';
import { sbServer } from '@/lib/supabase-server';

export const revalidate = 0;

export default async function ProjectsListPage(){
	const supabase = await sbServer();
	const { data } = await supabase
		.from('jobs')
		.select('id,name,code')
		.order('created_at',{ ascending:false })
		.limit(200);
	return <RoleGate role="admin"><ProjectsPageClient rows={(data||[]) as any} /></RoleGate>;
}
