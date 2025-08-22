"use client"
import { useEffect, useState } from 'react'

interface EventItem { id:string; entity:string; entity_id:string; verb:string; payload:any; created_at:string }

export default function AuditLogPage(){
  const [items,setItems]=useState<EventItem[]>([])
  const [entity,setEntity]=useState('')
  const companyId = (typeof window!== 'undefined'? localStorage.getItem('company_id'): '')||''
  useEffect(()=>{(async()=>{const url = '/api/events'+(entity?`?entity=${entity}`:''); const r= await fetch(url,{headers:{'x-company-id':companyId}}); const d= await r.json(); setItems(d.items||[])})()},[entity,companyId])
  return <div className="p-6 space-y-4">
    <h1 className="text-xl font-semibold">Audit Log</h1>
    <div className="flex gap-2 items-center text-sm">
      <label className="text-neutral-600">Filter entity:</label>
      <select value={entity} onChange={e=>setEntity(e.target.value)} className="border rounded px-2 py-1">
        <option value="">All</option>
        <option value="job">job</option>
        <option value="expense">expense</option>
        <option value="po">po</option>
        <option value="change_order">change_order</option>
        <option value="quote">quote</option>
        <option value="rfq">rfq</option>
      </select>
    </div>
    <table className="w-full text-xs">
      <thead><tr className="border-b"><th className="p-2 text-left">Time</th><th className="p-2 text-left">Entity</th><th className="p-2 text-left">Verb</th><th className="p-2 text-left">Details</th></tr></thead>
      <tbody>{items.map(ev=> <tr key={ev.id} className="border-b align-top"><td className="p-2 whitespace-nowrap">{new Date(ev.created_at).toLocaleString()}</td><td className="p-2">{ev.entity}</td><td className="p-2">{ev.verb}</td><td className="p-2 max-w-md overflow-x-auto"><pre className="whitespace-pre-wrap break-words">{JSON.stringify(ev.payload,null,2)}</pre></td></tr>)}</tbody>
    </table>
    <p className="text-xs text-neutral-500">Latest {items.length} events (bookkeeper role).</p>
  </div>
}
