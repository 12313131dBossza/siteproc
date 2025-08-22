'use client'
import { useEffect, useState } from 'react'

export default function PoListPage() {
  const [pos, setPos] = useState<any[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(false)
    const companyId = (typeof window !== 'undefined' ? (localStorage.getItem('company_id')||'') : '') || process.env.NEXT_PUBLIC_COMPANY_ID || ''

  async function load(initial: boolean = false) {
    if (loading) return
    setLoading(true)
    try {
      const url = new URL('/api/po/list', window.location.origin)
        url.searchParams.set('limit', '25')
        url.searchParams.set('offset', `${page * 25}`)
      if (!initial && nextCursor) url.searchParams.set('cursor', nextCursor)
      const r= await fetch(url.toString(), { headers:{'x-company-id':companyId}})
      const d = await r.json().catch(()=>({}))
      const items = Array.isArray(d?.items) ? d.items : []
      setPos(prev => initial ? items : [...prev, ...items])
        const total = d?.total || items.length
        setHasMore((page + 1) * 25 < total)
        setNextCursor(d?.nextCursor || null) // Keep this for backward compatibility
    } finally { setLoading(false) }
  }

  useEffect(() => { if (companyId) load(true) }, [companyId])

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Purchase Orders</h1>
      <table className="w-full text-sm max-w-4xl">
        <thead><tr className="border-b"><th className="text-left p-2">PO Number</th><th className="text-left p-2">Status</th><th className="text-left p-2">Total</th><th className="text-left p-2">Created</th></tr></thead>
        <tbody>{pos.map(p => <tr key={p.id} className="border-b"><td className="p-2"><a href={`/po/${p.id}`} className="underline">{p.po_number}</a></td><td className="p-2 text-xs">{p.status}</td><td className="p-2">${'{'}p.total||0{'}'}</td><td className="p-2 whitespace-nowrap">{p.created_at?.slice(0,10)}</td></tr>)}</tbody>
      </table>
      <div className="flex gap-3 items-center">
        <div className="flex gap-2">
          <button disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-40">Prev</button>
          <button disabled={!hasMore} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-40">Next</button>
          <span className="text-xs text-gray-500 self-center">Page {page+1}</span>
        </div>
      </div>
    </div>
  )
}

