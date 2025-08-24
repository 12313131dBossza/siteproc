"use client";
import { useMemo } from "react";
import DataTable from "@/components/ui/DataTable";

export type ExpenseRow = { id:string; category:string; vendor:string|null; spent_on:string; amount:number; tax:number|null; description:string|null; status:string; };

export default function PageClient({ rows }: { rows: ExpenseRow[] }) {
  const columns = useMemo(() => [
    { key: "category", header: "Category", sortable: true },
    { key: "vendor", header: "Vendor", sortable: true },
    { key: "spent_on", header: "Date", sortable: true },
    { key: "amount", header: "Amount", sortable: true },
    { key: "tax", header: "Tax", sortable: true },
    { key: "status", header: "Status", sortable: true },
  ], []);
  return (
    <div className="sp-container space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Expenses</h1>
        <a className="sp-btn sp-btn-primary" href="/admin/expenses/new">New Expense</a>
      </div>
      <DataTable rows={rows as any} columns={columns as any} emptyMessage="No expenses yet." />
    </div>
  );
}