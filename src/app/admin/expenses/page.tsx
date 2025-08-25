import { sbServer } from "@/lib/supabase-server";
import RoleGate from "@/components/auth/RoleGate";
import ExpensesClient from "./pageClient";

export const dynamic = "force-dynamic";

// Server component wrapper: fetches data, maps DB fields -> client row shape.
export default async function Page() {
	// Real columns: id, amount, spent_at, memo, created_at
	let rows: any[] = []
	let companyId = ''
	try {
		const supabase = await sbServer();
		// Derive company id from first job or expense row (demo simplification)
		const { data: exp } = await supabase.from('expenses').select('id,amount,spent_at,memo,created_at,company_id').order('spent_at',{ascending:false}).limit(200) as any
		rows = (exp||[]).map((e:any)=>({ id:e.id, amount:Number(e.amount), spent_at:e.spent_at, memo:e.memo||null, created_at:e.created_at }))
		companyId = (exp && exp[0]?.company_id) || (process.env.NEXT_PUBLIC_COMPANY_ID || 'demo')
	} catch (e:any) { console.error('expenses initial fetch', e?.message) }
	return <RoleGate role="admin"><ExpensesClient initial={rows} companyId={companyId} /></RoleGate>
}
