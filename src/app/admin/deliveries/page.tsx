export const dynamic = 'force-dynamic';
import RoleGate from '@/components/RoleGate';
import DeliveriesPageClient from './pageClient';

export default function DeliveriesListPage() {
  return <RoleGate role="admin"><DeliveriesPageClient /></RoleGate>;
}
