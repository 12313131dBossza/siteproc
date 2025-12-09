"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'
import { AddItemModal } from '@/components/AddItemModal'
import { ProjectAccessModal } from '@/components/ProjectAccessModal'
import ProjectTimeline from '@/components/ProjectTimeline'
import ProjectPhotoGallery from '@/components/ProjectPhotoGallery'
import ProjectChat from '@/components/ProjectChat'
import { hasPermission } from '@/lib/roles'
import { useCurrency } from '@/lib/CurrencyContext'
import { 
  Plus, 
  Users, 
  ArrowLeft, 
  RefreshCw, 
  ChevronDown,
  Package,
  Receipt,
  Truck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3,
  Calendar,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  MessageCircle,
  Trash2,
  Pencil,
  X
} from 'lucide-react'
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
  const [tab, setTab] = useState<'overview'|'orders'|'expenses'|'deliveries'|'gallery'>('overview')
  // Modal state for adding items
  const [showAddModal, setShowAddModal] = useState<'order' | 'expense' | 'delivery' | null>(null)
  // Modal state for project access
  const [showAccessModal, setShowAccessModal] = useState(false)
  // Modal state for editing project
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', budget: '', project_number: '' })
  // Chat state
  const [showChat, setShowChat] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  // Assignment textarea state (kept for fallback bulk paste modal later)
  const [assign, setAssign] = useState({ orders: '', expenses: '', deliveries: '' })
  // Loaded items for each tab
  const [orders, setOrders] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loadingTab, setLoadingTab] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string|undefined>()

  // Extract user permissions from project data
  const permissions = project?.userPermissions || {
    view_project: true,
    view_orders: true,
    view_expenses: false,
    view_payments: false,
    view_documents: true,
    edit_project: false,
    create_orders: false,
    upload_documents: false,
    invite_others: false,
  }
  const userRole = project?.userRole || 'viewer'
  
  // Use centralized role-based permissions
  const canEdit = hasPermission(userRole, 'project.edit')
  const canCreate = hasPermission(userRole, 'order.create')
  const canInvite = hasPermission(userRole, 'user.invite')
  const canDelete = hasPermission(userRole, 'project.delete')
  const canEditMilestones = hasPermission(userRole, 'milestone.edit')

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
      
      // Get current user ID from the project response
      if (projectData.currentUserId) {
        setCurrentUserId(projectData.currentUserId)
      }
    } catch (e:any) {
      console.error('Project detail: load error:', e);
      setError(e?.message || 'Failed to load project')
    }
  }
  useEffect(() => { if (id) load() }, [id])

  // Fetch tab-specific data when tab changes
  useEffect(() => {
    if (!id || tab==='overview' || tab==='gallery') return
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
      const errorData = await res.json().catch(()=>({}))
      alert(errorData.error || 'Failed to update status')
    }
  }

  async function deleteProject() {
    if (!confirm(`Are you sure you want to delete "${project?.name}"?\n\nThis action cannot be undone.`)) return
    
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (res.ok) {
        alert('Project deleted successfully')
        router.push('/projects')
      } else {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }))
        alert(error.error || 'Failed to delete project')
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    }
  }

  function openEditModal() {
    setEditForm({
      name: project?.name || '',
      budget: project?.budget?.toString() || '',
      project_number: project?.project_number || project?.code || ''
    })
    setShowEditModal(true)
  }

  async function saveProjectDetails() {
    setSaving(true)
    try {
      const updates: any = {}
      if (editForm.name.trim()) updates.name = editForm.name.trim()
      if (editForm.budget) updates.budget = parseFloat(editForm.budget)
      if (editForm.project_number.trim()) updates.project_number = editForm.project_number.trim()

      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (res.ok) {
        const data = await res.json()
        setProject(data.data || data)
        setShowEditModal(false)
      } else {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }))
        alert(error.error || 'Failed to update project')
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setSaving(false)
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
  const { formatAmount: fmtCurrencyFn } = useCurrency()
  const fmtCurrency = useMemo(() => ({ format: fmtCurrencyFn }), [fmtCurrencyFn])

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <button 
            onClick={()=>router.push('/projects')} 
            className="h-10 w-10 rounded-lg border bg-white hover:bg-gray-50 flex items-center justify-center shadow-sm transition-all hover:shadow-md"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">{project.name}</h1>
              {project.code && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-100">
                  {project.code}
                </span>
              )}
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                project.status === 'active' 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : project.status === 'on_hold'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : project.status === 'completed'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : project.status === 'cancelled'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-gray-50 text-gray-700 border-gray-200'
              }`}>
                {project.status === 'planning' ? '◇ Planning' 
                  : project.status === 'active' ? '● Active' 
                  : project.status === 'on_hold' ? '◐ On Hold' 
                  : project.status === 'completed' ? '✓ Completed'
                  : project.status === 'cancelled' ? '✕ Cancelled'
                  : project.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Created {project?.created_at ? format(project.created_at, 'MMM dd, yyyy') : '—'}
              </div>
              <span className="text-gray-400">•</span>
              <div>Last updated {project?.updated_at ? format(project.updated_at, 'MMM dd, yyyy') : '—'}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit ? (
            <select 
              id="project-status" 
              value={project.status} 
              onChange={e=>updateStatus(e.target.value)} 
              className="h-10 border border-gray-200 rounded-lg px-3 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm font-medium cursor-pointer"
            >
              <option value="planning">◇ Planning</option>
              <option value="active">● Active</option>
              <option value="on_hold">◐ On Hold</option>
              <option value="completed">✓ Completed</option>
              <option value="cancelled">✕ Cancelled</option>
            </select>
          ) : (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
              project.status === 'active' 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : project.status === 'on_hold'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : project.status === 'completed'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : project.status === 'cancelled'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-gray-50 text-gray-700 border-gray-200'
            }`}>
              {project.status === 'planning' ? '◇ Planning' 
                : project.status === 'active' ? '● Active' 
                : project.status === 'on_hold' ? '◐ On Hold' 
                : project.status === 'completed' ? '✓ Completed'
                : project.status === 'cancelled' ? '✕ Cancelled'
                : project.status}
            </span>
          )}
          <button onClick={()=>load()} className="h-10 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700 shadow-sm flex items-center gap-2 font-medium transition-all hover:shadow-md">
            <RefreshCw className="h-4 w-4 text-gray-600" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {canEdit && (
            <button 
              onClick={openEditModal} 
              className="h-10 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700 shadow-sm flex items-center gap-2 font-medium transition-all hover:shadow-md"
              title="Edit project details"
            >
              <Pencil className="h-4 w-4 text-gray-600" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          )}
          {canInvite && (
            <button 
              onClick={() => setShowAccessModal(true)} 
              className="h-10 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700 shadow-sm flex items-center gap-2 font-medium transition-all hover:shadow-md"
              title="Manage project access"
            >
              <Users className="h-4 w-4 text-gray-600" />
              <span className="hidden sm:inline">Access</span>
            </button>
          )}
          {canDelete && (
            <button 
              onClick={deleteProject} 
              className="h-10 px-4 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 text-sm shadow-sm flex items-center gap-2 font-medium transition-all hover:shadow-md"
              title="Delete project"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}
          {canCreate && (
            <button 
              onClick={() => setShowAddModal('order')} 
              className="h-10 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm shadow-sm flex items-center gap-2 font-medium transition-all hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              Quick Add
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto scrollbar-none -mx-6 px-6 sticky top-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 z-10">
        {([
          { key: 'overview', label: 'Overview', icon: BarChart3, count: null, permission: 'view_project' },
          { key: 'orders', label: 'Orders', icon: Package, count: rollup?.counts?.orders || 0, permission: 'view_orders' },
          { key: 'expenses', label: 'Expenses', icon: Receipt, count: rollup?.counts?.expenses || 0, permission: 'view_expenses' },
          { key: 'deliveries', label: 'Deliveries', icon: Truck, count: rollup?.counts?.deliveries || 0, permission: 'view_orders' },
          { key: 'gallery', label: 'Photos', icon: ImageIcon, count: null, permission: 'view_documents' },
        ] as const).filter(t => permissions[t.permission as keyof typeof permissions]).map(t => {
          const active = tab === t.key
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={()=>setTab(t.key)}
              className={`relative px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
                active ? 'text-blue-700' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
              {t.label}
              {t.count !== null && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  active 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {t.count}
                </span>
              )}
              <span className={`absolute left-0 right-0 -bottom-px h-0.5 rounded-full transition-all ${
                active ? 'bg-blue-600 scale-x-100' : 'bg-transparent scale-x-0'
              }`} />
            </button>
          )
        })}
      </div>

      {tab==='overview' && (
        <div className="space-y-6">
          {/* Budget Hero Card */}
          <div className={`relative overflow-hidden rounded-2xl p-6 ${
            variance < 0 
              ? 'bg-gradient-to-br from-red-500 to-red-600' 
              : variance < (Number(project.budget) * 0.2)
              ? 'bg-gradient-to-br from-amber-500 to-orange-500'
              : 'bg-gradient-to-br from-blue-500 to-blue-600'
          }`}>
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <pattern id="grid" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="white" />
                </pattern>
                <rect x="0" y="0" width="100" height="100" fill="url(#grid)" />
              </svg>
            </div>
            
            <div className="relative">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white/80 text-sm font-medium mb-1">Budget Utilization</h3>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-bold text-white">
                        {project.budget > 0 
                          ? `${Math.round((Number(project.actual_cost || rollup?.actual_cost || 0) / Number(project.budget)) * 100)}%`
                          : '0%'
                        }
                      </span>
                      <span className="text-white/70 text-sm">spent</span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full max-w-md">
                    <div className="h-3 bg-white/20 rounded-full overflow-hidden backdrop-blur">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                        style={{ 
                          width: `${Math.min(100, Math.round((Number(project.actual_cost || rollup?.actual_cost || 0) / Number(project.budget || 1)) * 100))}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                    variance < 0 
                      ? 'bg-white/20 text-white' 
                      : variance < (Number(project.budget) * 0.2)
                      ? 'bg-white/20 text-white'
                      : 'bg-white/20 text-white'
                  }`}>
                    {variance < 0 ? (
                      <>
                        <AlertTriangle className="h-4 w-4" />
                        Over budget by {fmtCurrency.format(Math.abs(variance))}
                      </>
                    ) : variance < (Number(project.budget) * 0.2) ? (
                      <>
                        <Clock className="h-4 w-4" />
                        {fmtCurrency.format(variance)} remaining
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        {fmtCurrency.format(variance)} remaining
                      </>
                    )}
                  </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 lg:gap-6">
                  <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                    <div className="text-white/70 text-xs font-medium mb-1">Budget</div>
                    <div className="text-xl font-bold text-white">
                      {fmtCurrency.format(Number(project.budget || 0))}
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                    <div className="text-white/70 text-xs font-medium mb-1">Actual</div>
                    <div className="text-xl font-bold text-white">
                      {fmtCurrency.format(Number(project.actual_cost || rollup?.actual_cost || 0))}
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                    <div className="text-white/70 text-xs font-medium mb-1">
                      {variance < 0 ? 'Over' : 'Under'}
                    </div>
                    <div className="text-xl font-bold text-white">
                      {fmtCurrency.format(Math.abs(variance))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Project Activity</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard 
                icon={<Package className="h-5 w-5" />}
                label="Orders"
                value={rollup?.counts?.orders || 0}
                color="blue"
                onClick={() => setTab('orders')}
              />
              <StatCard 
                icon={<Receipt className="h-5 w-5" />}
                label="Expenses"
                value={rollup?.counts?.expenses || 0}
                color="purple"
                onClick={() => setTab('expenses')}
              />
              <StatCard 
                icon={<Truck className="h-5 w-5" />}
                label="Deliveries"
                value={rollup?.counts?.deliveries || 0}
                color="green"
                onClick={() => setTab('deliveries')}
              />
            </div>
          </div>

          {/* Timeline */}
          <ProjectTimeline 
            projectId={id}
            projectStatus={project.status}
            projectStartDate={project.created_at}
            projectEndDate={project.end_date}
            canEdit={canEdit}
          />
        </div>
      )}

      {/* Gallery Tab */}
      {tab === 'gallery' && (
        <ProjectPhotoGallery projectId={id} />
      )}

      {tab!=='overview' && tab!=='gallery' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold capitalize flex items-center gap-2">
              {tab === 'orders' && <Package className="h-5 w-5 text-blue-500" />}
              {tab === 'expenses' && <Receipt className="h-5 w-5 text-purple-500" />}
              {tab === 'deliveries' && <Truck className="h-5 w-5 text-green-500" />}
              {tab}
            </h2>
            {canCreate && (
              <button
                onClick={() => setShowAddModal(tab === 'orders' ? 'order' : tab === 'expenses' ? 'expense' : 'delivery')}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                Add {tab === 'orders' ? 'Order' : tab === 'expenses' ? 'Expense' : 'Delivery'}
              </button>
            )}
          </div>
          
          {loadingTab && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          )}
          
          {!loadingTab && tab==='expenses' && (
            expenses.length? (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Vendor</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Amount</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {expenses.map(e=> (
                      <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{e.vendor}</td>
                        <td className="px-4 py-3 text-gray-600 capitalize">{e.category}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmtCurrency.format(Number(e.amount||0))}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            {e.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-sm">{e.created_at ? format(e.created_at, 'MMM dd, yyyy') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState 
                icon={<Receipt className="h-12 w-12" />}
                title="No expenses yet"
                description={canCreate ? "Get started by adding your first expense to this project." : "No expenses have been added to this project yet."}
                actionLabel="Add Expense"
                onAction={() => setShowAddModal('expense')}
                showAction={canCreate}
              />
            )
          )}
          
          {!loadingTab && tab==='orders' && (
            orders.length? (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Product</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Vendor</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Qty</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Amount</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map(o=> {
                      const productName = o.product_name || o.product?.name || o.description || '—'
                      const vendor = o.vendor || o.category || o.product?.vendor || '—'
                      const quantity = o.quantity || o.qty || '—'
                      const amount = o.amount || (o.unit_price && o.quantity ? o.unit_price * o.quantity : 0)
                      
                      return (
                        <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{productName}</td>
                          <td className="px-4 py-3 text-gray-600">{vendor}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{quantity}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">{amount ? fmtCurrency.format(Number(amount)) : '—'}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              {o.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-sm">{o.created_at ? format(o.created_at, 'MMM dd, yyyy') : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState 
                icon={<Package className="h-12 w-12" />}
                title="No orders yet"
                description={canCreate ? "Create your first purchase order for this project." : "No orders have been created for this project yet."}
                actionLabel="Add Order"
                onAction={() => setShowAddModal('order')}
                showAction={canCreate}
              />
            )
          )}
          
          {!loadingTab && tab==='deliveries' && (
            deliveries.length? (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Delivery</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Items</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">POD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deliveries.map(d=> (
                      <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{d.order_id?.slice(0,8) || '—'}…</td>
                        <td className="px-4 py-3 text-gray-600 text-xs max-w-[200px] truncate">
                          {Array.isArray(d.items) && d.items.length 
                            ? d.items.map((it:any)=>`${it.product_name}(${it.quantity})`).slice(0,3).join(', ')+(d.items.length>3?'…':'') 
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            {d.status || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          {d.total_amount != null ? fmtCurrency.format(Number(d.total_amount||0)) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-sm">
                          {d.delivery_date ? format(d.delivery_date, 'MMM dd, yyyy') : (d.created_at ? format(d.created_at, 'MMM dd, yyyy') : '—')}
                        </td>
                        <td className="px-4 py-3">
                          {d.proof_url ? (
                            <a
                              href={d.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">No proof</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState 
                icon={<Truck className="h-12 w-12" />}
                title="No deliveries yet"
                description={canCreate ? "Track deliveries for this project." : "No deliveries have been recorded for this project yet."}
                actionLabel="Add Delivery"
                onAction={() => setShowAddModal('delivery')}
                showAction={canCreate}
              />
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

      {/* Project Access Modal */}
      <ProjectAccessModal
        projectId={id}
        projectName={project?.name || 'Project'}
        isOpen={showAccessModal}
        onClose={() => setShowAccessModal(false)}
      />

      {/* Edit Project Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Edit Project</h2>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={async (e) => { 
              e.preventDefault()
              setSaving(true)
              try {
                const res = await fetch(`/api/projects/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: editForm.name,
                    budget: editForm.budget ? parseFloat(editForm.budget) : null,
                    project_number: editForm.project_number || null
                  })
                })
                if (!res.ok) {
                  const err = await res.json()
                  throw new Error(err.error || 'Failed to update project')
                }
                setShowEditModal(false)
                load() // Refresh data
              } catch (err: any) {
                alert(err.message)
              } finally {
                setSaving(false)
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Project name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Number
                </label>
                <input
                  type="text"
                  value={editForm.project_number}
                  onChange={(e) => setEditForm({ ...editForm, project_number: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., PRJ-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget
                </label>
                <input
                  type="number"
                  value={editForm.budget}
                  onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Chat */}
      {currentUserId && (
        <ProjectChat
          projectId={id}
          currentUserId={currentUserId}
          isExpanded={showChat}
          onToggle={() => setShowChat(!showChat)}
        />
      )}
    </AppLayout>
  )
}

function KPI({ title, value, emphasize, subtitle }: { title: string; value: string; emphasize?: 'good'|'bad'; subtitle?: string }) {
  const color = emphasize==='good'? 'text-green-600' : emphasize==='bad'? 'text-red-600' : 'text-gray-900'
  return (
    <div className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="text-gray-500 text-sm font-medium">{title}</div>
      <div className={`text-xl font-bold ${color} mt-1`}>{value}</div>
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

// Stat Card component for activity stats
function StatCard({ 
  icon, 
  label, 
  value, 
  color,
  onClick 
}: { 
  icon: React.ReactNode
  label: string
  value: number | string
  color: 'blue' | 'purple' | 'green' | 'red' | 'amber' | 'emerald'
  onClick?: () => void
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-100 hover:border-purple-200',
    green: 'bg-green-50 text-green-600 border-green-100 hover:border-green-200',
    red: 'bg-red-50 text-red-600 border-red-100 hover:border-red-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 hover:border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-200',
  }
  
  const iconBg = {
    blue: 'bg-blue-100',
    purple: 'bg-purple-100',
    green: 'bg-green-100',
    red: 'bg-red-100',
    amber: 'bg-amber-100',
    emerald: 'bg-emerald-100',
  }

  const Component = onClick ? 'button' : 'div'
  
  return (
    <Component 
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all ${colorClasses[color]} ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBg[color]}`}>
          {icon}
        </div>
        <div className="text-left">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm opacity-80">{label}</div>
        </div>
      </div>
    </Component>
  )
}

// Empty state component for tables
function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  showAction = true
}: {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  showAction?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="text-gray-400 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">{description}</p>
      {showAction && actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium shadow-sm hover:shadow-md"
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </div>
  )
}
