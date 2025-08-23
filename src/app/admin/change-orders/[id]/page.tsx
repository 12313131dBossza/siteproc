import React from 'react';
import { changeOrders } from '@/lib/mockData';

export default function ChangeOrderDetail({ params }: { params: { id: string }}) {
  const c = changeOrders.find(x=>x.id===params.id);
  if(!c) return <div>Not found.</div>;
  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>Change Order {c.id}</h1>
      <div className='grid grid-cols-1 sm:grid-cols-4 gap-4'>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Project</p><p>{c.project}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Status</p><p>{c.status}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Amount Δ</p><p>{c.amountDelta}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Submitted</p><p>{c.submitted}</p></div>
      </div>
    </div>
  );
}
