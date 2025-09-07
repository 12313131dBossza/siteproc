'use client';

import { useState, useEffect, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useSearchParams } from 'next/navigation';

const isDevelopment = process.env.NODE_ENV === 'development';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only create supabase client after component mounts
  const supabase = mounted ? createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) : null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mounted || !supabase) {
      setMessage('Loading...');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Get app URL safely for client-side only
      const appUrl = window.location.origin;

      // Preserve redirectTo parameter
      const redirectTo = searchParams.get('redirectTo');
      let callbackUrl = `${appUrl}/auth/callback`;
      if (redirectTo) {
        callbackUrl += `?redirectTo=${encodeURIComponent(redirectTo)}`;
      }

      console.log('Starting authentication process...');
      console.log('Email:', email);
      console.log('App URL:', appUrl);
      console.log('Callback URL:', callbackUrl);
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Authentication request timed out after 15 seconds')), 15000);
      });
      
      // Use PKCE flow with explicit configuration
      const authPromise = supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callbackUrl,
          shouldCreateUser: true,
        },
      });

      console.log('Auth response received...');
      
      // Race between auth call and timeout
      const { error } = await Promise.race([authPromise, timeoutPromise]) as any;

      console.log('Auth response received, error:', error);

      if (error) {
        console.error('Supabase auth error:', error);
        console.error('Error message:', error.message);
        console.error('Error status:', error.status);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('Magic link sent successfully');
      setMessage('Check your email for the login link!');
    } catch (error: any) {
      console.error('Full catch error:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      
      let errorMessage = 'Unknown error occurred';
      
      if (error && error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error) {
        errorMessage = JSON.stringify(error);
      }
      
      setMessage('Error: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading || !mounted}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {!mounted ? 'Loading...' : loading ? 'Sending...' : 'Send magic link'}
            </button>
          </div>

          {message && (
            <div className="mt-4 text-center text-sm text-gray-600">
              {message}
            </div>
          )}
        </form>

        {/* Dev Auto-login button - always present in DOM, hidden via CSS in production */}
        <div className={isDevelopment ? 'block' : 'hidden'}>
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Development only</span>
              </div>
            </div>
            <div className="mt-6">
              <a
                href="/api/dev/autologin"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                🚀 Auto-login (dev)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
