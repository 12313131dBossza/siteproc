"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export default function AuthCallbackPage(){
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient(url, anon, { auth: { persistSession: true } });
  const [status, setStatus] = useState<'exchanging'|'verifying'|'redirecting'|'error'>('exchanging');

  useEffect(()=>{(async()=>{
    try {
      const code = params.get('code');
      // 1. Handle code query param (PKCE / OTP link)
      if(code){
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if(error) throw error;
      } else {
        // 2. Handle hash tokens (#access_token=...&refresh_token=...)
        if(typeof window !== 'undefined' && window.location.hash){
          const hash = window.location.hash.substring(1); // remove '#'
          const hashParams = new URLSearchParams(hash);
            const access_token = hashParams.get('access_token');
            const refresh_token = hashParams.get('refresh_token');
            if(access_token && refresh_token){
              const { error } = await supabase.auth.setSession({ access_token, refresh_token });
              if(error) throw error;
              // strip hash for cleanliness
              try { window.history.replaceState({}, '', window.location.pathname + window.location.search); } catch {}
            } else {
              setStatus('verifying');
              await supabase.auth.getSession();
            }
        } else {
          setStatus('verifying');
          await supabase.auth.getSession();
        }
      }
      setStatus('redirecting');
      router.replace('/dashboard');
    } catch(e:any){
      toast.error(e?.message || 'Auth failed');
      router.replace('/login?error=auth_failed');
      setStatus('error');
    }
  })()},[]); // eslint-disable-line

  return <div className="p-8 max-w-md mx-auto space-y-4">
    <h1 className="text-xl font-semibold">Signing you in...</h1>
    <p className="text-sm text-neutral-500">Status: {status}</p>
  </div>;
}