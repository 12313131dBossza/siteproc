"use client";
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { useMemo, useState, useEffect } from 'react';
import { usePaginatedRealtime } from '@/lib/paginationRealtime';
export type DeliveryRow = { id:string; status:string; eta:string|null; carrier:string|null; job_id:string|null };
export default function PageClient({ rows }: { rows: DeliveryRow[] }){
  const [companyId, setCompanyId] = useState<string | null>(null)
  useEffect(()=>{ setCompanyId(localStorage.getItem('company_id')) },[])
  const { items, loadMore, nextCursor, loading } = usePaginatedRealtime<DeliveryRow>({
    table: 'deliveries', companyId: companyId || undefined, id: r=>r.id,
    fetchPage: async ({ companyId, limit, cursor }) => {
      const url = new URL('/api/deliveries?limit='+limit, window.location.origin)
      if (cursor) url.searchParams.set('cursor', cursor)
      const res = await fetch(url.toString(), { headers: { 'x-company-id': companyId } })
      const json = await res.json().catch(()=>({ items: [] }))
      const list = Array.isArray(json?.items) ? json.items : []
      return { items: list, nextCursor: json.nextCursor || null }
    }
  })
  const columns = useMemo(()=>[
    { key:'id', header:'ID', sortable:true },
    { key:'status', header:'Status', sortable:true },
    { key:'eta', header:'Delivered At', sortable:true },
    { key:'carrier', header:'Signer', sortable:true }
  ],[]);
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-xl font-semibold'>Deliveries</h1>
        <Button href='/admin/deliveries/new'>New Delivery</Button>
      </div>
  <DataTable columns={columns as any} rows={items as any} emptyMessage='No deliveries yet.' onRowClick={(r:any)=>location.href='/admin/deliveries/'+r.id} />
      {nextCursor && <button disabled={loading} onClick={()=>loadMore()} className='text-xs px-3 py-1 border rounded disabled:opacity-50 mt-2'>Load more…</button>}
    </div>
  );
}
