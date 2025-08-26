'use client'
import { useEffect, useState } from 'react'
import { useCompanyId } from '@/lib/useCompanyId'
import { usePaginatedRealtime } from '@/lib/paginationRealtime'

export default function PoListPage() {
  const [page, setPage] = useState(0) // retained if we later need page-based slices
  const companyId = useCompanyId() || ''

  const { items: pos, loadMore, nextCursor, loading } = usePaginatedRealtime<any>({
    table: 'pos', companyId,
    id: (r)=>r.id,
    fetchPage: async ({ companyId, limit, cursor }) => {
      const url = new URL('/api/po/list', window.location.origin)
      url.searchParams.set('limit', String(limit))
      if (cursor) url.searchParams.set('cursor', cursor)
      const res = await fetch(url.toString(), { headers: { 'x-company-id': companyId } })
      const json = await res.json().catch(()=>({ items: [] }))
      const list = Array.isArray(json?.items) ? json.items : []
      return { items: list, nextCursor: json.nextCursor || null }
    }
  })

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Purchase Orders</h1>
      <table className="w-full text-sm max-w-4xl">
        <thead><tr className="border-b"><th className="text-left p-2">PO Number</th><th className="text-left p-2">Status</th><th className="text-left p-2">Total</th><th className="text-left p-2">Created</th></tr></thead>
        <tbody>{pos.map(p => <tr key={p.id} className="border-b"><td className="p-2"><a href={`/po/${p.id}`} className="underline">{p.po_number}</a></td><td className="p-2 text-xs">{p.status}</td><td className="p-2">${'{'}p.total||0{'}'}</td><td className="p-2 whitespace-nowrap">{p.created_at?.slice(0,10)}</td></tr>)}</tbody>
      </table>
      <div className="flex gap-3 items-center">
        {nextCursor && <button disabled={loading} onClick={()=>loadMore()} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-40">Load more…</button>}
        <span className="text-xs text-gray-500 self-center">Loaded {pos.length}</span>
      </div>
    </div>
  )
}

