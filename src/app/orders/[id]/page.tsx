"use client"
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, XCircle, ArrowLeft, Loader2, Package, Calendar, Tag, Hash, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

type Order = {
  id: string
  product_id: string
  qty: number
  notes: string | null
  status: 'pending'|'approved'|'rejected'
  po_number?: string | null
  created_at: string
  decided_at?: string | null
  product?: { id: string; name: string; sku?: string; price?: number; unit?: string; vendor?: string }
}

export default function OrderDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<null | 'approve' | 'reject'>(null)
  const [po, setPo] = useState('')

  const fmt = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }), [])

  useEffect(() => {
    let canceled = false
    async function load() {
      try {
        setLoading(true)
        const res = await fetch('/api/orders')
        const list = await res.json().catch(()=>[])
        const found = Array.isArray(list) ? list.find((o:any)=>o.id===id) : null
        if (!canceled) setOrder(found || null)
      } catch {
        if (!canceled) setOrder(null)
      } finally {
        if (!canceled) setLoading(false)
      }
    }
    if (id) load()
    return () => { canceled = true }
  }, [id])

  async function decide(action: 'approve'|'reject') {
    if (!order) return
    try {
      setActing(action)
      const res = await fetch(`/api/orders/${order.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, po_number: action==='approve' && po ? po : undefined })
      })
      if (!res.ok) {
        const e = await res.json().catch(()=>({}))
        throw new Error(e.error || 'Action failed')
      }
      const updated = await res.json()
      setOrder(updated)
      toast.success(`Order ${action}d`)
    } catch (e:any) {
      toast.error(e?.message || 'Failed to update order')
    } finally {
      setActing(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="h-9 w-28 bg-zinc-200 rounded animate-pulse" />
        <div className="h-8 w-64 bg-zinc-200 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-20 bg-zinc-200 rounded-xl animate-pulse" />
          <div className="h-20 bg-zinc-200 rounded-xl animate-pulse" />
          <div className="h-20 bg-zinc-200 rounded-xl animate-pulse" />
        </div>
        <div className="h-40 bg-zinc-200 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <button onClick={()=>router.push('/orders')} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 bg-white hover:bg-zinc-50">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </button>
        <div className="mt-6 text-sm text-zinc-600">Order not found.</div>
      </div>
    )
  }

  const total = (Number(order.product?.price||0) * Number(order.qty||0)) || 0

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={()=>router.push('/orders')} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 bg-white hover:bg-zinc-50">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {order.status==='pending' ? (
          <div className="flex items-center gap-2">
            <input
              placeholder="PO number (optional)"
              value={po}
              onChange={e=>setPo(e.target.value)}
              className="hidden md:block border rounded-lg px-3 py-2 text-sm"
            />
            <button onClick={()=>decide('reject')} disabled={acting==='reject'} className="inline-flex items-center gap-2 rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2">
              {acting==='reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Reject
            </button>
            <button onClick={()=>decide('approve')} disabled={acting==='approve'} className="inline-flex items-center gap-2 rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 px-3 py-2">
              {acting==='approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve
            </button>
          </div>
        ) : (
          <span className={`px-3 py-1 rounded-full text-xs ${order.status==='approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{order.status}</span>
        )}
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold">{order.product?.name || 'Order'}</h1>
        <div className="text-sm text-zinc-500">Order ID: <span className="font-mono">{order.id}</span></div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-zinc-500 mb-1 flex items-center gap-2"><Package className="h-4 w-4" /> SKU</div>
          <div className="font-medium">{order.product?.sku || '—'}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-zinc-500 mb-1 flex items-center gap-2"><Tag className="h-4 w-4" /> Quantity</div>
          <div className="font-medium">{order.qty} {order.product?.unit || ''}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-zinc-500 mb-1 flex items-center gap-2"><DollarSign className="h-4 w-4" /> Total</div>
          <div className="font-semibold">{fmt.format(total)}</div>
          <div className="text-xs text-zinc-500">{fmt.format(Number(order.product?.price||0))} each</div>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-medium">Details</div>
          <div className="text-xs text-zinc-500 flex items-center gap-2"><Calendar className="h-4 w-4" /> {new Date(order.created_at).toLocaleString()}</div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border bg-zinc-50 p-3">
            <div className="text-xs text-zinc-500 mb-1">Vendor</div>
            <div className="font-medium">{order.product?.vendor || '—'}</div>
          </div>
          <div className="rounded-xl border bg-zinc-50 p-3">
            <div className="text-xs text-zinc-500 mb-1">PO Number</div>
            <div className="font-medium">{order.po_number || '—'}</div>
          </div>
          <div className="rounded-xl border bg-zinc-50 p-3 col-span-1 md:col-span-2">
            <div className="text-xs text-zinc-500 mb-1">Notes</div>
            <div className="font-medium whitespace-pre-wrap">{order.notes || '—'}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-zinc-500">Decided: {order.decided_at ? new Date(order.decided_at).toLocaleString() : '—'}</div>
    </div>
  )
}
