"use client"
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function ProjectDetailPage() {
  const params = useParams() as { id: string }
  const id = params?.id
  const [project, setProject] = useState<any>(null)
  const [rollup, setRollup] = useState<any>(null)
  const [tab, setTab] = useState<'overview'|'orders'|'expenses'|'deliveries'>('overview')
  // Assignment textarea state (kept for fallback bulk paste modal later)
  const [assign, setAssign] = useState({ orders: '', expenses: '', deliveries: '' })
  // Loaded items for each tab
  const [orders, setOrders] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loadingTab, setLoadingTab] = useState(false)
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

  // Fetch tab-specific data when tab changes
  useEffect(() => {
    if (!id || tab==='overview') return
    let aborted = false
    async function fetchTab() {
      setLoadingTab(true)
      try {
        if (tab==='expenses') {
          // Reuse expenses API and filter client-side by project_id (added to API response)
            const res = await fetch('/api/expenses')
            const j = await res.json().catch(()=>({}))
            if (!aborted) setExpenses((j.expenses||[]).filter((e:any)=>e.project_id===id))
        } else if (tab==='orders') {
            const res = await fetch('/api/orders')
            const j = await res.json().catch(()=>[])
            if (!aborted) setOrders((j||[]).filter((o:any)=>o.project_id===id))
        } else if (tab==='deliveries') {
            // Deliveries API returns list; filter by project_id if present
            const res = await fetch('/api/order-deliveries')
            const j = await res.json().catch(()=>({}))
            const list = Array.isArray(j.data)? j.data : (j.deliveries||[])
            if (!aborted) setDeliveries(list.filter((d:any)=>d.project_id===id))
        }
      } catch (e) { /* silent */ }
      finally { if (!aborted) setLoadingTab(false) }
    }
    fetchTab()
    return () => { aborted = true }
  }, [tab, id])

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
        <div className="bg-white border rounded p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium capitalize">{tab}</h2>
            <button onClick={()=>setTab(tab)} disabled className="text-xs text-gray-400 border rounded px-2 py-1 cursor-default">Linked</button>
          </div>
          {loadingTab && <div className="text-sm text-gray-500">Loading {tab}…</div>}
          {!loadingTab && tab==='expenses' && (
            expenses.length? (
              <table className="w-full text-sm border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 border">Vendor</th>
                    <th className="text-left p-2 border">Category</th>
                    <th className="text-right p-2 border">Amount</th>
                    <th className="text-left p-2 border">Status</th>
                    <th className="text-left p-2 border">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(e=> (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="p-2 border">{e.vendor}</td>
                      <td className="p-2 border capitalize">{e.category}</td>
                      <td className="p-2 border text-right">${'{'}Number(e.amount).toFixed(2){'}'}</td>
                      <td className="p-2 border">{e.status}</td>
                      <td className="p-2 border text-xs text-gray-500">{e.id.slice(0,8)}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="text-sm text-gray-500">No expenses linked yet.</div>
          )}
          {!loadingTab && tab==='orders' && (
            orders.length? (
              <table className="w-full text-sm border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 border">Product</th>
                    <th className="text-right p-2 border">Qty</th>
                    <th className="text-left p-2 border">Status</th>
                    <th className="text-left p-2 border">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o=> (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="p-2 border">{o.product?.name || '—'}</td>
                      <td className="p-2 border text-right">{o.qty ?? '—'}</td>
                      <td className="p-2 border">{o.status}</td>
                      <td className="p-2 border text-xs text-gray-500">{o.id.slice(0,8)}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="text-sm text-gray-500">No orders linked yet.</div>
          )}
          {!loadingTab && tab==='deliveries' && (
            deliveries.length? (
              <table className="w-full text-sm border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 border">Order Ref</th>
                    <th className="text-left p-2 border">Status</th>
                    <th className="text-right p-2 border">Total</th>
                    <th className="text-left p-2 border">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map(d=> (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="p-2 border">{d.order_id || '—'}</td>
                      <td className="p-2 border">{d.status || '—'}</td>
                      <td className="p-2 border text-right">{d.total_amount ? `$${'{'}Number(d.total_amount).toFixed(2){'}'}` : '—'}</td>
                      <td className="p-2 border text-xs text-gray-500">{d.id.slice(0,8)}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="text-sm text-gray-500">No deliveries linked yet.</div>
          )}
          <div className="pt-2 border-t mt-4 text-xs text-gray-400">Bulk assignment UI upgrade in progress; previous textarea method removed.</div>
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
