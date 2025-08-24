import RoleGate from '@/components/RoleGate';
import ProjectDetailPageClient from './pageClient';
import { sbServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params }: { params: { id: string }}) {
	const supabase = await sbServer();
	const { data } = await supabase
		.from('jobs')
		.select('id,name,code,created_at')
		.eq('id', params.id)
		.single();
	return <RoleGate role="admin"><ProjectDetailPageClient project={(data||null) as any} /></RoleGate>;
}
