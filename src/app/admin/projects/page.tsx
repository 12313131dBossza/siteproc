export const dynamic = 'force-dynamic';
import RoleGate from '@/components/RoleGate';
import ProjectsPageClient from './pageClient';
import { sbServer } from '@/lib/supabase-server';

export const revalidate = 0;

export default async function ProjectsListPage(){
	const supabase = await sbServer();
	// Try projects table first, fallback to jobs if projects doesn't exist yet
	let data = null;
	let error = null;
	try {
		const result = await supabase
			.from('projects')
			.select('id,name,code,status,budget')
			.order('created_at',{ ascending:false })
			.limit(200);
		data = result.data;
		error = result.error;
	} catch (e) {
		// If projects table doesn't exist, fall back to jobs
		console.log('Projects table not found, falling back to jobs');
		const result = await supabase
			.from('jobs')
			.select('id,name,code')
			.order('created_at',{ ascending:false })
			.limit(200);
		data = result.data;
		error = result.error;
	}
	return <RoleGate role="admin"><ProjectsPageClient rows={(data||[]) as any} error={error?.message} /></RoleGate>;
}
