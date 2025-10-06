"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'

class Boundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message: string }> {
  state = { hasError: false, message: '' }
  static getDerivedStateFromError(err: any) { return { hasError: true, message: err?.message || 'Render error' } }
  componentDidCatch(err: any, info: any) { if (console && console.error) console.error('ProjectDetail boundary error', err, info) }
  render() { if (this.state.hasError) return <div className="p-6 text-sm text-red-600">Failed to render project view: {this.state.message}</div>; return this.props.children }
}

export default function ProjectDetailPage() {
  const params = useParams() as { id: string }
  const id = params?.id
  const router = useRouter()
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
      console.log('Project detail: loading project:', id);
      const [p, r] = await Promise.all([
        fetch(`/api/projects/${id}`, { headers: { 'Accept': 'application/json' } }).then(async r=>{
          console.log('Project detail: project response status:', r.status);
          const json = await r.json();
          console.log('Project detail: project response body:', json);
          if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
          return json;
        }),
        fetch(`/api/projects/${id}/rollup`, { headers: { 'Accept': 'application/json' } }).then(async r=>{
          console.log('Project detail: rollup response status:', r.status);
          const json = await r.json();
          console.log('Project detail: rollup response body:', json);
          if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
          return json;
        })
      ])
      console.log('Project detail: about to set project from:', p);
      console.log('Project detail: about to set rollup from:', r);
      
      // Handle both wrapped and unwrapped responses
      const projectData = p.data || p;
      const rollupData = r.data || r;
      
      console.log('Project detail: setting project to:', projectData);
      console.log('Project detail: setting rollup to:', rollupData);
      
      if (!projectData) throw new Error('No project data received');
      
      setProject(projectData)
      setRollup(rollupData)
    } catch (e:any) {
      console.error('Project detail: load error:', e);
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
      console.log('Project detail: fetching orders for project:', id);
      const res = await fetch(`/api/orders?projectId=${encodeURIComponent(id)}`)
      const j = await res.json().catch(()=>[])
      console.log('Project detail: orders response:', j);
      const ordersList = Array.isArray(j)? j : (j?.data || j || []);
      console.log('Project detail: setting orders:', ordersList);
      if (!aborted) setOrders(ordersList)
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

  async function createTestOrder() {
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${id}/create-test-order`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (res.ok) {
        const result = await res.json()
        alert(`Success: ${result.message}`)
        // Refresh data to show the new order
        load()
        // Switch to Orders tab to show the result
        setTab('orders')
      } else {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed: ${error.error}`)
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setSaving(false)
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

  // Hooks must not appear after conditional returns; prepare memoized formatter early
  const fmtCurrency = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }), [])

  if (!id) return null
  if (!project) return (
    <AppLayout>
      <div className="p-6">
      {error ? (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 p-3">
          <div className="font-medium mb-1">Couldn’t load project</div>
          <div className="text-sm">{error}</div>
        </div>
      ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-3">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <div className="text-gray-600">Loading project details...</div>
            </div>
          </div>
      )}
      </div>
    </AppLayout>
  )

  const variance = Number(rollup?.variance || 0)

  return (
    <AppLayout>
      <Boundary>
        <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <button onClick={()=>router.push('/projects')} className="h-9 px-3 rounded-lg border bg-white hover:bg-gray-50 text-sm flex items-center gap-1 shadow-sm">
            <span className="text-lg leading-none -ml-1">←</span>
            <span>Projects</span>
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              {project.code && <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">{project.code}</span>}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <div>Created: {project?.created_at ? new Date(project.created_at).toLocaleDateString() : '—'}</div>
              <div>Updated: {project?.updated_at ? new Date(project.updated_at).toLocaleDateString() : '—'}</div>
              <div>ID: <span className="font-mono">{project?.id ? project.id.slice(0,8)+'…' : '—'}</span></div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <label className="text-sm text-gray-600" htmlFor="project-status">Status</label>
          <select id="project-status" value={project.status} onChange={e=>updateStatus(e.target.value)} className="border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="closed">Closed</option>
          </select>
          <button onClick={()=>load()} className="h-9 px-3 rounded-lg border bg-white hover:bg-gray-50 text-sm shadow-sm">Refresh</button>
          <button onClick={()=>createTestOrder()} disabled={saving} className="h-9 px-3 rounded-lg border bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 text-sm shadow-sm">
            {saving ? 'Creating...' : 'Create Test Order'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <KPI title="Budget" value={fmtCurrency.format(Number(project.budget||0))} />
        <KPI title="Actual (Expenses)" value={fmtCurrency.format(Number(rollup?.actual_expenses||0))} />
        <KPI title="Variance" value={fmtCurrency.format(variance)} emphasize={variance<0? 'bad':'good'} />
        <KPI title="# Orders" value={String(rollup?.counts?.orders||0)} />
        <KPI title="# Expenses" value={String(rollup?.counts?.expenses||0)} />
        <KPI title="# Deliveries" value={String(rollup?.counts?.deliveries||0)} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto scrollbar-none -mx-6 px-6 sticky top-0 bg-gray-50/60 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        {(['overview','orders','expenses','deliveries'] as const).map(t=> {
          const active = tab===t
          return (
            <button
              key={t}
              onClick={()=>setTab(t)}
              className={`relative px-5 py-2 text-sm font-medium transition-colors ${active? 'text-blue-700':'text-gray-600 hover:text-gray-900'}`}
            >
              {t[0].toUpperCase()+t.slice(1)}
              <span className={`absolute left-0 right-0 -bottom-px h-0.5 rounded-full transition-all ${active? 'bg-blue-600 scale-x-100':'bg-transparent scale-x-0'}`} />
            </button>
          )
        })}
      </div>

      {tab==='overview' && (
        <div className="bg-white border rounded p-4">Budget vs Actual chart coming soon.</div>
      )}

      {tab!=='overview' && (
        <div className="bg-white border rounded p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium capitalize">{tab}</h2>
            <div className="flex items-center gap-2">
              <button onClick={()=>setTab(tab)} disabled className="text-xs text-gray-400 border rounded px-2 py-1 cursor-default">Linked</button>
              {tab==='orders' && (
                <button
                  onClick={async ()=>{
                    try {
                      const res = await fetch(`/api/projects/${id}/test-order`, { method: 'POST' });
                      if (!res.ok) throw new Error('Failed to create test order');
                      // Reload orders tab
                      setTab('orders');
                    } catch (e) { alert((e as any)?.message || 'Failed'); }
                  }}
                  className="text-xs text-blue-600 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50"
                >Create test order</button>
              )}
            </div>
          </div>
          {loadingTab && <div className="text-sm text-gray-500">Loading {tab}…</div>}
          {!loadingTab && tab==='expenses' && (
            expenses.length? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr className="divide-x">
                      <th className="text-left p-2">Vendor</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-right p-2">Amount</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {expenses.map(e=> (
                      <tr key={e.id} className="hover:bg-blue-50/50">
                        <td className="p-2 font-medium">{e.vendor}</td>
                        <td className="p-2 capitalize">{e.category}</td>
                        <td className="p-2 text-right tabular-nums">{fmtCurrency.format(Number(e.amount||0))}</td>
                        <td className="p-2"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 border border-green-200">{e.status}</span></td>
                        <td className="p-2 text-xs">{e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}</td>
                        <td className="p-2 text-xs text-gray-500 font-mono">{e.id.slice(0,8)}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="text-sm text-gray-500">No expenses linked yet.</div>
          )}
          {!loadingTab && tab==='orders' && (
            orders.length? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr className="divide-x">
                      <th className="text-left p-2">Product</th>
                      <th className="text-left p-2">Vendor</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-right p-2">Amount</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map(o=> (
                      <tr key={o.id} className="hover:bg-blue-50/50">
                        <td className="p-2 font-medium">{o.product?.name || '—'}</td>
                        <td className="p-2">{o.vendor || o.product?.vendor || '—'}</td>
                        <td className="p-2 text-right">{o.qty ?? '—'}</td>
                        <td className="p-2 text-right tabular-nums">{o.product?.price && o.qty ? fmtCurrency.format(Number(o.product.price)*Number(o.qty)) : '—'}</td>
                        <td className="p-2"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">{o.status}</span></td>
                        <td className="p-2 text-xs">{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                        <td className="p-2 text-xs text-gray-500 font-mono">{o.id.slice(0,8)}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="text-sm text-gray-500">No orders linked yet.</div>
          )}
          {!loadingTab && tab==='deliveries' && (
            deliveries.length? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr className="divide-x">
                      <th className="text-left p-2">Delivery</th>
                      <th className="text-left p-2">Items</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {deliveries.map(d=> (
                      <tr key={d.id} className="hover:bg-blue-50/50">
                        <td className="p-2 font-medium">{d.order_id || '—'}</td>
                        <td className="p-2 text-xs leading-tight max-w-[240px]">{Array.isArray(d.items)&&d.items.length? d.items.map((it:any)=>`${it.product_name}(${it.quantity})`).slice(0,4).join(', ')+(d.items.length>4?'…':'') : '—'}</td>
                        <td className="p-2"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200">{d.status || '—'}</span></td>
                        <td className="p-2 text-right tabular-nums">{d.total_amount != null ? fmtCurrency.format(Number(d.total_amount||0)) : '—'}</td>
                        <td className="p-2 text-xs">{d.delivery_date ? new Date(d.delivery_date).toLocaleDateString() : (d.created_at ? new Date(d.created_at).toLocaleDateString() : '—')}</td>
                        <td className="p-2 text-xs text-gray-500 font-mono">{d.id.slice(0,8)}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="text-sm text-gray-500">No deliveries linked yet.</div>
          )}
          <div className="pt-2 border-t mt-4 text-xs text-gray-400">Bulk assignment UI upgrade in progress; previous textarea method removed.</div>
        </div>
      )}
        </div>
      </Boundary>
    </AppLayout>
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
