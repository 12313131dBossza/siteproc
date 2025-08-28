"use client";
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/components/ui/Toast';

export default function LoginPage(){
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { push } = useToast();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const supabase = createClient(supabaseUrl, anon, { auth: { persistSession: true } });

  async function submit(e: React.FormEvent){
    e.preventDefault();
    const em = email.trim();
    if(!em){ push({ title:'Enter an email', variant:'error' }); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: em, options: { emailRedirectTo: baseUrl } });
      if (error) push({ title: error.message, variant:'error' });
      else push({ title:'Magic link sent (check inbox)', variant:'success' });
    } catch (err: any){
      push({ title: err.message || 'Unexpected error', variant:'error' });
    } finally { setLoading(false); }
  }

  return <div className="p-8 max-w-md mx-auto space-y-6">
    <h1 className="text-2xl font-semibold">Login</h1>
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium">Email</span>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="sp-input w-full" placeholder="you@example.com" />
      </label>
      <button disabled={loading} className="sp-btn-primary w-full disabled:opacity-50">{loading? 'Sending...' : 'Send Magic Link'}</button>
    </form>
    <p className="text-xs text-neutral-500">We'll email you a magic sign-in link. No password required.</p>
  </div>
}
