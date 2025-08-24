"use client";
import DataTable from '@/components/ui/DataTable';
import { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
export type PaymentRow = { id:string; project_id:string|null; amount:number|null; due:string|null; status:string };
export default function PageClient({ rows }: { rows: PaymentRow[] }){
  const columns = useMemo(()=>[
    { key:'id', header:'ID', sortable:true },
    { key:'amount', header:'Amount', sortable:true },
    { key:'due', header:'Due', sortable:true },
    { key:'status', header:'Status', sortable:true }
  ],[]);
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-xl font-semibold'>Payments</h1>
        <Button href='/admin/payments/new'>New Payment</Button>
      </div>
      <DataTable columns={columns as any} rows={rows as any} emptyMessage='No payments yet.' />
    </div>
  );
}