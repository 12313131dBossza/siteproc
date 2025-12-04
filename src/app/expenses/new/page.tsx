'use client'
import { useState } from 'react'

export default function NewExpensePage() {
  const [jobId, setJobId] = useState('')
  const [vendor, setVendor] = useState('')
  const [amount, setAmount] = useState('')
  const [spentAt, setSpentAt] = useState('')
  const [memo, setMemo] = useState('')
  const [msg, setMsg] = useState('')
  const companyId = (typeof window !== 'undefined' ? (localStorage.getItem('company_id') || '') : '') || process.env.NEXT_PUBLIC_COMPANY_ID || ''
  async function submit() {
    setMsg('')
    const num = parseFloat(amount)
    if (!vendor.trim()) { setMsg('Vendor / Supplier is required'); return }
    if (!jobId || !num || !spentAt) { setMsg('Enter job, amount, date'); return }
    const res = await fetch('/api/expenses', { method: 'POST', headers: { 'content-type':'application/json','x-company-id': companyId }, body: JSON.stringify({ job_id: jobId, vendor: vendor.trim(), amount: num, spent_at: spentAt, memo: memo || undefined }) })
    const data = await res.json().catch(()=>({}))
    if (res.ok) { setMsg('Expense created'); setVendor(''); setAmount(''); setMemo('') } else setMsg(data?.error || 'Error')
  }
  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">New Expense</h1>
      <div>
        <label className="block text-sm font-medium mb-1">Vendor / Supplier <span className="text-red-500">*</span></label>
        <input value={vendor} onChange={e=>setVendor(e.target.value)} placeholder="e.g. Home Depot, ABC Concrete" className="border p-2 w-full rounded" required />
      </div>
      <input value={jobId} onChange={e=>setJobId(e.target.value)} placeholder="Job ID" className="border p-2 w-full rounded" />
      <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Amount" type="number" className="border p-2 w-full rounded" />
      <input value={spentAt} onChange={e=>setSpentAt(e.target.value)} placeholder="YYYY-MM-DD" className="border p-2 w-full rounded" />
      <input value={memo} onChange={e=>setMemo(e.target.value)} placeholder="Memo" className="border p-2 w-full rounded" />
      <button onClick={submit} className="w-full py-2 bg-black text-white rounded">Create Expense</button>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  )
}
