"use client";
import { useState, useEffect } from 'react'
import DataTable from '@/components/ui/DataTable'
import { useCompanyId } from '@/lib/useCompanyId'
import { usePaginatedRealtime } from '@/lib/paginationRealtime'

interface RfqRow { id:string; job_id:string; title:string; status:string; needed_date:string|null; created_at:string; public_token:string|null }
export default function RfqsPageClient({ rows }: { rows: RfqRow[] }) {
  const companyId = useCompanyId()
  const { items, loadMore, nextCursor, loading } = usePaginatedRealtime<RfqRow>({
    table: 'rfqs', companyId,
    id: r=>r.id,
    fetchPage: async ({ companyId, limit, cursor }) => {
      const url = new URL('/api/rfqs?limit='+limit, window.location.origin)
      if (cursor) url.searchParams.set('cursor', cursor)
      const res = await fetch(url.toString(), { headers: { 'x-company-id': companyId } })
      const json = await res.json().catch(()=>({ items: [] }))
      const list = Array.isArray(json?.items) ? json.items : []
      return { items: list, nextCursor: json.nextCursor || null }
    }
  })
  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>RFQs</h1>
  <DataTable columns={[
        { key:'title', header:'Title', sortable:true },
        { key:'status', header:'Status' },
        { key:'needed_date', header:'Needed' },
        { key:'created_at', header:'Created' }
      ] as any} rows={items as any} emptyMessage='No RFQs.' onRowClick={(r:any)=>location.href='/rfqs/'+r.id+'/compare'} />
  {nextCursor && <button disabled={loading} onClick={()=>loadMore()} className='text-xs px-3 py-1 border rounded disabled:opacity-50'>Load more…</button>}
    </div>
  )
}
