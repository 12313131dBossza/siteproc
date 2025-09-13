'use client'
import { useEffect, useState } from 'react'
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/Button"
import { Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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
    <AppLayout 
      title="Suppliers"
      description="Manage your supplier and vendor information"
      actions={
        <div className="flex gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Dashboard
            </Button>
          </Link>
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setName('')}>
            Add Supplier
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Supplier</h3>
          <div className="grid md:grid-cols-4 gap-3">
            <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            <input placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            <input placeholder="Notes" value={notes} onChange={e=>setNotes(e.target.value)} className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            <button onClick={create} className="md:col-span-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">Add Supplier</button>
            {msg && <p className="text-sm md:col-span-4 text-green-600">{msg}</p>}
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Suppliers</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 bg-gray-50"><th className="text-left p-4 font-medium text-gray-900">Name</th><th className="text-left p-4 font-medium text-gray-900">Email</th><th className="text-left p-4 font-medium text-gray-900">Phone</th><th className="text-left p-4 font-medium text-gray-900">Notes</th><th className="p-4"></th></tr></thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">{s.name}</td>
                    <td className="p-4 text-gray-600">{s.email}</td>
                    <td className="p-4 text-gray-600">{s.phone}</td>
                    <td className="p-4 text-gray-600">{s.notes}</td>
                    <td className="p-4 text-right"><button onClick={()=>remove(s.id)} className="text-red-600 hover:text-red-700 font-medium">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
