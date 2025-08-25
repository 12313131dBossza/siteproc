"use client";
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { useEffect, useState } from 'react';
import { supabaseAnon } from '@/lib/supabase';

export interface ChangeOrderRow { id:string; status:string; cost_delta:number|null; created_at:string }

export default function ChangeOrdersPageClient({ rows }: { rows: ChangeOrderRow[] }){
  const [list, setList] = useState<ChangeOrderRow[]>(rows)
  useEffect(() => {
    // demo company only channel; using postgres_changes filter on company_id via RLS policies
    const sb = supabaseAnon();
    const ch = sb.channel('change_orders-company-demo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'change_orders' }, (payload: any) => {
        setList(prev => {
          const next = [...prev]
            .filter(r => r.id !== payload.old?.id) // remove old if update/delete
          if (payload.eventType !== 'DELETE') {
            // inject / replace
            const newRow: ChangeOrderRow = {
              id: payload.new.id,
              status: payload.new.status,
              cost_delta: payload.new.cost_delta,
              created_at: payload.new.created_at,
            }
            next.unshift(newRow)
          }
          return next.slice(0, 200)
        })
      })
      .subscribe()
    return () => { try { ch.unsubscribe() } catch {} }
  }, [])

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'><h1 className='text-xl font-semibold'>Change Orders</h1><Button href='/admin/change-orders/new'>New Request</Button></div>
      <DataTable columns={[
        { key:'id', header:'ID', sortable:true },
        { key:'status', header:'Status', sortable:true },
        { key:'cost_delta', header:'Amount Δ', sortable:true },
        { key:'created_at', header:'Submitted', sortable:true }
      ] as any} rows={list as any} emptyMessage='No change orders.' onRowClick={(r:any)=>location.href='/admin/change-orders/'+r.id} />
    </div>
  );
}