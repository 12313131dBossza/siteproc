'use client';

import { useState, useEffect, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();

  // Create supabase client once
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    setMounted(true);
    
    // Handle the recovery token from URL hash
    const handleRecoveryToken = async () => {
      try {
        console.log('[reset-password] Checking for recovery tokens...');
        console.log('[reset-password] Hash:', window.location.hash);
        console.log('[reset-password] Search params:', window.location.search);
        
        // Check URL hash for tokens (Supabase sends tokens in hash fragment)
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        console.log('[reset-password] Token type:', type);
        console.log('[reset-password] Has access token:', !!accessToken);
        console.log('[reset-password] Has refresh token:', !!refreshToken);
        
        if (accessToken && refreshToken && type === 'recovery') {
          console.log('[reset-password] Setting session from recovery tokens...');
          
          // Set the session using the recovery tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('[reset-password] Failed to set session:', error);
            setMessage('Error: Recovery link is invalid or has expired. Please request a new one.');
            setInitializing(false);
            return;
          }
          
          console.log('[reset-password] Session set successfully:', data.user?.email);
          setSessionReady(true);
          
          // Clear the hash from URL for cleaner UX (optional)
          window.history.replaceState(null, '', window.location.pathname);
        } else {
          // No tokens in URL - check if there's an existing session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log('[reset-password] Existing session found');
            setSessionReady(true);
          } else {
            console.log('[reset-password] No tokens or session found');
            setMessage('Error: No valid recovery link detected. Please request a new password reset.');
          }
        }
      } catch (error) {
        console.error('[reset-password] Error handling recovery token:', error);
        setMessage('Error: Something went wrong. Please try again.');
      } finally {
        setInitializing(false);
      }
    };
    
    handleRecoveryToken();
  }, [supabase.auth]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mounted || !sessionReady) {
      setMessage('Error: Session not ready. Please use the link from your email.');
      return;
    }

    // Validation
    if (password !== confirmPassword) {
      setMessage('Error: Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setMessage('Error: Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      console.log('[reset-password] Updating password...');
      
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('[reset-password] Password update error:', error);
        throw error;
      }

      console.log('[reset-password] Password updated successfully');
      setMessage('Password updated successfully! Redirecting to login...');
      
      // Sign out and redirect to login after 2 seconds
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push('/login?message=Password updated. Please sign in with your new password.');
      }, 2000);
      
    } catch (error: any) {
      console.error('[reset-password] Reset password error:', error);
      
      let errorMessage = 'Failed to update password';
      
      if (error && error.message) {
        errorMessage = error.message;
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
            Set new password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Choose a strong password for your account
          </p>
        </div>
        
        {initializing ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying recovery link...</p>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div className="space-y-4">
              <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || !sessionReady}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center pt-6"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="text-gray-400 text-sm">
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </span>
                </button>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading || !sessionReady}
                />
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={loading || !mounted || !sessionReady}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {!mounted ? 'Loading...' : loading ? 'Updating...' : !sessionReady ? 'Session required' : 'Update password'}
              </button>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">
                <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Back to sign in
                </Link>
              </p>
              {!sessionReady && (
                <p className="text-sm text-gray-600 mt-2">
                  <Link href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                    Request new reset link
                  </Link>
                </p>
              )}
            </div>

            {message && (
              <div className={`mt-4 p-4 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                <p className="text-sm">{message}</p>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
