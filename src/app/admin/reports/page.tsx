export const dynamic = 'force-dynamic';
import RoleGate from '@/components/RoleGate';
import ReportsPageClient from './pageClient';
export default function ReportsPage(){ return <RoleGate role="admin"><ReportsPageClient /></RoleGate>; }
