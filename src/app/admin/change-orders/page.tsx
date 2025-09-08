"use client"
import { useEffect, useState } from 'react'

type Row = {
  id: string
  order_id: string
  proposed_qty: number
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export default function AdminChangeOrdersPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/change-orders`)
    const json = await res.json()
    if (res.ok) setRows(json.data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function approve(id: string) {
    const res = await fetch(`/api/change-orders/${id}/approve`, { method: 'POST' })
    if (res.ok) load()
  }
  async function reject(id: string) {
    const res = await fetch(`/api/change-orders/${id}/reject`, { method: 'POST' })
    if (res.ok) load()
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Pending Change Requests</h1>
      {loading ? <div>Loading…</div> : rows.length === 0 ? (
        <div className="text-sm text-gray-500">No pending requests.</div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="border rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">Order: {r.order_id}</div>
                <div>Proposed qty: {r.proposed_qty}</div>
                {r.reason ? <div className="text-sm text-gray-600">Reason: {r.reason}</div> : null}
                <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approve(r.id)} className="px-3 py-1 rounded-lg bg-green-600 text-white">Approve</button>
                <button onClick={() => reject(r.id)} className="px-3 py-1 rounded-lg bg-red-600 text-white">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
 
