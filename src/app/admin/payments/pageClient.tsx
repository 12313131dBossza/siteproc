"use client";
import { useCompanyId } from '@/lib/useCompanyId'
import { usePaginatedRealtime } from '@/lib/paginationRealtime'

interface PaymentStub { id: string; amount?: number | null; created_at?: string | null }

export default function PaymentsPageClient() {
  const companyId = useCompanyId()
  const { items, nextCursor, loadMore, loading } = usePaginatedRealtime<PaymentStub>({
    table: 'payments', companyId,
    id: r=>r.id,
    fetchPage: async ({ companyId, limit, cursor }) => {
      const u = new URL(`/api/payments?limit=${limit}`, window.location.origin)
      if (cursor) u.searchParams.set('cursor', cursor)
      const res = await fetch(u.toString(), { headers: { 'x-company-id': companyId } })
      const js = await res.json().catch(()=>({ items: [] }))
      return { items: Array.isArray(js.items)?js.items:[], nextCursor: js.nextCursor||null }
    }
  })
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Payments (Stub)</h1>
      <p className="text-xs text-neutral-500">Schema pending. Realtime channel wired for future adoption.</p>
      <div className="border border-neutral-700 rounded divide-y divide-neutral-700 text-sm">
        {items.length ? items.map(p => <div key={p.id} className="p-2">{p.id}</div>) : <div className="p-2 text-neutral-500 text-xs">No payments.</div>}
      </div>
      {nextCursor && <button disabled={loading} onClick={()=>loadMore()} className="text-xs px-3 py-1 border rounded">Load more…</button>}
    </div>
  )
}