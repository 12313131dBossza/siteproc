export const dynamic = 'force-dynamic';
import RoleGate from '@/components/RoleGate';
import ContractorsPageClient from './pageClient';
export default function ContractorsList(){ return <RoleGate role="admin"><ContractorsPageClient /></RoleGate>; }
