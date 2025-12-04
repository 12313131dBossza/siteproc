                                                      'use client';

import { useState, useEffect, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const isDevelopment = process.env.NODE_ENV === 'development';

function LoginForm() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // Restore remember me preference from localStorage
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    setRememberMe(savedRememberMe);
    
    // Restore email/username if remember me was previously checked
    if (savedRememberMe) {
      const savedCredential = localStorage.getItem('savedCredential');
      if (savedCredential) {
        setEmailOrUsername(savedCredential);
      }
    }
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
      // Save remember me preference and credentials if checked
      localStorage.setItem('rememberMe', rememberMe.toString());
      if (rememberMe) {
        localStorage.setItem('savedCredential', emailOrUsername);
      } else {
        localStorage.removeItem('savedCredential');
      }

      console.log('Starting password authentication...');
      console.log('Email/Username:', emailOrUsername);
      console.log('Remember Me:', rememberMe);
      
      // Determine if input is email or username
      const isEmail = emailOrUsername.includes('@');
      let loginEmail = emailOrUsername;
      
      // If it's a username, we need to look up the email first
      if (!isEmail) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .ilike('username', emailOrUsername)
          .single();
        
        if (profileError || !profile?.email) {
          throw new Error('Username not found');
        }
        
        loginEmail = profile.email;
      }

      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (error) {
        console.error('Supabase auth error:', error);
        throw error;
      }

      console.log('Login successful!');
      
      // Update last_login timestamp in profiles
      if (data.user) {
        await supabase
          .from('profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id);
      }
      
      // Get redirect URL
      const redirectTo = searchParams.get('redirectTo') || '/dashboard';
      
      // Redirect to dashboard or requested page
      router.push(redirectTo);
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed';
      
      if (error && error.message) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid username/email or password';
        } else if (error.message.includes('Username not found')) {
          errorMessage = 'Username not found';
        } else {
          errorMessage = error.message;
        }
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
          <div className="space-y-4">
            <div>
              <label htmlFor="emailOrUsername" className="sr-only">
                Email or Username
              </label>
              <input
                id="emailOrUsername"
                name="emailOrUsername"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email or Username"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                <span className="text-gray-400 text-sm">
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>
            
            <div className="text-sm">
              <Link href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                Forgot password?
              </Link>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading || !mounted}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {!mounted ? 'Loading...' : loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          
          {/* Signup link hidden in production - private demo only */}
          {isDevelopment && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Sign up
                </Link>
              </p>
            </div>
          )}

          {message && (
            <div className={`mt-4 text-center text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
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
