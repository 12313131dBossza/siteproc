"use client"
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type ChangeOrder = {
  id: string
  order_id: string
  proposed_qty: number
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_by: string
  created_at: string
  decided_by: string | null
  decided_at: string | null
}

export default function ChangeOrdersPanel() {
  // Use Next.js route params instead of parsing window path to avoid query/hash issues
  const params = useParams<{ id: string }>()
  const orderId = (params?.id ?? '').toString()
  const [items, setItems] = useState<ChangeOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [proposedQty, setProposedQty] = useState<number>(0)
  const [reason, setReason] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")

  async function load() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/change-orders?orderId=${orderId}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setItems(json.data || [])
      } else {
        setError(typeof json.error === 'string' ? json.error : 'Failed to load change orders')
      }
    } catch (e: any) {
      setError('Network error while loading')
    }
    setLoading(false)
  }
  useEffect(() => { if (orderId) load() }, [orderId])

  async function submit() {
    setError(""); setSuccess("")
    if (!proposedQty || proposedQty <= 0) { setError('Enter a quantity greater than 0'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/change-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, proposed_qty: proposedQty, reason })
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setProposedQty(0); setReason(''); setSuccess('Request submitted');
        load()
      } else {
        setError(typeof json.error === 'string' ? json.error : 'Failed to submit request')
      }
    } catch (e: any) {
      setError('Network error while submitting')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 p-5 bg-white">
        <h3 className="text-lg font-semibold">Request Quantity Change</h3>
        <p className="text-sm text-gray-500 mt-1">Submit a change request for this order's quantity.</p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-start">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">New quantity</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={proposedQty || ''}
              onChange={(e) => setProposedQty(Number(e.target.value))}
              placeholder="e.g. 125.50"
              className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm text-gray-600 mb-1">Reason (optional)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide context for this change"
              className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </div>
          <div className="md:col-span-1 flex items-end">
            <button
              onClick={submit}
              disabled={submitting || !orderId || !proposedQty || proposedQty <= 0}
              className={`w-full rounded-xl px-4 py-2 text-white transition ${
                submitting || !orderId || !proposedQty || proposedQty <= 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-black hover:opacity-90'
              }`}
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
        {error ? <div className="mt-2 text-sm text-red-600">{error}</div> : null}
        {success ? <div className="mt-2 text-sm text-green-600">{success}</div> : null}
      </div>

      <div className="rounded-2xl border border-gray-200 p-5 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Change Requests</h3>
          <button
            onClick={load}
            className="text-sm text-gray-600 hover:text-black"
            disabled={loading}
            aria-label="Refresh change requests"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {loading ? (
          <div className="space-y-2">
            <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-500">No change requests yet.</div>
        ) : (
          <ul className="space-y-2">
            {items.map((co) => (
              <li key={co.id} className="rounded-xl border p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <span>Proposed qty: {co.proposed_qty}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        co.status === 'approved'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : co.status === 'rejected'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}
                    >
                      {co.status}
                    </span>
                  </div>
                  {(co.reason || (co as any).description) ? (
                    <div className="text-sm text-gray-600">Reason: {co.reason || (co as any).description}</div>
                  ) : null}
                  <div className="text-xs text-gray-500">{new Date(co.created_at).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
