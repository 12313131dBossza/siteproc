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
        console.log('[callback] Search params:', Object.fromEntries(searchParams.entries()));
        console.log('[callback] Current URL:', window.location.href);
        console.log('[callback] Hash:', window.location.hash);
        
        // First, try to handle implicit flow tokens from URL hash
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        // Also check URL search params for tokens (some email clients strip hash)
        const urlAccessToken = searchParams.get('access_token');
        const urlRefreshToken = searchParams.get('refresh_token');
        
        if ((accessToken && refreshToken) || (urlAccessToken && urlRefreshToken)) {
          // Hash-based or URL param flow: extract tokens
          const finalAccessToken = accessToken || urlAccessToken;
          const finalRefreshToken = refreshToken || urlRefreshToken;
          
          console.log('[callback] Using token flow');
          console.log('[callback] Hash params:', Object.fromEntries(hashParams.entries()));
          console.log('[callback] URL params:', Object.fromEntries(searchParams.entries()));

          const response = await fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: finalAccessToken,
              refresh_token: finalRefreshToken,
            }),
          });

          const responseData = await response.text();
          console.log('[callback] Set session response:', response.status, responseData);

          if (response.ok) {
            console.log('[callback] Session set successfully');
            setStatus('Login successful! Redirecting...');
            router.replace('/dashboard');
          } else {
            console.error('[callback] Session set failed:', responseData);
            setStatus(`Session failed: ${responseData}`);
            setTimeout(() => router.replace('/login?e=session'), 3000);
          }
        } else {
          // Fallback to PKCE flow if no hash tokens
          const code = searchParams.get('code');
          
          if (code) {
            // PKCE flow: exchange code for session
            console.log('[callback] Using PKCE code flow with code:', code);
            const response = await fetch('/api/auth/exchange-code', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }),
            });

            const responseData = await response.json();
            console.log('[callback] Exchange response:', response.status, responseData);

            if (response.ok) {
              console.log('[callback] PKCE exchange successful');
              setStatus('Login successful! Redirecting...');
              router.replace('/dashboard');
            } else {
              console.error('[callback] PKCE exchange failed:', responseData);
              
              // Handle PKCE challenge error specifically
              if (responseData.shouldRedirect) {
                setStatus('Session expired. Redirecting to login...');
                setTimeout(() => router.replace('/login'), 2000);
              } else {
                setStatus(`Authentication failed: ${responseData.error || 'Unknown error'}`);
                setTimeout(() => router.replace('/login?e=callback'), 3000);
              }
            }
          } else {
            console.error('[callback] No code or tokens found');
            setStatus('No authentication data found');
            setTimeout(() => router.replace('/login?e=nocode'), 3000);
          }
        }
      } catch (error) {
        console.error('[callback] Exception:', error);
        setStatus(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setTimeout(() => router.replace('/login?e=callback'), 3000);
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
