"use client"
import { useEffect, useState } from 'react'

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
  const orderId = (typeof window !== 'undefined') ? window.location.pathname.split('/').pop() || '' : ''
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
      const res = await fetch(`/api/change-orders?orderId=${orderId}`)
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
    <div className="space-y-4">
      <div className="rounded-2xl border p-4">
        <h3 className="text-lg font-semibold">Request Change</h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="number" value={proposedQty || ''} onChange={(e) => setProposedQty(Number(e.target.value))}
            placeholder="New quantity" className="border rounded-xl px-3 py-2" />
          <input value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)" className="border rounded-xl px-3 py-2 md:col-span-2" />
          <button onClick={submit} disabled={submitting} className={`rounded-xl px-4 py-2 text-white ${submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:opacity-90'}`}>{submitting ? 'Submitting…' : 'Submit'}</button>
        </div>
        {error ? <div className="mt-2 text-sm text-red-600">{error}</div> : null}
        {success ? <div className="mt-2 text-sm text-green-600">{success}</div> : null}
      </div>

      <div className="rounded-2xl border p-4">
        <h3 className="text-lg font-semibold mb-3">Change History</h3>
        {loading ? <div>Loading…</div> :
          items.length === 0 ? <div className="text-sm text-gray-500">No change requests yet.</div> :
          <ul className="space-y-2">
            {items.map((co) => (
              <li key={co.id} className="rounded-xl border p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    Proposed qty: {co.proposed_qty} — <span className="uppercase">{co.status}</span>
                  </div>
                  {co.reason ? <div className="text-sm text-gray-600">Reason: {co.reason}</div> : null}
                  <div className="text-xs text-gray-500">{new Date(co.created_at).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>}
      </div>
    </div>
  )
}
