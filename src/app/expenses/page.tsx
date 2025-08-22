"use client"
import { useEffect, useState } from 'react'

export default function ExpensesListPage() {
  const [items, setItems] = useState<any[]>([])
  const companyId = (typeof window !== 'undefined' ? localStorage.getItem('company_id') : '') || ''
  useEffect(()=>{(async()=>{ const r= await fetch('/api/expenses?limit=100',{ headers:{'x-company-id':companyId}}); const d = await r.json().catch(()=>({items:[]})); setItems(Array.isArray(d.items)? d.items:[]) })()},[companyId])
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Expenses</h1>
      <table className="w-full text-sm">
        <thead><tr className="border-b"><th className="p-2 text-left">Date</th><th className="p-2 text-left">Job</th><th className="p-2 text-left">Amount</th><th className="p-2 text-left">Memo</th></tr></thead>
        <tbody>{items.map(e => <tr key={e.id} className="border-b"><td className="p-2 whitespace-nowrap">{e.spent_at}</td><td className="p-2 text-xs">{e.job_id?.slice(0,8)}</td><td className="p-2">${'{'}e.amount{'}'}</td><td className="p-2 truncate max-w-xs">{e.memo || ''}</td></tr>)}</tbody>
      </table>
      <p className="text-xs text-neutral-500">Bookkeeper view: up to 100 recent expenses.</p>
    </div>
  )
}
