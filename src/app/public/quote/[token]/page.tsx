'use client'
import { useState, useEffect } from 'react'

export default function PublicQuoteSubmit({ params }: { params: Promise<{ token: string }> }) {
  const [total, setTotal] = useState('')
  const [lead, setLead] = useState('')
  const [terms, setTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string>('')

  // Resolve params on mount
  useEffect(() => {
    params.then(p => setToken(p.token))
  }, [params])

  async function submit() {
    if (!token) return
    setMsg(''); setLoading(true)
    try {
      const num = parseFloat(total)
      if (!num || isNaN(num)) { setMsg('Enter total'); setLoading(false); return }
      const body = { total: num, lead_time: lead || undefined, terms: terms || undefined, notes: notes || undefined }
      const res = await fetch(`/api/quotes/public/${token}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(()=>({}))
      if (res.ok) setMsg('Quote submitted. Thank you.')
      else setMsg(data?.error || 'Error submitting')
    } catch(e:any) { setMsg(e.message || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Submit Quote</h1>
      <label className="block text-sm">Total ($)
        <input value={total} onChange={e=>setTotal(e.target.value)} type="number" className="mt-1 w-full border p-2 rounded" />
      </label>
      <label className="block text-sm">Lead Time
        <input value={lead} onChange={e=>setLead(e.target.value)} className="mt-1 w-full border p-2 rounded" />
      </label>
      <label className="block text-sm">Terms
        <input value={terms} onChange={e=>setTerms(e.target.value)} className="mt-1 w-full border p-2 rounded" />
      </label>
      <label className="block text-sm">Notes
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} className="mt-1 w-full border p-2 rounded" rows={4} />
      </label>
      <button disabled={loading} onClick={submit} className="w-full py-2 rounded bg-black text-white disabled:opacity-50">{loading ? 'Submitting...' : 'Submit Quote'}</button>
      {msg && <p className="text-sm" aria-live="polite">{msg}</p>}
    </div>
  )
}
