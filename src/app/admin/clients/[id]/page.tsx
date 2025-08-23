import React from 'react';
import { clients } from '@/lib/mockData';

export default function ClientDetail({ params }: { params: { id: string }}) {
  const c = clients.find(x=>x.id===params.id);
  if(!c) return <div>Not found.</div>;
  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>{c.name}</h1>
      <div className='grid grid-cols-1 sm:grid-cols-4 gap-4'>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Contact</p><p>{c.contact}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Email</p><p>{c.email}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Projects</p><p>{c.projects}</p></div>
      </div>
    </div>
  );
}
