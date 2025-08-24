export const dynamic = 'force-dynamic';
import RoleGate from '@/components/RoleGate';
import ContractorsPageClient from './pageClient';
import { sbServer } from '@/lib/supabase-server';

export const revalidate = 0;

export default async function ContractorsList(){
	const supabase = await sbServer();
	const { data } = await supabase
		.from('suppliers')
		.select('id,name,email,phone')
		.order('name');
	return <RoleGate role="admin"><ContractorsPageClient rows={(data||[]) as any} /></RoleGate>;
}
