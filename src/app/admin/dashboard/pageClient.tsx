"use client";
import React from 'react';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import DataTable from '@/components/ui/DataTable';
import { projects, bids, deliveries, invoices, recentActivity, openItems } from '@/lib/mockData';

export default function DashboardPageClient(){
  const activeProjects = projects.filter(p=>p.status==='Active').length;
  const pendingBids = bids.filter(b=>b.status==='Pending').length;
  const openDeliveries = deliveries.filter(d=>d.status!=='Delivered').length;
  const unpaidInvoices = invoices.filter(i=>i.status==='Unpaid').length;

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
        <StatCard label="Active Projects" value={activeProjects} delta={{ value:'+2', direction:'up' }} />
        <StatCard label="Pending Bids" value={pendingBids} />
        <StatCard label="Open Deliveries" value={openDeliveries} />
        <StatCard label="Unpaid Invoices" value={unpaidInvoices} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Activity">
          <DataTable columns={[
            { key:'time', header:'Time' },
            { key:'entity', header:'Entity' },
            { key:'action', header:'Action' },
            { key:'by', header:'By' }
          ]} rows={recentActivity as any} />
        </Card>
        <Card title="Open Items">
          <DataTable columns={[
            { key:'type', header:'Type' },
            { key:'project', header:'Project' },
            { key:'due', header:'Due' },
            { key:'status', header:'Status' },
            { key:'action', header:'Action', render:(r:any)=> <Button size='sm' variant='accent'>{r.action}</Button> }
          ]} rows={openItems as any} />
        </Card>
      </div>
    </div>
  );
}