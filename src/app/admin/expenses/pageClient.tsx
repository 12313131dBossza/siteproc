"use client";
import { useExpensesRealtime, type ExpenseRow } from "@/lib/useExpensesRealtime";

export default function ExpensesClient({ initial, companyId }: { initial: ExpenseRow[]; companyId: string }) {
  const rows = useExpensesRealtime(initial, companyId);
  return (
    <div className="sp-container space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Expenses (Realtime)</h1>
        <a className="sp-btn sp-btn-primary" href="/admin/expenses/new">New Expense</a>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Spent</th>
              <th className="py-2 pr-4">Memo</th>
              <th className="py-2 pr-4">Amount</th>
              <th className="py-2 pr-4">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-none">
                <td className="py-2 pr-4 whitespace-nowrap">{r.spent_at ? new Date(r.spent_at).toLocaleDateString() : '-'}</td>
                <td className="py-2 pr-4 max-w-xs truncate" title={r.memo||''}>{r.memo||''}</td>
                <td className="py-2 pr-4">{r.amount?.toFixed(2)}</td>
                <td className="py-2 pr-4 whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted-foreground">No expenses</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}