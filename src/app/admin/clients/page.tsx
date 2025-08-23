export const dynamic = 'force-dynamic';
"use client";
import React from 'react';
import DataTable from '@/components/ui/DataTable';
import { clients } from '@/lib/mockData';

export default function ClientsList(){
  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>Clients</h1>
      <DataTable columns={[
        { key:'id', header:'ID' },
        { key:'name', header:'Name' },
        { key:'contact', header:'Contact' },
        { key:'email', header:'Email' },
        { key:'projects', header:'Projects' }
      ]} rows={clients as any} onRowClick={(r:any)=>location.href='/admin/clients/'+r.id} />
    </div>
  );
}
