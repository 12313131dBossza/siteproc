export const dynamic = 'force-dynamic';
import RoleGate from '@/components/RoleGate';
import DashboardPageClient from './pageClient';
export default function AdminDashboardPage(){
  return <RoleGate role="admin"><DashboardPageClient /></RoleGate>;
}
