"use client";
import React, { useState } from 'react'

export default function ProfileForm({ initialFullName }: { initialFullName: string }) {
  const [fullName,setFullName]=useState(initialFullName||'')
  const [status,setStatus]=useState<'idle'|'saving'|'saved'|'error'>('idle')
  const [error,setError]=useState<string|null>(null)
  async function submit(e:React.FormEvent){
    e.preventDefault();
    setStatus('saving'); setError(null)
    try {
      const res = await fetch('/api/settings/profile', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ fullName }) })
      const data = await res.json().catch(()=>({}))
      if(!res.ok || !data.ok){ setStatus('error'); setError(data.error||'Save failed'); return }
      setStatus('saved'); setTimeout(()=> setStatus('idle'), 1500)
    } catch(err:any){ setStatus('error'); setError(err.message||'Error') }
  }
  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <div>
        <label className="text-xs font-medium">Full Name</label>
        <input value={fullName} onChange={e=>setFullName(e.target.value)} className="sp-input w-full mt-1" placeholder="Jane Doe" />
      </div>
      <div className="flex items-center gap-3">
        <button disabled={status==='saving'} className="px-4 py-2 rounded bg-blue-600 text-xs disabled:opacity-50">{status==='saving'?'Saving...':'Save'}</button>
        {status==='saved' && <span className="text-xs text-green-500">Saved</span>}
        {status==='error' && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </form>
  )
}