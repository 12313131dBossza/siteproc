"use client"
import { useEffect, useState } from 'react'

interface CO { id:string; job_id:string; description:string; status:string; cost_delta:number; approver_email:string; created_at:string; approved_at?:string|null }

export default function ChangeOrdersList(){
  const [items,setItems]=useState<CO[]>([])
  const companyId = (typeof window!== 'undefined'? localStorage.getItem('company_id'): '')||''
  useEffect(()=>{(async()=>{const r= await fetch('/api/query?table=change_orders&limit=200',{headers:{'x-company-id':companyId}}); const d= await r.json(); setItems(d.items||[]) })()},[companyId])
  return <div className="p-6 space-y-4">
    <h1 className="text-xl font-semibold">Change Orders</h1>
    <table className="w-full text-xs">
      <thead><tr className="border-b"><th className="p-2 text-left">Created</th><th className="p-2 text-left">Job</th><th className="p-2 text-left">Desc</th><th className="p-2 text-left">Cost Δ</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Approved</th></tr></thead>
      <tbody>{items.map(co=> <tr key={co.id} className="border-b"><td className="p-2 whitespace-nowrap">{new Date(co.created_at).toLocaleDateString()}</td><td className="p-2 text-xs">{co.job_id?.slice(0,8)}</td><td className="p-2 max-w-xs truncate" title={co.description}>{co.description}</td><td className="p-2">{co.cost_delta}</td><td className="p-2">{co.status}</td><td className="p-2">{co.approved_at? new Date(co.approved_at).toLocaleDateString(): '-'}</td></tr>)}</tbody>
    </table>
  </div>
}
