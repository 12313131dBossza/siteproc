export const dynamic = 'force-dynamic';
"use client";
import React from 'react';
import DataTable from '@/components/ui/DataTable';
import { bids } from '@/lib/mockData';

export default function BidsList(){
  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>Bids</h1>
      <DataTable columns={[
        { key:'id', header:'ID' },
        { key:'project', header:'Project' },
        { key:'contractor', header:'Contractor' },
        { key:'amount', header:'Amount' },
        { key:'status', header:'Status' },
        { key:'submitted', header:'Submitted' }
      ]} rows={bids as any} onRowClick={(r:any)=>location.href='/admin/bids/'+r.id} />
    </div>
  );
}
