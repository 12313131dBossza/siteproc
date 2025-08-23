"use client";
import React, { useState } from 'react';
import { bids } from '@/lib/mockData';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { bidDecisionSchema } from '@/lib/forms';

export default function BidDetail({ params }: { params: { id: string }}) {
  const bid = bids.find(b=>b.id===params.id);
  const { push } = useToast();
  const [decision,setDecision]=useState<'accept'|'reject'|''>('');
  const [note,setNote]=useState('');
  if(!bid) return <div>Not found.</div>;
  function submit(){ const safe = bidDecisionSchema.safeParse({ bidId: bid!.id, decision: decision as any, note}); if(!safe.success){ push({ title:'Select decision', variant:'error' }); return;} push({ title:'Decision saved (mock)', variant:'success' }); }
  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>Bid {bid.id}</h1>
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Project</p><p>{bid.project}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Contractor</p><p>{bid.contractor}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Amount</p><p>${bid.amount}</p></div>
      </div>
      <div className='sp-card space-y-2'>
        <p className='text-sm font-medium'>Decision</p>
        <div className='flex gap-3 text-sm'>
          <label className='flex items-center gap-1 cursor-pointer'><input type='radio' name='d' onChange={()=>setDecision('accept')} /> Accept</label>
          <label className='flex items-center gap-1 cursor-pointer'><input type='radio' name='d' onChange={()=>setDecision('reject')} /> Reject</label>
        </div>
        <textarea className='sp-input min-h-32' placeholder='Optional note' value={note} onChange={e=>setNote(e.target.value)} />
        <Button onClick={submit} variant='accent'>Save Decision</Button>
      </div>
    </div>
  );
}
