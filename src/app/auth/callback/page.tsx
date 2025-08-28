"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

export default function AuthCallbackPage(){
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const router = useRouter();
  const params = useSearchParams();
  const { push } = useToast();
  const supabase = createClient(url, anon, { auth: { persistSession: true } });
  const [status, setStatus] = useState<'exchanging'|'verifying'|'redirecting'|'error'>('exchanging');

  useEffect(()=>{(async()=>{
    const code = params.get('code');
    try {
      if(code){
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if(error) throw error;
      } else {
        setStatus('verifying');
        await supabase.auth.getSession();
      }
      setStatus('redirecting');
      router.replace('/dashboard');
    } catch(e:any){
      push({ title: e?.message || 'Auth failed', variant:'error' });
      setStatus('error');
    }
  })()},[]); // eslint-disable-line

  return <div className="p-8 max-w-md mx-auto space-y-4">
    <h1 className="text-xl font-semibold">Signing you in...</h1>
    <p className="text-sm text-neutral-500">Status: {status}</p>
  </div>;
}