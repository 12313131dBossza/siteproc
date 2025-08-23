"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { setMockRole } from '@/lib/useRoleGuard';
import { useRouter } from 'next/navigation';

interface Props { next: string; unauthorized?: boolean; }

export default function LoginForm({ next, unauthorized }: Props) {
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const router = useRouter();

  function validate(){
    if(!email.includes('@')) { setError('Enter a valid email'); return false; }
    if(password.length < 4) { setError('Password too short'); return false; }
    setError(null); return true;
  }
  function submit(e:React.FormEvent){
    e.preventDefault();
    if(!validate()) return;
    setLoading(true);
    setTimeout(()=>{ setMockRole('admin'); router.replace(next); },600);
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--sp-color-bg)] p-4">
      <form onSubmit={submit} className="sp-card w-full max-w-sm space-y-5">
        <div>
          <h1 className="text-xl font-semibold mb-1">Sign in</h1>
          <p className="text-xs text-[var(--sp-color-muted)]">Use any email/password (mock auth)</p>
          {unauthorized && <p className="text-xs text-[var(--sp-color-danger)] mt-2">Login required.</p>}
        </div>
        <div className="sp-field">
          <label className="text-xs font-medium">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} className="sp-input" type="email" />
        </div>
        <div className="sp-field">
          <label className="text-xs font-medium">Password</label>
          <input value={password} onChange={e=>setPassword(e.target.value)} className="sp-input" type="password" />
        </div>
        {error && <div className="sp-error">{error}</div>}
        <Button type="submit" loading={loading} className="w-full">Login</Button>
      </form>
    </div>
  );
}
