'use client'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const [stats, setStats] = useState<any>({ jobs:0, rfqs:0, quotes:0, pos:0, deliveries:0, change_orders:0, expenses:0 })
  const companyId = (typeof window !== 'undefined' ? (localStorage.getItem('company_id') || '') : '') || process.env.NEXT_PUBLIC_COMPANY_ID || ''
  useEffect(()=>{(async()=>{
    const endpoints = ['jobs','rfqs','quotes','po','deliveries','change-orders','expenses']
    const results = await Promise.all(endpoints.map(ep => fetch(`/api/${ep}?limit=1`, { headers: { 'x-company-id': companyId } }).then(r=>r.json().catch(()=>({ items:[] })))) )
    const counts: any = {}
    endpoints.forEach((ep,i)=>{ const arr = results[i]; const list = Array.isArray(arr) ? arr : (Array.isArray(arr.items)?arr.items:[]); counts[ep.replace(/-/g,'_')] = list.length >= 1 ? list.length : list.length })
    setStats((s:any)=>({ ...s, ...counts }))
  })() }, [companyId])
  const cards = [
    { label: 'Jobs', v: stats.jobs }, { label: 'RFQs', v: stats.rfqs }, { label: 'Quotes', v: stats.quotes }, { label: 'POs', v: stats.pos }, { label: 'Deliveries', v: stats.deliveries }, { label: 'Change Orders', v: stats.change_orders }, { label: 'Expenses', v: stats.expenses }
  ]
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="grid md:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="p-4 border rounded bg-neutral-900 border-neutral-700">
            <div className="text-xs uppercase tracking-wide text-neutral-400">{c.label}</div>
            <div className="text-2xl font-semibold">{c.v}</div>
          </div>
        ))}
      </div>
      <div className="text-sm text-neutral-500">Counts are approximate (sampled); navigate to entity pages for full data.</div>
    </div>
  )
}
