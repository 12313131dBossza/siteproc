export const dynamic = 'force-dynamic';
import RoleGate from '@/components/RoleGate';
import BidsPageClient from './pageClient';
export default function BidsList(){ return <RoleGate role="admin"><BidsPageClient /></RoleGate>; }
