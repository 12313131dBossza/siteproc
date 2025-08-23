export const dynamic = 'force-dynamic';
import React from 'react';
import DataTable from '@/components/ui/DataTable';
import { invoices } from '@/lib/mockData';

export default function PaymentsPage(){
  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>Payments</h1>
      <DataTable columns={[
        { key:'id', header:'Invoice' },
        { key:'project', header:'Project' },
        { key:'amount', header:'Amount' },
        { key:'due', header:'Due' },
        { key:'status', header:'Status' }
      ]} rows={invoices as any} />
    </div>
  );
}
