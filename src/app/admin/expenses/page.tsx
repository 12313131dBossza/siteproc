export const dynamic = 'force-dynamic';
import RoleGate from '@/components/RoleGate';
import ExpensesPageClient from './pageClient';
export default function ExpensesList(){ return <RoleGate role="admin"><ExpensesPageClient /></RoleGate>; }
