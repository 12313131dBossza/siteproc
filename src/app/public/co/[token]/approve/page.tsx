'use client'
import { useState } from 'react'

export default function ApproveCO({ params }: { params: { token: string } }) {
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function act(path: 'approve' | 'reject') {
    setMsg(''); setLoading(true)
    try {
      const res = await fetch(`/api/change-orders/public/${params.token}/${path}`, { method: 'POST' })
      const data = await res.json().catch(()=>({}))
      if (res.ok) setMsg(`Change order ${path}d.`)
      else setMsg(data?.error || 'Error')
    } catch(e:any) { setMsg(e.message || 'Failed') } finally { setLoading(false) }
  }

  return (
    <div className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Change Order Approval</h1>
      <p className="text-sm text-neutral-600">Review offline details were emailed. Choose an action:</p>
      <div className="flex gap-2">
        <button disabled={loading} onClick={()=>act('approve')} className="flex-1 py-2 bg-emerald-600 text-white rounded disabled:opacity-50">Approve</button>
        <button disabled={loading} onClick={()=>act('reject')} className="flex-1 py-2 bg-red-600 text-white rounded disabled:opacity-50">Reject</button>
      </div>
      {msg && <p className="text-sm" aria-live="polite">{msg}</p>}
    </div>
  )
}
