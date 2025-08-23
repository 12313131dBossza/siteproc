export const dynamic = 'force-dynamic';
import RoleGate from '@/components/RoleGate';
import ClientsPageClient from './pageClient';
export default function ClientsList(){ return <RoleGate role="admin"><ClientsPageClient /></RoleGate>; }
