'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackContent() {
  const [status, setStatus] = useState('Signing you in...');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        
        if (code) {
          // PKCE flow: exchange code for session
          console.log('[callback] Using PKCE code flow');
          const response = await fetch('/api/auth/exchange-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });

          if (response.ok) {
            console.log('[callback] PKCE exchange successful');
            router.replace('/dashboard');
          } else {
            console.error('[callback] PKCE exchange failed');
            router.replace('/login?e=callback');
          }
        } else {
          // Hash-based flow: extract tokens from URL fragment
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            console.log('[callback] Using hash token flow');
            const response = await fetch('/api/auth/set-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: accessToken,
                refresh_token: refreshToken,
              }),
            });

            if (response.ok) {
              console.log('[callback] Session set successfully');
              router.replace('/dashboard');
            } else {
              console.error('[callback] Session set failed');
              router.replace('/login?e=callback');
            }
          } else {
            console.error('[callback] No code or tokens found');
            router.replace('/login?e=nocode');
          }
        }
      } catch (error) {
        console.error('[callback] Exception:', error);
        setStatus('Authentication failed');
        setTimeout(() => router.replace('/login?e=callback'), 2000);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
