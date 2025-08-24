"use client";
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { useMemo } from 'react';
export type DeliveryRow = { id:string; status:string; eta:string|null; carrier:string|null; job_id:string|null };
export default function PageClient({ rows }: { rows: DeliveryRow[] }){
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
      <DataTable columns={columns as any} rows={rows as any} emptyMessage='No deliveries yet.' onRowClick={(r:any)=>location.href='/admin/deliveries/'+r.id} />
    </div>
  );
}
