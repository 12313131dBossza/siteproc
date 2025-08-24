import RoleGate from '@/components/RoleGate';
import PageClient from './pageClient';
export const dynamic = 'force-dynamic';
export default function ProjectDetailPage({ params }: { params: { id: string }}) { return <RoleGate role="admin"><PageClient params={params} /></RoleGate>; }
