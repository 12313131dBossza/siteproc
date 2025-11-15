'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    loadInvitation();
  }, [token]);

  async function loadInvitation() {
    try {
      const { data, error: fetchError } = await supabase
        .from('user_invitations')
        .select('*, companies(name)')
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .single();

      if (fetchError || !data) {
        setError('Invitation not found or has expired');
        setLoading(false);
        return;
      }

      // Check if invitation has expired
      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        setError('This invitation has expired');
        setLoading(false);
        return;
      }

      setInvitation(data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading invitation:', err);
      setError('Failed to load invitation');
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
      });

      if (signUpError) {
        console.error('Sign up error:', signUpError);
        toast.error(signUpError.message || 'Failed to create account');
        setSubmitting(false);
        return;
      }

      if (!authData.user) {
        toast.error('Failed to create user account');
        setSubmitting(false);
        return;
      }

      // Step 2: Create/update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: invitation.email,
          full_name: fullName,
          company_id: invitation.company_id,
          role: invitation.role,
          ...invitation.metadata,
        });

      if (profileError) {
        console.error('Profile error:', profileError);
        toast.error('Failed to create profile');
        setSubmitting(false);
        return;
      }

      // Step 3: Update invitation status
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Update invitation error:', updateError);
        // Don't fail - user is created, this is just tracking
      }

      toast.success('Account created successfully! Redirecting to dashboard...');
      
      // Wait a moment then redirect
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      toast.error(err.message || 'Failed to accept invitation');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Loading invitation...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-red-50 rounded-full">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Invalid Invitation</h1>
            <p className="text-gray-600 text-center">{error}</p>
            <Button onClick={() => router.push('/login')} variant="primary" className="mt-4">
              Go to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <span className="text-3xl">🏗️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Join SiteProc</h1>
          <p className="text-gray-600">
            You've been invited to join <strong>{invitation.companies?.name}</strong>
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium text-gray-900">{invitation.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Role:</span>
              <span className="font-medium text-gray-900 capitalize">{invitation.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Company:</span>
              <span className="font-medium text-gray-900">{invitation.companies?.name}</span>
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAccept();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
              fullWidth
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              fullWidth
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              fullWidth
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={submitting}
            leftIcon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          >
            {submitting ? 'Creating Account...' : 'Accept & Create Account'}
          </Button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <Card className="p-8 max-w-md w-full">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Loading invitation...</p>
            </div>
          </Card>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
