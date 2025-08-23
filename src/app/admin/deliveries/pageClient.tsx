"use client";
import React, { useState } from 'react';
import DataTable from '@/components/ui/DataTable';
import { deliveries } from '@/lib/mockData';
import { Button } from '@/components/ui/Button';

export default function DeliveriesPageClient(){
  const [loading] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Deliveries</h1>
        <Button onClick={()=>location.href='/admin/deliveries/new'}>New Delivery</Button>
      </div>
      <DataTable loading={loading} columns={[
        { key:'id', header:'ID', sortable:true },
        { key:'project', header:'Project', sortable:true },
        { key:'status', header:'Status', sortable:true },
        { key:'eta', header:'ETA', sortable:true },
        { key:'by', header:'Carrier', sortable:true },
      ]} rows={deliveries as any} onRowClick={(r:any)=> location.href='/admin/deliveries/'+r.id} />
    </div>
  );
}
