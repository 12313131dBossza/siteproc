export const dynamic = 'force-dynamic';
"use client";
import React from 'react';
import DataTable from '@/components/ui/DataTable';
import { contractors } from '@/lib/mockData';

export default function ContractorsList(){
  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>Contractors</h1>
      <DataTable columns={[
        { key:'id', header:'ID' },
        { key:'name', header:'Name' },
        { key:'trade', header:'Trade' },
        { key:'rating', header:'Rating' }
      ]} rows={contractors as any} onRowClick={(r:any)=>location.href='/admin/contractors/'+r.id} />
    </div>
  );
}
