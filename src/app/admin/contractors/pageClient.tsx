"use client";
import DataTable from '@/components/ui/DataTable';
import { useState, useEffect } from 'react'
import { useCompanyId } from '@/lib/useCompanyId'
import { usePaginatedRealtime } from '@/lib/paginationRealtime'

export interface ContractorRow { id:string; name:string; email:string|null; phone:string|null; created_at?:string }
export default function ContractorsPageClient({ rows }: { rows: ContractorRow[] }){
  const companyId = useCompanyId()
  const { items, loadMore, nextCursor, loading } = usePaginatedRealtime<ContractorRow>({
    table: 'suppliers', companyId,
    id: r=>r.id,
    fetchPage: async ({ companyId, limit, cursor }) => {
      const url = new URL('/api/suppliers?limit='+limit, window.location.origin)
      if (cursor) url.searchParams.set('cursor', cursor)
      // current suppliers GET endpoint returns array (no pagination yet); adapt
      const res = await fetch(url.toString(), { headers: { 'x-company-id': companyId } })
      const json = await res.json().catch(()=>[])
      const arr = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : [])
      return { items: arr, nextCursor: null }
    }
  })

  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>Contractors</h1>
      <DataTable columns={[
        { key:'name', header:'Name', sortable:true },
        { key:'email', header:'Email' },
        { key:'phone', header:'Phone' }
      ] as any} rows={items as any} emptyMessage='No contractors.' onRowClick={(r:any)=>location.href='/admin/contractors/'+r.id} />
    </div>
  );
}