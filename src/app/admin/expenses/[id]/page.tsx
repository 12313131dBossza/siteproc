import React from 'react';
import { expenses } from '@/lib/mockData';

export default function ExpenseDetail({ params }: { params: { id: string }}) {
  const e = expenses.find(x=>x.id===params.id);
  if(!e) return <div>Not found.</div>;
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Expense {e.id}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="sp-card"><p className="text-xs text-[var(--sp-color-muted)]">Project</p><p>{e.project}</p></div>
        <div className="sp-card"><p className="text-xs text-[var(--sp-color-muted)]">Category</p><p>{e.category}</p></div>
        <div className="sp-card"><p className="text-xs text-[var(--sp-color-muted)]">Amount</p><p>${e.amount}</p></div>
        <div className="sp-card"><p className="text-xs text-[var(--sp-color-muted)]">Date</p><p>{e.date}</p></div>
      </div>
    </div>
  );
}
