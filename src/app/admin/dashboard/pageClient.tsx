"use client";
import { Button } from '@/components/ui/Button';
import { useEffect, useState, useCallback } from 'react';
import { supabaseAnon } from '@/lib/supabase';
import useCompanyId from '@/lib/useCompanyId';
import { EVENTS } from '@/lib/constants';
import { dashboardChannels } from '@/lib/channels';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import DataTable from '@/components/ui/DataTable';

export interface DashboardData {
  stats: { activeProjects:number; pendingBids:number; openDeliveries:number; unpaidInvoices:number };
  recentActivity: { time:string; entity:string; action:string; by:string }[];
  openItems: { type:string; project:string; due:string; status:string; action:string }[];
}

export default function DashboardPageClient({ data }: { data: DashboardData }){
  const [live, setLive] = useState<DashboardData>(data)
  const companyId = useCompanyId()

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json()
      setLive(d => ({
        ...d,
        stats: j.stats,
        recentActivity: j.recentActivity,
      }))
    } catch {}
  }, [])

  useEffect(() => {
    if (!companyId) return
    const names = dashboardChannels(companyId)
    const subs = names.map(n => supabaseAnon().channel(n)
      .on('broadcast', { event: EVENTS.DASHBOARD_UPDATED }, () => { refetch() })
      .subscribe())
    return () => { for (const s of subs) { try { s.unsubscribe() } catch {} } }
  }, [companyId, refetch])

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-6 items-start">
        <Card className="w-64" title="Delivery check-in" actions={<Button size='sm' variant='primary' href='/admin/deliveries/new'>Start</Button>}>
          <p className="text-xs text-[var(--sp-color-muted)]">Log material arrival quickly.</p>
        </Card>
        <Card className="w-64" title="New expense" actions={<Button size='sm' variant='primary' href='/admin/expenses/new'>Add</Button>}>
          <p className="text-xs text-[var(--sp-color-muted)]">Track cost against budget.</p>
        </Card>
        <Card className="w-64" title="Request change order" actions={<Button size='sm' variant='primary' href='/admin/change-orders/new'>Request</Button>}>
          <p className="text-xs text-[var(--sp-color-muted)]">Capture scope adjustments.</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
  <StatCard label="Active Projects" value={live.stats.activeProjects} />
  <StatCard label="Pending Bids" value={live.stats.pendingBids} />
  <StatCard label="Open Deliveries" value={live.stats.openDeliveries} />
  <StatCard label="Unpaid Invoices" value={live.stats.unpaidInvoices} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Activity">
          <DataTable columns={[
            { key:'time', header:'Time' },
            { key:'entity', header:'Entity' },
            { key:'action', header:'Action' },
            { key:'by', header:'By' }
          ]} rows={live.recentActivity as any} emptyMessage='No recent events.' />
        </Card>
        <Card title="Open Items">
          <DataTable columns={[
            { key:'type', header:'Type' },
            { key:'project', header:'Project' },
            { key:'due', header:'Due' },
            { key:'status', header:'Status' },
            { key:'action', header:'Action', render:(r:any)=> <Button size='sm' variant='accent'>{r.action}</Button> }
          ]} rows={live.openItems as any} emptyMessage='No open items.' />
        </Card>
      </div>
    </div>
  );
}