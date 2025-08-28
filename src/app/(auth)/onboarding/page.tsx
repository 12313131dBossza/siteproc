"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Profile { company_id: string | null }

export default function OnboardingPage(){
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const router = useRouter();
  const sb = createClient(url, anon, { auth: { persistSession: true } });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [joinCompanyId, setJoinCompanyId] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(()=>{(async()=>{
    const { data: { user } } = await sb.auth.getUser();
    if(!user){ router.replace('/login'); return; }
    const { data, error } = await sb.from('profiles').select('company_id').eq('id', user.id).single();
    if(!error && data){
      setProfile(data as Profile);
      if(data.company_id){ router.replace('/dashboard'); return; }
    }
    setLoading(false);
  })()},[]); // eslint-disable-line

  async function createCompany(e: React.FormEvent){
    e.preventDefault();
    const name = companyName.trim();
  if(!name){ toast.error('Enter a company name'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/onboarding/create-company', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ name }) });
  if(res.ok){ toast.success('Company created'); router.push('/dashboard'); }
  else { const j = await res.json().catch(()=>({})); toast.error(j.error || 'Create failed'); }
    } finally { setCreating(false); }
  }

  async function joinCompany(e: React.FormEvent){
    e.preventDefault();
    const cid = joinCompanyId.trim();
  if(!cid){ toast.error('Enter invite/company ID'); return; }
    setJoining(true);
    try {
      const res = await fetch('/api/onboarding/join', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ companyId: cid }) });
  if(res.ok){ toast.success('Joined company'); router.push('/dashboard'); }
  else { const j = await res.json().catch(()=>({})); toast.error(j.error || 'Join failed'); }
    } finally { setJoining(false); }
  }

  if(loading) return <div className="p-8 text-sm text-neutral-500">Loading...</div>;

  return <div className="p-8 max-w-xl mx-auto space-y-10">
    <h1 className="text-2xl font-semibold">Onboarding</h1>
    <div className="grid md:grid-cols-2 gap-10">
      <form onSubmit={createCompany} className="space-y-3 p-4 border rounded-lg">
        <h2 className="font-medium">Create company</h2>
        <input value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Acme Inc" className="sp-input w-full" />
        <button disabled={creating} className="sp-btn-primary w-full disabled:opacity-50">{creating?'Creating...':'Create'}</button>
        <p className="text-xs text-neutral-500">Creates a new company and sets you as admin.</p>
      </form>
      <form onSubmit={joinCompany} className="space-y-3 p-4 border rounded-lg">
        <h2 className="font-medium">Join with invite token</h2>
        <input value={joinCompanyId} onChange={e=>setJoinCompanyId(e.target.value)} placeholder="UUID token" className="sp-input w-full" />
        <button disabled={joining} className="sp-btn-secondary w-full disabled:opacity-50">{joining?'Joining...':'Join'}</button>
        <p className="text-xs text-neutral-500">Paste the invite or company ID you received.</p>
      </form>
    </div>
  </div>
}
