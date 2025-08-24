"use client";
import DataTable from '@/components/ui/DataTable';
import { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
export type ClientRow = { id:string; name:string; contact:string|null; email:string|null; projects:number|null };
export default function PageClient({ rows }: { rows: ClientRow[] }){
  const columns = useMemo(()=>[
    { key:'name', header:'Name', sortable:true },
    { key:'contact', header:'Contact' },
    { key:'email', header:'Email' },
    { key:'projects', header:'Projects' }
  ],[]);
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-xl font-semibold'>Clients</h1>
        <Button href='/admin/clients/new'>New Client</Button>
      </div>
      <DataTable columns={columns as any} rows={rows as any} emptyMessage='No clients yet.' onRowClick={(r:any)=>location.href='/admin/clients/'+r.id} />
    </div>
  );
}