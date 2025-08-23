export const dynamic = 'force-dynamic';
import RoleGate from '@/components/RoleGate';
import ProjectsPageClient from './pageClient';
export default function ProjectsListPage(){ return <RoleGate role="admin"><ProjectsPageClient /></RoleGate>; }
