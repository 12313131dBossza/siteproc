'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const isDevelopment = process.env.NODE_ENV === 'development';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Safely get app URL with fallback
      let appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl || appUrl.includes('vercel/') || !appUrl.startsWith('http')) {
        appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://siteproc-8wdzkuxol-123s-projects-c0b14341.vercel.app';
      }
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback`,
        },
      });

      if (error) throw error;

      setMessage('Check your email for the login link!');
    } catch (error: any) {
      setMessage('Error: ' + error.message);
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
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send magic link'}
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
