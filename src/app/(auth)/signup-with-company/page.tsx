'use client';

import { useState, useEffect, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-generate company name from email domain
  useEffect(() => {
    if (email && email.includes('@')) {
      const domain = email.split('@')[1];
      if (domain) {
        const companyFromDomain = domain.split('.')[0];
        // Capitalize first letter
        const suggested = companyFromDomain.charAt(0).toUpperCase() + companyFromDomain.slice(1);
        setCompanyName(suggested);
      }
    }
  }, [email]);

  // Only create supabase client after component mounts
  const supabase = mounted ? createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) : null;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mounted || !supabase) {
      setMessage('Loading...');
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

    if (username.length < 3) {
      setMessage('Error: Username must be at least 3 characters');
      return;
    }

    if (!companyName || companyName.length < 2) {
      setMessage('Error: Please enter a company name');
      return;
    }

    // Check if username contains only valid characters
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setMessage('Error: Username can only contain letters, numbers, hyphens, and underscores');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      console.log('Starting signup process...');
      
      // Check if username already exists
      const { data: existingUsername, error: usernameCheckError } = await supabase
        .from('profiles')
        .select('username')
        .ilike('username', username)
        .single();
      
      if (existingUsername && !usernameCheckError) {
        throw new Error('Username already taken');
      }

      // Step 1: Create company first
      console.log('Creating company:', companyName);
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
        })
        .select()
        .single();

      if (companyError) {
        console.error('Company creation error:', companyError);
        throw new Error('Failed to create company: ' + companyError.message);
      }

      console.log('Company created:', companyData);

      // Step 2: Sign up user with email and password
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            username: username,
            company_id: companyData.id,
          },
        },
      });

      if (error) {
        console.error('Supabase signup error:', error);
        throw error;
      }

      console.log('User signup successful!', data);

      // Step 3: Update profile with company and make them owner
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username: username,
            full_name: fullName,
            email: email,
            company_id: companyData.id,
            role: 'owner', // Make them owner of their company
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error('Profile update error:', profileError);
          // Don't throw - user is created, profile can be fixed later
        }
      }

      setMessage('Account and company created successfully! Redirecting to login...');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      
    } catch (error: any) {
      console.error('Signup error:', error);
      
      let errorMessage = 'Signup failed';
      
      if (error && error.message) {
        if (error.message.includes('already registered')) {
          errorMessage = 'Email already registered';
        } else if (error.message.includes('Username already taken')) {
          errorMessage = 'Username already taken';
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
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join SiteProc to manage your construction projects
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Acme Construction"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Auto-filled from your email domain, but you can change it
              </p>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Letters, numbers, hyphens, and underscores only
              </p>
            </div>
            
            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
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
                disabled={loading}
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
                Confirm Password
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
                disabled={loading}
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading || !mounted}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {!mounted ? 'Loading...' : loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in
              </Link>
            </p>
          </div>

          {message && (
            <div className={`mt-4 p-4 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
              <p className="text-sm">{message}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
