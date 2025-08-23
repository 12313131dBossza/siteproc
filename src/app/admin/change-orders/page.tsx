export const dynamic = 'force-dynamic';
"use client";
import React from 'react';
import DataTable from '@/components/ui/DataTable';
import { changeOrders } from '@/lib/mockData';
import { Button } from '@/components/ui/Button';

export default function ChangeOrdersList(){
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Change Orders</h1><Button onClick={()=>location.href='/admin/change-orders/new'}>New Request</Button></div>
      <DataTable columns={[
        { key:'id', header:'ID' },
        { key:'project', header:'Project' },
        { key:'status', header:'Status' },
        { key:'amountDelta', header:'Amount Δ' },
        { key:'submitted', header:'Submitted' }
      ]} rows={changeOrders as any} onRowClick={(r:any)=>location.href='/admin/change-orders/'+r.id} />
    </div>
  );
}
