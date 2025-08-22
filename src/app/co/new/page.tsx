'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function NewCO() {
  const sp = useSearchParams()
  const [msg, setMsg] = useState('')
  const submit = async (e: any) => {
    e.preventDefault()
    const f = new FormData(e.target)
    const payload = {
      job_id: sp.get('job') || String(f.get('job_id')),
      description: String(f.get('description')),
      cost_delta: Number(f.get('cost_delta')),
      approver_email: String(f.get('approver_email')),
      photo_data_urls: [],
    }
    const cid = (typeof window !== 'undefined' ? (localStorage.getItem('company_id') || '') : '') || process.env.NEXT_PUBLIC_COMPANY_ID || '00000000-0000-0000-0000-000000000000'
    const res = await fetch('/api/change-orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-company-id': cid },
      body: JSON.stringify(payload),
    })
    let data: any = null
    try { if (res.headers.get('content-type')?.includes('application/json')) data = await res.json() } catch {}
    setMsg(res.ok ? `CO ${data?.id}` : `Error: ${data?.error || res.statusText}`)
  }
  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold mb-3">New Change Order</h1>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">Job ID<input className="border p-2 w-full" name="job_id" placeholder="uuid" defaultValue={sp.get('job') || ''}/></label>
        <label className="block">Description<textarea className="border p-2 w-full" name="description"/></label>
        <label className="block">Cost Delta<input className="border p-2 w-full" type="number" step="0.01" name="cost_delta"/></label>
        <label className="block">Approver Email<input className="border p-2 w-full" type="email" name="approver_email"/></label>
        <button className="w-full py-2 bg-black text-white rounded">Submit CO</button>
      </form>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </div>
  )
}
