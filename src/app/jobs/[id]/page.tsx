"use client"
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useJobRealtime } from '@/lib/useJobRealtime'
import { usePaginatedRealtime } from '@/lib/paginationRealtime'
import { useCompanyId } from '@/lib/useCompanyId'
import { toast } from 'sonner'

export default function JobDashboard() {
  const routeParams = useParams<{ id: string }>()
  const [type, setType] = useState<'expenses'|'bills'>('expenses')
  const companyId = useCompanyId() || undefined
  // Creation state removed in realtime refactor
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [companyIdInput, setCompanyIdInput] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [rtStatus, setRtStatus] = useState<'idle'|'connecting'|'connected'|'error'>('idle')

  const legacyCompanyId = (typeof window !== 'undefined' ? (localStorage.getItem('company_id') || '') : '') || process.env.NEXT_PUBLIC_COMPANY_ID || '00000000-0000-0000-0000-000000000000'
  useEffect(() => { setCompanyIdInput(legacyCompanyId) }, [legacyCompanyId])

  const jobId = routeParams?.id
  const debounceRef = useRef<number | null>(null)
  // Paginated realtime hooks
  const { items: expenses, loadMore: loadMoreExpenses, nextCursor: expensesCursor, loading: loadingExpenses } = usePaginatedRealtime<any>({
    table: 'expenses', companyId,
    id: r=>r.id,
    filter: r=> r.job_id === jobId,
    fetchPage: async ({ companyId, limit, cursor }) => {
      const u = new URL(`/api/expenses?job_id=${jobId}&limit=${limit}`, window.location.origin)
      if (cursor) u.searchParams.set('cursor', cursor)
      const res = await fetch(u.toString(), { headers: { 'x-company-id': companyId } })
      const js = await res.json().catch(()=>({ items: [] }))
      return { items: Array.isArray(js.items)?js.items:[], nextCursor: js.nextCursor||null }
    }
  })
  const { items: deliveries, loadMore: loadMoreDeliveries, nextCursor: deliveriesCursor, loading: loadingDeliveries } = usePaginatedRealtime<any>({
    table: 'deliveries', companyId,
    id: r=>r.id,
    filter: r=> r.job_id === jobId,
    fetchPage: async ({ companyId, limit, cursor }) => {
      const u = new URL(`/api/deliveries?job_id=${jobId}&limit=${limit}`, window.location.origin)
      if (cursor) u.searchParams.set('cursor', cursor)
      const res = await fetch(u.toString(), { headers: { 'x-company-id': companyId } })
      const js = await res.json().catch(()=>({ items: [] }))
      return { items: Array.isArray(js.items)?js.items:[], nextCursor: js.nextCursor||null }
    }
  })
  const { items: costCodes, loadMore: loadMoreCostCodes, nextCursor: costCodesCursor, loading: loadingCostCodes } = usePaginatedRealtime<any>({
    table: 'cost_codes', companyId,
    id: r=>r.id,
    filter: r=> r.job_id === jobId,
    fetchPage: async ({ companyId, limit, cursor }) => {
      const u = new URL(`/api/cost-codes?job_id=${jobId}&limit=${limit}`, window.location.origin)
      if (cursor) u.searchParams.set('cursor', cursor)
      const res = await fetch(u.toString(), { headers: { 'x-company-id': companyId } })
      const js = await res.json().catch(()=>({ items: [] }))
      return { items: Array.isArray(js.items)?js.items:[], nextCursor: js.nextCursor||null }
    }
  })

  // Debounced refetch wrapper used by realtime handlers
  const scheduleFetch = useCallback(() => {}, [])

  useEffect(() => { setLoading(loadingExpenses || loadingDeliveries || loadingCostCodes) }, [loadingExpenses, loadingDeliveries, loadingCostCodes])

  useJobRealtime(jobId, {
  onExpense: () => { toast.success('Expense updated') },
  onDelivery: () => { toast.success('Delivery updated') },
  onCostCode: () => { toast.success('Cost code updated') },
  onStatus: (s) => setRtStatus(s),
  })

  const exportCsv = async () => {
    if (!jobId) return
  const res = await fetch(`/api/jobs/${jobId}/report?format=csv&type=${type}`, { headers: { 'x-company-id': companyId || '' } })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${jobId}-${type}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const costCodeTotals = useMemo(() => {
    if (!expenses.length) return [] as { code: string; description: string; amount: number; pct: number }[]
    const total = expenses.reduce((s,e)=> s + (Number(e.amount)||0), 0) || 1
    const map = new Map<string, { code: string; description: string; amount: number }>()
    for (const cc of costCodes) {
      map.set(cc.id, { code: cc.code, description: cc.description || '', amount: 0 })
    }
    let uncoded = 0
    for (const e of expenses) {
      const amt = Number(e.amount) || 0
      if (e.cost_code_id && map.has(e.cost_code_id)) {
        map.get(e.cost_code_id)!.amount += amt
      } else {
        uncoded += amt
      }
    }
    const rows: { code: string; description: string; amount: number; pct: number }[] = []
    for (const v of map.values()) {
      rows.push({ code: v.code, description: v.description, amount: v.amount, pct: v.amount ? (v.amount/total)*100 : 0 })
    }
    if (uncoded) rows.push({ code: '(Uncoded)', description: 'No cost code', amount: uncoded, pct: (uncoded/total)*100 })
    rows.sort((a,b)=> b.amount - a.amount)
    return rows
  }, [expenses, costCodes])

  const filteredExpenses = useMemo(() => {
    if (!dateFrom && !dateTo) return expenses
    return expenses.filter(e => {
      const d = e.spent_at || e.created_at
      if (!d) return false
      if (dateFrom && d < dateFrom) return false
      if (dateTo && d > dateTo) return false
      return true
    })
  }, [expenses, dateFrom, dateTo])
  const filteredDeliveries = useMemo(() => {
    if (!dateFrom && !dateTo) return deliveries
    return deliveries.filter(d => {
      const dd = d.delivered_at || d.created_at
      if (!dd) return false
      if (dateFrom && dd < dateFrom) return false
      if (dateTo && dd > dateTo) return false
      return true
    })
  }, [deliveries, dateFrom, dateTo])

  const handleLoadMoreExpenses = () => { if (expensesCursor) loadMoreExpenses() }
  const handleLoadMoreDeliveries = () => { if (deliveriesCursor) loadMoreDeliveries() }

  const handleLoadMoreCostCodes = () => { if (costCodesCursor) loadMoreCostCodes() }

  return (
    <div className="p-4 space-y-3">
  <h1 className="text-xl font-semibold flex items-center gap-3">Job Dashboard <RtBadge status={rtStatus} /></h1>
      <div className="flex gap-2 items-center">
        <label className="flex items-center gap-1 text-sm"><input type="radio" name="type" checked={type==='expenses'} onChange={()=>setType('expenses')} /> Expenses</label>
        <label className="flex items-center gap-1 text-sm"><input type="radio" name="type" checked={type==='bills'} onChange={()=>setType('bills')} /> Bills</label>
        <button className="px-3 py-1 bg-black text-white rounded" onClick={exportCsv}>Export CSV</button>
      </div>
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="block text-xs uppercase tracking-wide text-neutral-400">Company ID</label>
          <div className="flex gap-2">
            <input value={companyIdInput} onChange={e=>setCompanyIdInput(e.target.value)} className="px-2 py-1 text-sm bg-neutral-900 border border-neutral-700 rounded w-80" placeholder="UUID" />
            <button
              className="px-3 py-1 text-sm bg-neutral-800 border border-neutral-600 rounded"
              onClick={() => { localStorage.setItem('company_id', companyIdInput.trim()); scheduleFetch(); }}
            >Set</button>
          </div>
        </div>
        <Kpis expenses={expenses} deliveries={deliveries} />
      </div>
  {/* Creation forms removed in lean realtime refactor */}
      {error && <p className="text-sm text-red-500">{error}</p>}
  <p className="text-sm text-gray-500">Realtime: Updates apply automatically when expenses, deliveries, or cost codes change.</p>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 order-2 lg:order-1">
          <h2 className="font-semibold mb-2 flex items-center gap-2">Cost Code Breakdown {loading && <span className="text-xs text-gray-500">Loading…</span>}</h2>
      {costCodeTotals.length ? (
            <div className="border border-neutral-700 rounded divide-y divide-neutral-700 max-h-80 overflow-auto">
              {costCodeTotals.map(r => (
                <div key={r.code} className="p-2 text-xs flex justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-medium">{r.code}</span>
                    {r.description && <span className="text-neutral-500">{r.description}</span>}
                  </div>
                  <div className="text-right">
                    <div>${r.amount.toFixed(2)}</div>
                    <div className="text-neutral-500">{r.pct.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
        {costCodesCursor && <button onClick={loadMoreCostCodes} className="w-full text-[10px] py-1 hover:bg-neutral-800">Load more cost codes…</button>}
            </div>
          ) : <div className="text-xs text-neutral-500">No spend yet.</div>}
        </div>
        <div className="lg:col-span-1 order-1 lg:order-2">
          <h2 className="font-semibold mb-2 flex items-center gap-2">Expenses {loading && <span className="text-xs text-gray-500">Loading…</span>}</h2>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="space-y-1">
              <label className="block text-xs uppercase tracking-wide text-neutral-400">From</label>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="px-2 py-1 text-sm bg-neutral-900 border border-neutral-700 rounded" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs uppercase tracking-wide text-neutral-400">To</label>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="px-2 py-1 text-sm bg-neutral-900 border border-neutral-700 rounded" />
            </div>
            <button className="mt-5 px-2 py-1 text-xs border border-neutral-600 rounded" onClick={()=>{ setDateFrom(''); setDateTo('') }}>Reset</button>
          </div>
      {filteredExpenses.length ? (
            <div className="border border-neutral-700 rounded divide-y divide-neutral-700">
              {filteredExpenses.slice(0,20).map(e => (
                <div key={e.id} className="p-2 text-sm flex justify-between">
                  <span>{e.memo || 'Expense'} <span className="text-xs text-neutral-500">{e.spent_at}</span></span>
                  <span>${e.amount}</span>
                </div>
              ))}
        {expensesCursor && <button onClick={loadMoreExpenses} className="w-full text-xs py-2 hover:bg-neutral-800">Load more…</button>}
            </div>
          ) : <div className="text-xs text-neutral-500">No expenses.</div>}
        </div>
        <div className="lg:col-span-1 order-3">
          <h2 className="font-semibold mb-2 flex items-center gap-2">Deliveries {loading && <span className="text-xs text-gray-500">Loading…</span>}</h2>
      {filteredDeliveries.length ? (
            <div className="border border-neutral-700 rounded divide-y divide-neutral-700">
              {filteredDeliveries.slice(0,20).map(d => (
                <div key={d.id} className="p-2 text-sm flex justify-between">
                  <span>Delivery <span className="text-xs text-neutral-500">{d.status}</span></span>
                  <span className="text-xs text-neutral-500">{d.delivered_at ? 'Delivered' : 'Pending'}</span>
                </div>
              ))}
        {deliveriesCursor && <button onClick={loadMoreDeliveries} className="w-full text-xs py-2 hover:bg-neutral-800">Load more…</button>}
            </div>
          ) : <div className="text-xs text-neutral-500">No deliveries.</div>}
        </div>
      </div>
    </div>
  )
}

function Kpis({ expenses, deliveries }: { expenses: any[]; deliveries: any[] }) {
  const safeExpenses = Array.isArray(expenses) ? expenses : []
  const total = safeExpenses.reduce((sum, e) => sum + (Number(e.amount)||0), 0)
  const delivered = deliveries.filter(d => d.status === 'delivered').length
  const pct = deliveries.length ? Math.round((delivered / deliveries.length) * 100) : 0
  return (
    <div className="flex gap-4 text-sm">
      <div className="px-3 py-2 rounded bg-neutral-900 border border-neutral-700">
        <div className="text-xs uppercase tracking-wide text-neutral-400">Total Spend</div>
        <div className="font-semibold">${total.toFixed(2)}</div>
      </div>
      <div className="px-3 py-2 rounded bg-neutral-900 border border-neutral-700">
        <div className="text-xs uppercase tracking-wide text-neutral-400">Deliveries</div>
        <div className="font-semibold">{delivered}/{deliveries.length} ({pct}%)</div>
      </div>
    </div>
  )
}

function RtBadge({ status }: { status: 'idle'|'connecting'|'connected'|'error' }) {
  const color = status === 'connected' ? 'bg-emerald-500' : status === 'connecting' ? 'bg-amber-500' : status === 'error' ? 'bg-red-500' : 'bg-neutral-600'
  const label = status === 'idle' ? 'Idle' : status === 'connecting' ? 'Connecting' : status === 'connected' ? 'Live' : 'Error'
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900">
      <span className={`w-2 h-2 rounded-full ${color} animate-pulse`}></span>{label}
    </span>
  )
}
