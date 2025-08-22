"use client"
import { useState } from 'react'

export default function ExportsHub(){
  const [msg,setMsg]=useState('')
  const companyId = (typeof window!== 'undefined'? localStorage.getItem('company_id'): '')||''

  async function download(kind: 'expenses'|'bills') {
    setMsg('Generating...')
    try {
      const url = kind==='expenses'? '/api/exports/expenses': '/api/exports/bills'
      const r = await fetch(url,{headers:{'x-company-id':companyId}})
      if(!r.ok){ setMsg('Error '+r.status); return }
      const blob = await r.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = kind+ '-' + new Date().toISOString().slice(0,10)+ '.csv'
      a.click()
      setMsg('Downloaded '+kind)
    } catch(e:any){ setMsg(e.message||'Failed') }
  }
  return <div className="p-6 space-y-4 max-w-md">
    <h1 className="text-xl font-semibold">Exports</h1>
    <p className="text-sm text-neutral-600">Download accounting CSV extracts.</p>
    <div className="space-y-2">
      <button onClick={()=>download('expenses')} className="px-4 py-2 bg-black text-white rounded">Expenses CSV</button>
      <button onClick={()=>download('bills')} className="px-4 py-2 bg-black text-white rounded">Bills (POs) CSV</button>
    </div>
    {msg && <p className="text-xs" aria-live="polite">{msg}</p>}
  </div>
}
