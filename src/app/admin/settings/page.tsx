export const dynamic = 'force-dynamic';
import RoleGate from '@/components/RoleGate';
import SettingsPageClient from './pageClient';
export default function SettingsPage(){ return <RoleGate role="admin"><SettingsPageClient /></RoleGate>; }
