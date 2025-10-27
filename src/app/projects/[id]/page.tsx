"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'
import { AddItemModal } from '@/components/AddItemModal'
import { Plus } from 'lucide-react'
import { format } from '@/lib/date-format'

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
  // Modal state for adding items
  const [showAddModal, setShowAddModal] = useState<'order' | 'expense' | 'delivery' | null>(null)
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
            const expensesList = j.data || j.expenses || []
            console.log('All expenses:', expensesList)
            const filtered = expensesList.filter((e:any)=>e.project_id===id)
            console.log('Filtered expenses for project', id, ':', filtered)
            if (!aborted) setExpenses(filtered)
    } else if (tab==='orders') {
      console.log('Project detail: fetching orders for project:', id);
      const res = await fetch(`/api/orders?project_id=${encodeURIComponent(id)}`)
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
              <div>Created: {project?.created_at ? format(project.created_at, 'MMM dd, yyyy') : '—'}</div>
              <div>Updated: {project?.updated_at ? format(project.updated_at, 'MMM dd, yyyy') : '—'}</div>
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
          <button onClick={()=>load()} className="h-9 px-3 rounded-lg border bg-white hover:bg-gray-50 text-sm shadow-sm flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button 
            onClick={() => setShowAddModal('order')} 
            className="h-9 px-3 rounded-lg border bg-blue-600 text-white hover:bg-blue-700 text-sm shadow-sm flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Quick Add
          </button>
        </div>
      </div>

      {/* KPIs with Auto-Calc */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <KPI title="Budget" value={fmtCurrency.format(Number(project.budget||0))} />
        <KPI 
          title="Actual Cost" 
          value={fmtCurrency.format(Number(project.actual_cost || rollup?.actual_cost || 0))} 
          subtitle="Auto-synced" 
        />
        <KPI 
          title="Variance" 
          value={fmtCurrency.format(Number(project.variance !== undefined ? project.variance : variance))} 
          emphasize={variance<0? 'bad':'good'} 
          subtitle={variance < 0 ? "Over budget" : variance > 0 ? "Under budget" : "Exact"}
        />
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
        <div className="space-y-6">
          {/* Budget Progress */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Budget Utilization</h3>
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Spent</span>
                  <span className="font-medium">
                    {project.budget > 0 
                      ? `${Math.round((Number(project.actual_cost || rollup?.actual_cost || 0) / Number(project.budget)) * 100)}%`
                      : '0%'
                    }
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      variance < 0 
                        ? 'bg-red-500' 
                        : variance < (Number(project.budget) * 0.2)
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ 
                      width: `${Math.min(100, Math.round((Number(project.actual_cost || rollup?.actual_cost || 0) / Number(project.budget || 1)) * 100))}%` 
                    }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Budgeted</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {fmtCurrency.format(Number(project.budget || 0))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Actual Cost (Auto-synced)</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {fmtCurrency.format(Number(project.actual_cost || rollup?.actual_cost || 0))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Remaining</div>
                  <div className={`text-lg font-semibold ${variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {fmtCurrency.format(Math.abs(variance))}
                    {variance < 0 && ' over'}
                  </div>
                </div>
              </div>

              {/* Status Message */}
              {variance < 0 ? (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-red-500 text-lg">⚠️</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-red-900">Over Budget</div>
                    <div className="text-xs text-red-700 mt-0.5">
                      This project has exceeded its budget by {fmtCurrency.format(Math.abs(variance))}. 
                      Consider revising the budget or reducing expenses.
                    </div>
                  </div>
                </div>
              ) : variance < (Number(project.budget) * 0.2) ? (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <span className="text-yellow-500 text-lg">⚡</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-yellow-900">Approaching Budget Limit</div>
                    <div className="text-xs text-yellow-700 mt-0.5">
                      Less than 20% budget remaining. Monitor expenses closely.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-green-500 text-lg">✓</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-green-900">On Track</div>
                    <div className="text-xs text-green-700 mt-0.5">
                      Budget is healthy with {fmtCurrency.format(variance)} remaining.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Project Activity</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{rollup?.counts?.orders || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Orders</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">{rollup?.counts?.expenses || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Expenses</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{rollup?.counts?.deliveries || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Deliveries</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab!=='overview' && (
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold capitalize">{tab}</h2>
            <button
              onClick={() => setShowAddModal(tab === 'orders' ? 'order' : tab === 'expenses' ? 'expense' : 'delivery')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add {tab === 'orders' ? 'Order' : tab === 'expenses' ? 'Expense' : 'Delivery'}
            </button>
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
                        <td className="p-2 text-xs">{e.created_at ? format(e.created_at, 'MMM dd, yyyy') : '—'}</td>
                        <td className="p-2 text-xs text-gray-500 font-mono">{e.id.slice(0,8)}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-3">
                  <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No expenses yet</h3>
                <p className="text-sm text-gray-500 mb-4">Get started by adding your first expense to this project.</p>
                <button
                  onClick={() => setShowAddModal('expense')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Expense
                </button>
              </div>
            )
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
                    {orders.map(o=> {
                      // Support both old and new field formats
                      const productName = o.product_name || o.product?.name || o.description || '—'
                      const vendor = o.vendor || o.category || o.product?.vendor || '—'
                      const quantity = o.quantity || o.qty || '—'
                      const amount = o.amount || (o.unit_price && o.quantity ? o.unit_price * o.quantity : 0)
                      
                      return (
                        <tr key={o.id} className="hover:bg-blue-50/50">
                          <td className="p-2 font-medium">{productName}</td>
                          <td className="p-2">{vendor}</td>
                          <td className="p-2 text-right">{quantity}</td>
                          <td className="p-2 text-right tabular-nums">{amount ? fmtCurrency.format(Number(amount)) : '—'}</td>
                          <td className="p-2"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">{o.status}</span></td>
                          <td className="p-2 text-xs">{o.created_at ? format(o.created_at, 'MMM dd, yyyy') : '—'}</td>
                          <td className="p-2 text-xs text-gray-500 font-mono">{o.id.slice(0,8)}…</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-3">
                  <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No orders yet</h3>
                <p className="text-sm text-gray-500 mb-4">Create your first purchase order for this project.</p>
                <button
                  onClick={() => setShowAddModal('order')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Order
                </button>
              </div>
            )
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
                      <th className="text-left p-2">POD</th>
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
                        <td className="p-2 text-xs">{d.delivery_date ? format(d.delivery_date, 'MMM dd, yyyy') : (d.created_at ? format(d.created_at, 'MMM dd, yyyy') : '—')}</td>
                        <td className="p-2">
                          {d.proof_url ? (
                            <a
                              href={d.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                              title="View Proof of Delivery"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">No proof</span>
                          )}
                        </td>
                        <td className="p-2 text-xs text-gray-500 font-mono">{d.id.slice(0,8)}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-3">
                  <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No deliveries yet</h3>
                <p className="text-sm text-gray-500 mb-4">Track deliveries for this project.</p>
                <button
                  onClick={() => setShowAddModal('delivery')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Delivery
                </button>
              </div>
            )
          )}
        </div>
      )}
        </div>
      </Boundary>

      {/* Add Item Modal */}
      {showAddModal && (
        <AddItemModal
          isOpen={!!showAddModal}
          onClose={() => setShowAddModal(null)}
          projectId={id}
          type={showAddModal}
          onSuccess={() => {
            // Reload data
            load();
            // Show success message
            alert(`${showAddModal.charAt(0).toUpperCase() + showAddModal.slice(1)} added successfully!`);
          }}
        />
      )}
    </AppLayout>
  )
}

function KPI({ title, value, emphasize, subtitle }: { title: string; value: string; emphasize?: 'good'|'bad'; subtitle?: string }) {
  const color = emphasize==='good'? 'text-green-600' : emphasize==='bad'? 'text-red-600' : 'text-gray-900'
  return (
    <div className="bg-white border rounded p-4">
      <div className="text-gray-500 text-sm">{title}</div>
      <div className={`text-xl font-semibold ${color}`}>{value}</div>
      {subtitle && (
        <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
          {emphasize === 'good' && <span className="text-green-500">✓</span>}
          {emphasize === 'bad' && <span className="text-red-500">⚠</span>}
          {subtitle}
        </div>
      )}
    </div>
  )
}
