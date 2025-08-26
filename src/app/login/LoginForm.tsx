"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { sbBrowser } from '@/lib/supabase-browser';

interface Props { unauthorized?: boolean }

export default function LoginForm({ unauthorized }: Props) {
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const router = useRouter();

  const validate = () => {
    if(!email.includes('@')) { setError('Enter a valid email'); return false; }
    if(password.length < 4) { setError('Password too short'); return false; }
    setError(null); return true;
  }

  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(!validate()) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = sbBrowser();
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signErr) { setError(signErr.message || 'Login failed'); setLoading(false); return; }
      // Fetch profile to decide destination
      const me = await fetch('/api/me', { cache: 'no-store' }).then(r=>r.ok?r.json():null).catch(()=>null);
      const dest = me?.companyId ? '/admin/dashboard' : '/onboarding';
      router.replace(dest);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--sp-color-bg,#0d0d0d)] p-4">
      <form onSubmit={submit} className="sp-card w-full max-w-sm space-y-5">
        <div>
          <h1 className="text-xl font-semibold mb-1">Sign in</h1>
          <p className="text-xs text-[var(--sp-color-muted)]">Enter your credentials.</p>
          {unauthorized && <p className="text-xs text-[var(--sp-color-danger)] mt-2">Login required.</p>}
        </div>
        <div className="sp-field">
          <label className="text-xs font-medium">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} className="sp-input" type="email" autoComplete="email" required />
        </div>
        <div className="sp-field">
          <label className="text-xs font-medium">Password</label>
          <input value={password} onChange={e=>setPassword(e.target.value)} className="sp-input" type="password" autoComplete="current-password" required />
        </div>
        {error && <div className="sp-error text-xs text-red-400 break-words">{error}</div>}
        <Button type="submit" loading={loading} className="w-full">Login</Button>
      </form>
    </div>
  );
}
