'use client'
import { useEffect, useState } from 'react'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [msg, setMsg] = useState('')
  const companyId = (typeof window !== 'undefined' ? (localStorage.getItem('company_id') || '') : '') || process.env.NEXT_PUBLIC_COMPANY_ID || ''

  async function load() {
    const res = await fetch('/api/suppliers', { headers: { 'x-company-id': companyId } })
    const data = await res.json().catch(()=>[])
    setSuppliers(Array.isArray(data) ? data : [])
  }
  useEffect(()=>{ load() }, [])

  async function create() {
    setMsg('')
    const body = { name, email: email || undefined, phone: phone || undefined, notes: notes || undefined }
    const res = await fetch('/api/suppliers', { method: 'POST', headers: { 'content-type': 'application/json', 'x-company-id': companyId, 'x-user-id': (localStorage.getItem('user_id')||'') }, body: JSON.stringify(body) })
    const data = await res.json().catch(()=>({}))
    if (res.ok) { setName(''); setEmail(''); setPhone(''); setNotes(''); load(); setMsg('Created') } else setMsg(data?.error || 'Error')
  }
  async function remove(id: string) {
    if (!confirm('Delete supplier?')) return
    await fetch(`/api/suppliers/${id}`, { method: 'DELETE', headers: { 'x-company-id': companyId, 'x-user-id': (localStorage.getItem('user_id')||'') } })
    load()
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Suppliers</h1>
      <div className="grid md:grid-cols-4 gap-3 max-w-3xl">
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} className="border p-2 rounded" />
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="border p-2 rounded" />
        <input placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} className="border p-2 rounded" />
        <input placeholder="Notes" value={notes} onChange={e=>setNotes(e.target.value)} className="border p-2 rounded" />
        <button onClick={create} className="md:col-span-4 py-2 bg-black text-white rounded">Add Supplier</button>
        {msg && <p className="text-sm md:col-span-4">{msg}</p>}
      </div>
      <table className="w-full text-sm max-w-4xl">
        <thead><tr className="border-b"><th className="text-left p-2">Name</th><th className="text-left p-2">Email</th><th className="text-left p-2">Phone</th><th className="text-left p-2">Notes</th><th/></tr></thead>
        <tbody>
          {suppliers.map(s => (
            <tr key={s.id} className="border-b">
              <td className="p-2">{s.name}</td>
              <td className="p-2">{s.email}</td>
              <td className="p-2">{s.phone}</td>
              <td className="p-2 text-xs">{s.notes}</td>
              <td className="p-2 text-right"><button onClick={()=>remove(s.id)} className="text-red-600 text-xs">Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
