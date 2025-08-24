export const dynamic = 'force-dynamic';
import RoleGate from '@/components/RoleGate';
import ChangeOrdersPageClient from './pageClient';
import { sbServer } from '@/lib/supabase-server';

export const revalidate = 0; // always fresh for demo

export default async function ChangeOrdersList(){
	const supabase = await sbServer();
	const { data } = await supabase
		.from('change_orders')
		.select('id,status,cost_delta,created_at')
		.order('created_at',{ ascending:false })
		.limit(100);
	return <RoleGate role="admin"><ChangeOrdersPageClient rows={(data||[]) as any} /></RoleGate>;
}
