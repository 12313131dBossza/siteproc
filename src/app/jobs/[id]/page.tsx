"use client"
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useJobRealtime } from '@/lib/useJobRealtime'

export default function JobDashboard() {
  const routeParams = useParams<{ id: string }>()
  const [type, setType] = useState<'expenses'|'bills'>('expenses')
  const [expenses, setExpenses] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [costCodes, setCostCodes] = useState<any[]>([])
  const [costCodesCursor, setCostCodesCursor] = useState<string | null>(null)
  const [expensesCursor, setExpensesCursor] = useState<string | null>(null)
  const [deliveriesCursor, setDeliveriesCursor] = useState<string | null>(null)
  const [creatingExpense, setCreatingExpense] = useState(false)
  const [newExpenseAmount, setNewExpenseAmount] = useState('')
  const [newExpenseMemo, setNewExpenseMemo] = useState('')
  const [creatingDelivery, setCreatingDelivery] = useState(false)
  const [deliveryItemDesc, setDeliveryItemDesc] = useState('')
  const [deliveryItemQty, setDeliveryItemQty] = useState('1')
  const [creatingCostCode, setCreatingCostCode] = useState(false)
  const [newCostCodeCode, setNewCostCodeCode] = useState('')
  const [newCostCodeDesc, setNewCostCodeDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [companyIdInput, setCompanyIdInput] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([])
  const [rtStatus, setRtStatus] = useState<'idle'|'connecting'|'connected'|'error'>('idle')

  const companyId = (typeof window !== 'undefined' ? (localStorage.getItem('company_id') || '') : '') || process.env.NEXT_PUBLIC_COMPANY_ID || '00000000-0000-0000-0000-000000000000'
  useEffect(() => { setCompanyIdInput(companyId) }, [companyId])

  const jobId = routeParams?.id
  const debounceRef = useRef<number | null>(null)
  const toastIdRef = useRef(0)

  function pushToast(msg: string) {
    const id = ++toastIdRef.current
    setToasts(t => [...t, { id, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }

  const doFetch = useCallback(async () => {
    if (!jobId) return
    setLoading(true)
    setError('')
    try {
      const [expRes, delRes, ccRes] = await Promise.all([
        fetch(`/api/expenses?job_id=${jobId}&limit=50`, { headers: { 'x-company-id': companyId } }),
        fetch(`/api/deliveries?job_id=${jobId}&limit=50`, { headers: { 'x-company-id': companyId } }),
  fetch(`/api/cost-codes?job_id=${jobId}&limit=50`, { headers: { 'x-company-id': companyId } }),
      ])
      const [expJson, delJson, ccJson] = await Promise.all([
        expRes.json().catch(()=>({ items: [] })),
        delRes.json().catch(()=>({ items: [] })),
        ccRes.json().catch(()=>({ items: [] })),
      ])
      if (!expRes.ok) throw new Error(expJson?.error || 'Failed expenses')
      if (!delRes.ok) throw new Error(delJson?.error || 'Failed deliveries')
      if (!ccRes.ok) throw new Error(ccJson?.error || 'Failed cost codes')
      const norm = (d:any) => Array.isArray(d) ? d : (Array.isArray(d?.items) ? d.items : [])
  setExpenses(norm(expJson))
  setDeliveries(norm(delJson))
  setCostCodes(norm(ccJson))
  setExpensesCursor(expJson.nextCursor || null)
  setDeliveriesCursor(delJson.nextCursor || null)
  setCostCodesCursor(ccJson.nextCursor || null)
    } catch(e:any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [jobId, companyId])

  // Debounced refetch wrapper used by realtime handlers
  const scheduleFetch = useCallback(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => { doFetch() }, 250)
  }, [doFetch])

  useEffect(() => { doFetch() }, [doFetch])

  useJobRealtime(jobId, {
    onExpense: (p) => {
      if (!p?.expense_id) { scheduleFetch(); return }
      fetch(`/api/expenses/${p.expense_id}`, { headers: { 'x-company-id': companyId } })
        .then(r => r.ok ? r.json() : null)
        .then(row => {
          if (!row) return scheduleFetch()
          setExpenses(prev => {
            const idx = prev.findIndex(e => e.id === row.id)
            if (idx === -1) return [row, ...prev]
            const copy = [...prev]
            copy[idx] = { ...copy[idx], ...row }
            return copy
          })
          pushToast('Expense updated')
        })
    },
    onDelivery: (p) => {
      if (!p?.delivery_id) { scheduleFetch(); return }
      fetch(`/api/deliveries/${p.delivery_id}`, { headers: { 'x-company-id': companyId } })
        .then(r => r.ok ? r.json() : null)
        .then(row => {
          if (!row) return scheduleFetch()
          setDeliveries(prev => {
            const idx = prev.findIndex(d => d.id === row.id)
            if (idx === -1) return [row, ...prev]
            const copy = [...prev]
            copy[idx] = { ...copy[idx], ...row }
            return copy
          })
          pushToast('Delivery updated')
        })
    },
    onCostCode: (p) => {
      if (!p?.cost_code_id) { scheduleFetch(); return }
      fetch(`/api/cost-codes/${p.cost_code_id}`, { headers: { 'x-company-id': companyId } })
        .then(r => r.ok ? r.json() : null)
        .then(row => {
          if (!row) return scheduleFetch()
          setCostCodes(prev => {
            const idx = prev.findIndex(c => c.id === row.id)
            if (idx === -1) return [...prev, row]
            const copy = [...prev]
            copy[idx] = { ...copy[idx], ...row }
            return copy
          })
          pushToast('Cost code updated')
        })
    },
  onStatus: (s) => setRtStatus(s),
  })

  const exportCsv = async () => {
    if (!jobId) return
    const res = await fetch(`/api/jobs/${jobId}/report?format=csv&type=${type}`, { headers: { 'x-company-id': companyId } })
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

  async function loadMoreExpenses() {
    if (!expensesCursor) return
    const res = await fetch(`/api/expenses?job_id=${jobId}&limit=50&cursor=${encodeURIComponent(expensesCursor)}`, { headers: { 'x-company-id': companyId } })
    const json = await res.json().catch(()=>({ items: [] }))
    if (res.ok) {
      const items = Array.isArray(json?.items) ? json.items : []
      setExpenses(prev => [...prev, ...items])
      setExpensesCursor(json.nextCursor || null)
    }
  }
  async function loadMoreDeliveries() {
    if (!deliveriesCursor) return
    const res = await fetch(`/api/deliveries?job_id=${jobId}&limit=50&cursor=${encodeURIComponent(deliveriesCursor)}`, { headers: { 'x-company-id': companyId } })
    const json = await res.json().catch(()=>({ items: [] }))
    if (res.ok) {
      const items = Array.isArray(json?.items) ? json.items : []
      setDeliveries(prev => [...prev, ...items])
      setDeliveriesCursor(json.nextCursor || null)
    }
  }

  async function createExpenseOptimistic() {
    if (!jobId) return
    const amt = parseFloat(newExpenseAmount)
    if (!amt || isNaN(amt)) return
    const tempId = 'temp-' + Date.now()
    const optimistic = { id: tempId, job_id: jobId, amount: amt, memo: newExpenseMemo, spent_at: new Date().toISOString() }
    setCreatingExpense(true)
    setExpenses(prev => [optimistic, ...prev])
    try {
      const res = await fetch('/api/expenses', { method: 'POST', headers: { 'content-type': 'application/json', 'x-company-id': companyId }, body: JSON.stringify({ job_id: jobId, amount: amt, spent_at: new Date().toISOString(), memo: newExpenseMemo }) })
      if (res.ok) {
        const js = await res.json()
        setExpenses(prev => prev.map(e => e.id === tempId ? { ...e, id: js.id } : e))
        setNewExpenseAmount(''); setNewExpenseMemo('')
        pushToast('Expense created')
      } else {
        setExpenses(prev => prev.filter(e => e.id !== tempId))
        pushToast('Create failed')
      }
    } catch {
      setExpenses(prev => prev.filter(e => e.id !== tempId))
      pushToast('Create failed')
    } finally {
      setCreatingExpense(false)
    }
  }

  async function createDeliveryOptimistic() {
    if (!jobId) return
    const desc = deliveryItemDesc.trim()
    const qty = parseFloat(deliveryItemQty) || 1
    if (!desc) return
    const tempId = 'temp-deliv-' + Date.now()
    const optimistic = { id: tempId, job_id: jobId, status: 'pending', created_at: new Date().toISOString() }
    setCreatingDelivery(true)
    setDeliveries(prev => [optimistic, ...prev])
    try {
      const res = await fetch('/api/deliveries', { method: 'POST', headers: { 'content-type': 'application/json', 'x-company-id': companyId }, body: JSON.stringify({ job_id: jobId, items: [{ description: desc, qty }], notes: null }) })
      if (res.ok) {
        const js = await res.json()
        setDeliveries(prev => prev.map(d => d.id === tempId ? { ...d, id: js.id, status: 'created' } : d))
        setDeliveryItemDesc(''); setDeliveryItemQty('1')
        pushToast('Delivery created')
      } else {
        setDeliveries(prev => prev.filter(d => d.id !== tempId))
        pushToast('Delivery failed')
      }
    } catch {
      setDeliveries(prev => prev.filter(d => d.id !== tempId))
      pushToast('Delivery failed')
    } finally {
      setCreatingDelivery(false)
    }
  }

  async function createCostCodeOptimistic() {
    const code = newCostCodeCode.trim(); if (!code) return
    const tempId = 'temp-cc-' + Date.now()
    const optimistic = { id: tempId, code, description: newCostCodeDesc }
    setCreatingCostCode(true)
    setCostCodes(prev => [...prev, optimistic])
    try {
  const res = await fetch('/api/cost-codes', { method: 'POST', headers: { 'content-type': 'application/json', 'x-company-id': companyId }, body: JSON.stringify({ code, description: newCostCodeDesc, job_id: jobId }) })
      if (res.ok) {
        const js = await res.json()
        setCostCodes(prev => prev.map(c => c.id === tempId ? { ...c, id: js.id } : c))
        setNewCostCodeCode(''); setNewCostCodeDesc('')
        pushToast('Cost code created')
      } else {
        setCostCodes(prev => prev.filter(c => c.id !== tempId))
        pushToast('Cost code failed')
      }
    } catch {
      setCostCodes(prev => prev.filter(c => c.id !== tempId))
      pushToast('Cost code failed')
    } finally { setCreatingCostCode(false) }
  }

  async function loadMoreCostCodes() {
    if (!costCodesCursor) return
    const res = await fetch(`/api/cost-codes?job_id=${jobId}&limit=50&cursor=${encodeURIComponent(costCodesCursor)}`, { headers: { 'x-company-id': companyId } })
    const json = await res.json().catch(()=>({ items: [] }))
    if (res.ok) {
      const items = Array.isArray(json?.items) ? json.items : []
      setCostCodes(prev => [...prev, ...items])
      setCostCodesCursor(json.nextCursor || null)
    }
  }

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
      <div className="flex gap-2 items-end flex-wrap">
        <div className="space-y-1">
          <label className="block text-xs uppercase tracking-wide text-neutral-400">New Expense Amount</label>
          <input value={newExpenseAmount} onChange={e=>setNewExpenseAmount(e.target.value)} type="number" className="px-2 py-1 text-sm bg-neutral-900 border border-neutral-700 rounded w-40" />
        </div>
        <div className="space-y-1">
          <label className="block text-xs uppercase tracking-wide text-neutral-400">Memo</label>
          <input value={newExpenseMemo} onChange={e=>setNewExpenseMemo(e.target.value)} className="px-2 py-1 text-sm bg-neutral-900 border border-neutral-700 rounded w-60" />
        </div>
        <button disabled={creatingExpense} onClick={createExpenseOptimistic} className="mt-5 px-3 py-1 text-sm bg-neutral-800 border border-neutral-600 rounded disabled:opacity-50">Add Expense</button>
      </div>
      <div className="flex gap-4 flex-wrap items-end">
        <div className="space-y-1">
          <label className="block text-xs uppercase tracking-wide text-neutral-400">New Delivery Item</label>
          <input value={deliveryItemDesc} onChange={e=>setDeliveryItemDesc(e.target.value)} className="px-2 py-1 text-sm bg-neutral-900 border border-neutral-700 rounded w-64" placeholder="Description" />
        </div>
        <div className="space-y-1">
          <label className="block text-xs uppercase tracking-wide text-neutral-400">Qty</label>
          <input value={deliveryItemQty} onChange={e=>setDeliveryItemQty(e.target.value)} type="number" className="px-2 py-1 text-sm bg-neutral-900 border border-neutral-700 rounded w-24" />
        </div>
        <button disabled={creatingDelivery} onClick={createDeliveryOptimistic} className="mt-5 px-3 py-1 text-sm bg-neutral-800 border border-neutral-600 rounded disabled:opacity-50">Add Delivery</button>
        <div className="space-y-1 ml-6">
          <label className="block text-xs uppercase tracking-wide text-neutral-400">New Cost Code</label>
          <div className="flex gap-2">
            <input value={newCostCodeCode} onChange={e=>setNewCostCodeCode(e.target.value)} className="px-2 py-1 text-sm bg-neutral-900 border border-neutral-700 rounded w-32" placeholder="Code" />
            <input value={newCostCodeDesc} onChange={e=>setNewCostCodeDesc(e.target.value)} className="px-2 py-1 text-sm bg-neutral-900 border border-neutral-700 rounded w-56" placeholder="Description" />
            <button disabled={creatingCostCode} onClick={createCostCodeOptimistic} className="px-3 py-1 text-sm bg-neutral-800 border border-neutral-600 rounded disabled:opacity-50">Add</button>
          </div>
        </div>
      </div>
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
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map(t => (
          <div key={t.id} className="bg-neutral-900 border border-neutral-700 text-xs px-3 py-2 rounded shadow">{t.msg}</div>
        ))}
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
