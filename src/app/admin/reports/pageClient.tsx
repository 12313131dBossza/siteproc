"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function ReportsPageClient(){
  const [range,setRange]=useState('30');
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-xl font-semibold'>Reports</h1>
        <Button onClick={()=> alert('Exporting (mock)')}>Export CSV</Button>
      </div>
      <div className='flex gap-4 items-end'>
        <div className='sp-field'><label className='text-xs font-medium'>Date Range (days)</label><select value={range} onChange={e=>setRange(e.target.value)} className='sp-input'><option value='7'>7</option><option value='30'>30</option><option value='90'>90</option></select></div>
        <Button variant='accent' onClick={()=>{ /* pretend refresh */ }}>Refresh</Button>
      </div>
      <div className='grid md:grid-cols-2 gap-6'>
        <div className='sp-card h-60 flex items-center justify-center text-sm text-[var(--sp-color-muted)]'>Project Volume Chart (mock)</div>
        <div className='sp-card h-60 flex items-center justify-center text-sm text-[var(--sp-color-muted)]'>Contractor Performance Chart (mock)</div>
        <div className='sp-card h-60 flex items-center justify-center text-sm text-[var(--sp-color-muted)]'>Payment Flow Funnel (mock)</div>
        <div className='sp-card h-60 flex items-center justify-center text-sm text-[var(--sp-color-muted)]'>Bid Acceptance Rate (mock)</div>
      </div>
    </div>
  );
}