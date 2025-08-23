export const dynamic = 'force-dynamic';
import RoleGate from '@/components/RoleGate';
import ChangeOrdersPageClient from './pageClient';
export default function ChangeOrdersList(){ return <RoleGate role="admin"><ChangeOrdersPageClient /></RoleGate>; }
