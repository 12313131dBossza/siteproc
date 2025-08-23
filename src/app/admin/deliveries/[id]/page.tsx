import React from 'react';
import { deliveries } from '@/lib/mockData';

export default function DeliveryDetail({ params }: { params: { id: string }}) {
  const d = deliveries.find(x=>x.id===params.id);
  if(!d) return <div>Not found.</div>;
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Delivery {d.id}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sp-card"><p className="text-xs text-[var(--sp-color-muted)]">Project</p><p>{d.project}</p></div>
        <div className="sp-card"><p className="text-xs text-[var(--sp-color-muted)]">Status</p><p>{d.status}</p></div>
        <div className="sp-card"><p className="text-xs text-[var(--sp-color-muted)]">ETA</p><p>{d.eta}</p></div>
      </div>
      <div className="sp-card"><p className="text-xs text-[var(--sp-color-muted)]">Carrier</p><p>{d.by}</p></div>
    </div>
  );
}
