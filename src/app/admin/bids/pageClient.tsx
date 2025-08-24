"use client";
import DataTable from '@/components/ui/DataTable';
import { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
export type BidRow = { id:string; contractor:string|null; amount:number|null; status:string; submitted:string|null };
export default function PageClient({ rows }: { rows: BidRow[] }){
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
      <DataTable columns={columns as any} rows={rows as any} emptyMessage='No bids yet.' onRowClick={(r:any)=>location.href='/admin/bids/'+r.id} />
    </div>
  );
}