"use client";
import DataTable from '@/components/ui/DataTable';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useCompanyId } from '@/lib/useCompanyId';
import { usePaginatedRealtime } from '@/lib/paginationRealtime';
export type BidRow = { id:string; contractor:string|null; amount:number|null; status:string; submitted:string|null };
export default function PageClient({ rows }: { rows: BidRow[] }){
  const companyId = useCompanyId()
  const { items, loadMore, nextCursor, loading } = usePaginatedRealtime<BidRow>({
    table:'bids', companyId,
    id: r=>r.id,
    fetchPage: async ({ companyId, limit, cursor }) => {
      const url = new URL('/api/bids?limit='+limit, window.location.origin)
      if (cursor) url.searchParams.set('cursor', cursor)
      const res = await fetch(url.toString(), { headers: { 'x-company-id': companyId } })
      const json = await res.json().catch(()=>({ items: [] }))
      const items = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : [])
      return { items: items.map((b:any)=>({ id:b.id, contractor:b.contractor, amount:b.amount, status:b.status, submitted:b.submitted||b.created_at })) , nextCursor: json.nextCursor || null }
    }
  })
  const columns = useMemo(()=>[
    { key:'id', header:'ID', sortable:true },
    { key:'contractor', header:'Contractor', sortable:true },
    { key:'amount', header:'Amount', sortable:true },
    { key:'status', header:'Status', sortable:true },
    { key:'submitted', header:'Submitted', sortable:true }
  ],[]);
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-xl font-semibold'>Bids</h1>
        <Button href='/admin/bids/new'>New Bid</Button>
      </div>
  <DataTable columns={columns as any} rows={items as any} emptyMessage='No bids yet.' onRowClick={(r:any)=>location.href='/admin/bids/'+r.id} />
  {nextCursor && <button disabled={loading} onClick={()=>loadMore()} className='text-xs px-3 py-1 border rounded disabled:opacity-50'>Load more…</button>}
    </div>
  );
}