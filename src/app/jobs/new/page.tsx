'use client'
import { useState } from 'react'

export default function NewJobPage() {
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [msg, setMsg] = useState('')
  const companyId = (typeof window !== 'undefined' ? (localStorage.getItem('company_id') || '') : '') || process.env.NEXT_PUBLIC_COMPANY_ID || ''
  async function submit() {
    setMsg('')
    if (!name) { setMsg('Enter name'); return }
    const res = await fetch('/api/jobs', { method: 'POST', headers: { 'content-type': 'application/json', 'x-company-id': companyId }, body: JSON.stringify({ name, number: number || undefined }) })
    const data = await res.json().catch(()=>({}))
    if (res.ok && data?.id) { setMsg('Job created '+data.id); setName(''); setNumber('') } else setMsg(data?.error || 'Error')
  }
  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">New Job</h1>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" className="border p-2 w-full rounded" />
      <input value={number} onChange={e=>setNumber(e.target.value)} placeholder="Number" className="border p-2 w-full rounded" />
      <button onClick={submit} className="w-full py-2 bg-black text-white rounded">Create Job</button>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  )
}
