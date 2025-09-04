'use client'
import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/ui/Layout';

const TABS = ['company','users','suppliers','cost-codes'] as const
export default function SettingsPage() {
  const [tab, setTab] = useState<typeof TABS[number]>('company')
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" showBackButton={true} backHref="/dashboard" />
      <div className="p-6 space-y-6">
        <div className="flex gap-2 flex-wrap">{TABS.map(t => <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1 rounded border text-sm ${tab===t?'bg-black text-white':'bg-neutral-200 dark:bg-neutral-800'}`}>{t}</button>)}</div>
        {tab === 'company' && <CompanyTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'suppliers' && <SuppliersTab />}
        {tab === 'cost-codes' && <CostCodesTab />}
      </div>
    </div>
  )
}

function CompanyTab() {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [units, setUnits] = useState('imperial')
  const [msg, setMsg] = useState('')
  const companyId = (typeof window !== 'undefined'? (localStorage.getItem('company_id')||''): '') || process.env.NEXT_PUBLIC_COMPANY_ID || ''
  useEffect(()=>{(async()=>{ if(!companyId) return; const r= await fetch('/api/companies/'+companyId); const d= await r.json().catch(()=>null); if(d){ setName(d.name||''); setCurrency(d.currency||'USD'); setUnits(d.units||'imperial') } })()},[companyId])
  async function save(){ setMsg(''); const res = await fetch('/api/companies/'+companyId,{ method:'PATCH', headers:{'content-type':'application/json'}, body: JSON.stringify({ name, currency, units })}); setMsg(res.ok?'Saved':'Error') }
  return <div className="space-y-4 max-w-lg"> <div className="grid gap-3"> <input className="border p-2 rounded" placeholder="Company name" value={name} onChange={e=>setName(e.target.value)} /> <input className="border p-2 rounded" placeholder="Currency" value={currency} onChange={e=>setCurrency(e.target.value)} /> <select className="border p-2 rounded" value={units} onChange={e=>setUnits(e.target.value)}><option value="imperial">Imperial</option><option value="metric">Metric</option></select> <button onClick={save} className="py-2 bg-black text-white rounded">Save</button> </div> {msg && <p className="text-sm">{msg}</p>} </div>
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('foreman')
  useEffect(()=>{(async()=>{ const r= await fetch('/api/users'); const d= await r.json().catch(()=>[]); setUsers(Array.isArray(d)?d:[]) })()},[])
  async function invite(){ const res = await fetch('/api/users',{ method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ email, role })}); if(res.ok){ setEmail(''); const d= await res.json().catch(()=>null); setUsers(u=>[...(u||[]), d]) } }
  return <div className="space-y-4"> <div className="flex gap-2 flex-wrap items-end"> <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="border p-2 rounded" /> <select value={role} onChange={e=>setRole(e.target.value)} className="border p-2 rounded text-sm"><option>foreman</option><option>bookkeeper</option><option>admin</option><option>owner</option></select> <button onClick={invite} className="px-3 py-2 bg-black text-white rounded text-sm">Invite</button> </div> <table className="text-sm w-full max-w-3xl border"> <thead><tr className="border-b"><th className="text-left p-2">Email</th><th className="text-left p-2">Role</th></tr></thead><tbody>{users.map(u=> <tr key={u.id} className="border-b"><td className="p-2">{u.email}</td><td className="p-2 text-xs">{u.role}</td></tr>)}</tbody></table> </div>
}

function SuppliersTab() { return <div className="text-sm">Use the <a href="/suppliers" className="underline">Suppliers page</a> to manage vendors.</div> }

function CostCodesTab() { return <div className="text-sm">Cost codes are created in the Job dashboard and will appear in exports.</div> }
