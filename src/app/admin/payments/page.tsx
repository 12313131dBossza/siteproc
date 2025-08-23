export const dynamic = 'force-dynamic';
import RoleGate from '@/components/RoleGate';
import PaymentsPageClient from './pageClient';
export default function PaymentsPage(){ return <RoleGate role="admin"><PaymentsPageClient /></RoleGate>; }
