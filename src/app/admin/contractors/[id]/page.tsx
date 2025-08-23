import React from 'react';
import { contractors } from '@/lib/mockData';

export default function ContractorDetail({ params }: { params: { id: string }}) {
  const c = contractors.find(x=>x.id===params.id);
  if(!c) return <div>Not found.</div>;
  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>{c.name}</h1>
      <div className='grid grid-cols-1 sm:grid-cols-4 gap-4'>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Trade</p><p>{c.trade}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Rating</p><p>{c.rating}</p></div>
      </div>
      <div className='sp-card space-y-2'>
        <p className='text-sm font-semibold'>Compliance Docs</p>
        <ul className='text-xs space-y-1'>
          {c.compliance.map(d=> <li key={d.doc} className='flex justify-between'><span>{d.doc}</span><span className='font-medium'>{d.status}{d.expiry ? ' ('+d.expiry+')':''}</span></li>)}
        </ul>
      </div>
    </div>
  );
}
