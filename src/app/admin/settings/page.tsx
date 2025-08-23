export const dynamic = 'force-dynamic';
"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage(){
  const [tab,setTab]=useState<'org'|'users'|'notifications'|'audit'>('org');
  const { push } = useToast();
  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>Settings</h1>
      <div className='flex gap-2 flex-wrap text-sm'>
        {['org','users','notifications','audit'].map(t=> <button key={t} onClick={()=>setTab(t as any)} className={`px-3 py-1.5 rounded-md ${tab===t ? 'bg-[var(--sp-color-primary)] text-white' : 'bg-[var(--sp-color-primary)]/10 text-[var(--sp-color-primary)]'}`}>{t}</button>)}
      </div>
      {tab==='org' && <form onSubmit={e=>{e.preventDefault(); push({ title:'Org settings saved (mock)', variant:'success'});}} className='space-y-4 max-w-xl'>
        <div className='sp-field'><label className='text-xs font-medium'>Organization Name</label><input className='sp-input' defaultValue='SiteProc Inc.' /></div>
        <div className='sp-field'><label className='text-xs font-medium'>Timezone</label><input className='sp-input' defaultValue='UTC' /></div>
        <Button type='submit'>Save</Button>
      </form>}
      {tab==='users' && <div className='space-y-4'><p className='text-sm font-medium'>Users & Roles</p><ul className='text-xs space-y-1'><li>jane@siteproc (Admin)</li><li>john@siteproc (Viewer)</li></ul></div>}
      {tab==='notifications' && <form onSubmit={e=>{e.preventDefault(); push({ title:'Preferences saved (mock)', variant:'success'});}} className='space-y-4 max-w-md'>
        <label className='flex items-center gap-2 text-sm'><input type='checkbox' defaultChecked /> Email Alerts</label>
        <label className='flex items-center gap-2 text-sm'><input type='checkbox' /> SMS Alerts</label>
        <Button type='submit'>Save</Button>
      </form>}
      {tab==='audit' && <div className='sp-card text-xs text-[var(--sp-color-muted)]'>Audit log placeholder (mock)</div>}
    </div>
  );
}
