"use client"

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Loader2, FolderOpen, Mail, User, Lock, Eye, EyeOff } from 'lucide-react'

interface InvitationInfo {
  email: string
  projectName: string
  projectId: string
  companyName: string
  role: string
}

function AcceptProjectInviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState<'loading' | 'register' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  
  // Registration form state
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid invitation link. No token provided.')
      return
    }

    checkInvitationAndUser()
  }, [token])

  async function checkInvitationAndUser() {
    try {
      const supabase = createClient()
      
      // First, fetch invitation details (don't require login)
      const infoRes = await fetch(`/api/accept-project-invite?token=${token}`)
      const infoData = await infoRes.json()
      
      if (!infoRes.ok) {
        setStatus('error')
        setMessage(infoData.error || 'Invalid invitation link.')
        return
      }
      
      setInvitation(infoData)
      
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // User is logged in - try to accept immediately
        await acceptInvitation()
      } else {
        // User not logged in - show registration form
        setStatus('register')
      }
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message || 'An unexpected error occurred.')
    }
  }

  async function acceptInvitation() {
    try {
      // Call the API to accept the invitation
      const res = await fetch('/api/accept-project-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage(data.message || 'You have successfully joined the project!')
        if (data.projectName) {
          setInvitation(prev => prev ? { ...prev, projectName: data.projectName, projectId: data.projectId } : null)
        }
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to accept invitation.')
      }
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message || 'An unexpected error occurred.')
    }
  }

  async function handleRegisterAndAccept(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    
    // Validation
    if (!fullName.trim()) {
      setFormError('Please enter your full name')
      return
    }
    
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters')
      return
    }
    
    if (password !== confirmPassword) {
      setFormError('Passwords do not match')
      return
    }
    
    setSubmitting(true)
    
    try {
      const supabase = createClient()
      
      // Create the account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invitation!.email,
        password,
        options: {
          data: {
            full_name: fullName.trim()
          }
        }
      })
      
      if (signUpError) {
        // Check if user already exists
        if (signUpError.message?.includes('already registered')) {
          setFormError('This email is already registered. Please log in instead.')
          return
        }
        throw signUpError
      }
      
      if (!signUpData.user) {
        throw new Error('Failed to create account')
      }
      
      // Wait a moment for the session to be established
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Now accept the invitation
      await acceptInvitation()
      
    } catch (err: any) {
      console.error('Registration error:', err)
      setFormError(err.message || 'Failed to create account')
    } finally {
      setSubmitting(false)
    }
  }

  function handleLogin() {
    const returnUrl = encodeURIComponent(window.location.href)
    router.push(`/login?returnUrl=${returnUrl}`)
  }

  function goToProject() {
    if (invitation?.projectId) {
      router.push(`/projects/${invitation.projectId}`)
    } else {
      router.push('/projects')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        {status === 'loading' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading Invitation</h1>
            <p className="text-gray-500">Please wait...</p>
          </div>
        )}

        {status === 'register' && invitation && (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <FolderOpen className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Invited!</h1>
              <p className="text-gray-500">
                You've been invited to join <span className="font-semibold text-gray-700">{invitation.projectName}</span>
                {invitation.companyName && <> by {invitation.companyName}</>}
              </p>
            </div>
            
            {/* Invitation details card */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Invited as:</span>
                <span className="font-medium text-gray-900">{invitation.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Role:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                  {invitation.role || 'Viewer'}
                </span>
              </div>
            </div>
            
            <form onSubmit={handleRegisterAndAccept} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">Create your account to accept this invitation</p>
              </div>
              
              {formError && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}
              
              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={invitation.email}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
              
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>
              </div>
              
              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password (min. 6 characters)"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Create Account & Join Project
                  </>
                )}
              </button>
              
              <div className="text-center pt-2">
                <p className="text-sm text-gray-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Log in
                  </button>
                </p>
              </div>
            </form>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to the Project!</h1>
            <p className="text-gray-500 mb-6">{message}</p>
            {invitation?.projectName && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-3">
                  <FolderOpen className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">{invitation.projectName}</span>
                </div>
              </div>
            )}
            <button
              onClick={goToProject}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Go to Project
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Failed</h1>
            <p className="text-gray-500 mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Go to Login
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full text-gray-500 py-2 px-4 font-medium hover:text-gray-700 transition-colors"
              >
                Go to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Loading fallback for Suspense
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h1>
          <p className="text-gray-500">Please wait...</p>
        </div>
      </div>
    </div>
  )
}

// Main export wrapped in Suspense
export default function AcceptProjectInvitePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AcceptProjectInviteContent />
    </Suspense>
  )
}
