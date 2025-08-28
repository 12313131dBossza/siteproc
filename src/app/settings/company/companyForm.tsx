"use client";
import { useState } from 'react'
import { toast } from 'sonner'

export default function CompanyForm({ initialName }: { initialName: string }) {
  const [name,setName]=useState(initialName)
  const [status,setStatus]=useState<'idle'|'saving'|'saved'|'invalid_name'|'error'>('idle')
  const [error,setError]=useState<string>('')
  async function submit(e:React.FormEvent){
    e.preventDefault()
    setStatus('saving'); setError('')
    try {
      const res = await fetch('/api/settings/company', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name }) })
      const data = await res.json().catch(()=>({}))
      if(!res.ok || !data || !data.ok){
        if(data.error === 'invalid_name') { setStatus('invalid_name'); return }
        setStatus('error');
        const msg = data.error || 'Save failed'
        setError(msg)
  toast.error(`Company update failed: ${msg}`)
        return
      }
      setStatus('saved');
  toast.success('Company name updated')
      setTimeout(()=> setStatus('idle'), 2500)
    } catch(err:any){ setStatus('error'); setError(err.message||'Error') }
  }
  const disabled = status==='saving'
  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <div>
        <label className="text-xs font-medium">Company Name</label>
        <input value={name} onChange={e=>setName(e.target.value)} className="sp-input w-full mt-1" minLength={2} maxLength={64} required />
        {status==='invalid_name' && <p className="text-xs text-red-500 mt-1">Name must be 2-64 characters.</p>}
      </div>
      <div className="flex items-center gap-3">
        <button disabled={disabled} className="px-4 py-2 rounded bg-blue-600 text-xs disabled:opacity-50">{status==='saving'?'Saving...':'Save'}</button>
  {status==='saved' && <span className="text-xs text-green-500">Company name updated</span>}
        {status==='error' && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </form>
  )
}