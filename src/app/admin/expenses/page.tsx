import { sbServer } from "@/lib/supabase-server";
import RoleGate from "@/components/auth/RoleGate";
import PageClient from "./pageClient";

export const dynamic = "force-dynamic";

// Server component wrapper: fetches data, maps DB fields -> client row shape.
export default async function Page() {
	type ExpenseRow = { id: string; category: string; vendor: string | null; spent_on: string; amount: number; tax: number | null; description: string | null; status: string; };

	let rows: ExpenseRow[] = [];
		try {
			const supabase = await sbServer();
			const { data, error } = await supabase
				.from("expenses")
			.select("id, category, vendor, spent_at, amount, tax, description, status")
			.order("spent_at", { ascending: false });
		if (error) {
			console.error("/admin/expenses fetch error:", error.message);
		} else if (data) {
			rows = data.map((e: any) => ({
				id: e.id,
				category: e.category,
				vendor: e.vendor,
				spent_on: e.spent_at, // map DB spent_at -> UI spent_on
				amount: e.amount,
				tax: e.tax,
				description: e.description,
				status: e.status
			}));
		}
	} catch (err: any) {
		console.error("/admin/expenses unexpected error:", err?.message || err);
	}
	return (
		<RoleGate role="admin">
			<PageClient rows={rows} />
		</RoleGate>
	);
}
