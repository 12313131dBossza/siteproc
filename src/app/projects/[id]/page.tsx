"use client"
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function ProjectDetailPage() {
  const params = useParams() as { id: string }
  const id = params?.id
  const [project, setProject] = useState<any>(null)
  const [rollup, setRollup] = useState<any>(null)
  const [tab, setTab] = useState<'overview'|'orders'|'expenses'|'deliveries'>('overview')
  const [assign, setAssign] = useState({ orders: '', expenses: '', deliveries: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string|undefined>()

  async function load() {
    setError(undefined)
    try {
      const [p, r] = await Promise.all([
        fetch(`/api/projects/${id}`, { headers: { 'Accept': 'application/json' } }).then(r=>r.json()),
        fetch(`/api/projects/${id}/rollup`, { headers: { 'Accept': 'application/json' } }).then(r=>r.json())
      ])
      if (p?.error) throw new Error(p.error)
      setProject(p.data)
      setRollup(r.data)
    } catch (e:any) {
      setError(e?.message || 'Failed to load project')
    }
  }
  useEffect(() => { if (id) load() }, [id])

  async function updateStatus(status: string) {
    const res = await fetch(`/api/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ status }) })
    if (res.ok) {
      const j = await res.json().catch(()=>({}))
      if (j?.data) setProject(j.data)
      // Refresh rollup in background
      fetch(`/api/projects/${id}/rollup`).then(r=>r.json()).then(j=>setRollup(j.data)).catch(()=>{})
    } else {
      alert('Failed to update status')
    }
  }

  async function doAssign() {
    setSaving(true)
    const orders = assign.orders.split(/[,\s]+/).filter(Boolean)
    const expenses = assign.expenses.split(/[,\s]+/).filter(Boolean)
    const deliveries = assign.deliveries.split(/[,\s]+/).filter(Boolean)
    const res = await fetch(`/api/projects/${id}/assign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orders, expenses, deliveries }) })
    if (res.ok) { setAssign({ orders:'', expenses:'', deliveries:'' }); load() } else { const e = await res.json().catch(()=>({})); alert(e.error || 'Assign failed') }
    setSaving(false)
  }

  if (!id) return null
  if (!project) return (
    <div className="p-6">
      {error ? (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 p-3">
          <div className="font-medium mb-1">Couldn’t load project</div>
          <div className="text-sm">{error}</div>
        </div>
      ) : (
        <div>Loading…</div>
      )}
    </div>
  )

  const variance = Number(rollup?.variance || 0)

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <div className="text-gray-500">{project.code || '—'}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Status:</span>
          <select value={project.status} onChange={e=>updateStatus(e.target.value)} className="border rounded px-3 py-2">
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI title="Budget" value={`$${Number(project.budget).toFixed(2)}`} />
        <KPI title="Actual (Expenses)" value={`$${Number(rollup?.actual_expenses||0).toFixed(2)}`} />
        <KPI title="Variance" value={`$${variance.toFixed(2)}`} emphasize={variance<0? 'bad':'good'} />
        <KPI title="# Orders" value={String(rollup?.counts?.orders||0)} />
        <KPI title="# Expenses" value={String(rollup?.counts?.expenses||0)} />
        <KPI title="# Deliveries" value={String(rollup?.counts?.deliveries||0)} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['overview','orders','expenses','deliveries'] as const).map(t=> (
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 -mb-px border-b-2 ${tab===t? 'border-blue-600 text-blue-700':'border-transparent text-gray-600'}`}>{t[0].toUpperCase()+t.slice(1)}</button>
        ))}
      </div>

      {tab==='overview' && (
        <div className="bg-white border rounded p-4">Budget vs Actual chart coming soon.</div>
      )}

      {tab!=='overview' && (
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-3">Bulk assign by pasting IDs (comma or space separated).</div>
          {tab==='orders' && (
            <textarea value={assign.orders} onChange={e=>setAssign(a=>({...a,orders:e.target.value}))} rows={3} className="w-full border rounded p-2 mb-2" placeholder="order-id-1, order-id-2" />
          )}
          {tab==='expenses' && (
            <textarea value={assign.expenses} onChange={e=>setAssign(a=>({...a,expenses:e.target.value}))} rows={3} className="w-full border rounded p-2 mb-2" placeholder="expense-id-1, expense-id-2" />
          )}
          {tab==='deliveries' && (
            <textarea value={assign.deliveries} onChange={e=>setAssign(a=>({...a,deliveries:e.target.value}))} rows={3} className="w-full border rounded p-2 mb-2" placeholder="delivery-id-1, delivery-id-2" />
          )}
          <button disabled={saving} onClick={doAssign} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving?'Assigning…':'Assign to Project'}</button>
        </div>
      )}
    </div>
  )
}

function KPI({ title, value, emphasize }: { title: string; value: string; emphasize?: 'good'|'bad' }) {
  const color = emphasize==='good'? 'text-green-600' : emphasize==='bad'? 'text-red-600' : 'text-gray-900'
  return (
    <div className="bg-white border rounded p-4">
      <div className="text-gray-500 text-sm">{title}</div>
      <div className={`text-xl font-semibold ${color}`}>{value}</div>
    </div>
  )
}
