"use client";
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { usePaginatedRealtime } from '@/lib/paginationRealtime';
export interface ProjectRow { id:string; name:string; code:string|null }
export default function ProjectsPageClient({ rows }: { rows: ProjectRow[] }){
  const [companyId, setCompanyId] = useState<string | null>(null)
  useEffect(() => { setCompanyId(localStorage.getItem('company_id')) }, [])
  const { items, loadMore, nextCursor, loading } = usePaginatedRealtime<ProjectRow>({
    table: 'jobs',
    companyId: companyId || undefined,
    id: r=>r.id,
    fetchPage: async ({ companyId, limit, cursor }) => {
      const url = new URL('/api/jobs/list', window.location.origin)
      url.searchParams.set('limit', String(limit))
      if (cursor) url.searchParams.set('cursor', cursor)
      const res = await fetch(url.toString(), { headers: { 'x-company-id': companyId } })
      const json = await res.json().catch(()=>({ items: [] }))
      const items = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : [])
      return { items, nextCursor: json.nextCursor || null }
    }
  })
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-xl font-semibold'>Projects</h1>
        <Button href='/admin/projects/new'>New Project</Button>
      </div>
  <DataTable columns={[
        { key:'id', header:'ID', sortable:true },
        { key:'name', header:'Name', sortable:true },
        { key:'code', header:'Code', sortable:true }
  ] as any} rows={items as any} emptyMessage='No projects.' onRowClick={(r:any)=>location.href='/admin/projects/'+r.id} />
  {nextCursor && <button disabled={loading} onClick={()=>loadMore()} className='text-xs px-3 py-1 border rounded disabled:opacity-50'>Load more…</button>}
    </div>
  );
}