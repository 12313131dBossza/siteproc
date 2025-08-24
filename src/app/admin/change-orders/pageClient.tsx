"use client";
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
export interface ChangeOrderRow { id:string; status:string; cost_delta:number|null; created_at:string }
export default function ChangeOrdersPageClient({ rows }: { rows: ChangeOrderRow[] }){
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'><h1 className='text-xl font-semibold'>Change Orders</h1><Button href='/admin/change-orders/new'>New Request</Button></div>
      <DataTable columns={[
        { key:'id', header:'ID', sortable:true },
        { key:'status', header:'Status', sortable:true },
        { key:'cost_delta', header:'Amount Δ', sortable:true },
        { key:'created_at', header:'Submitted', sortable:true }
      ] as any} rows={rows as any} emptyMessage='No change orders.' onRowClick={(r:any)=>location.href='/admin/change-orders/'+r.id} />
    </div>
  );
}