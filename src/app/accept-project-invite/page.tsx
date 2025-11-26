"use client"

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Loader2, FolderOpen } from 'lucide-react'

export default function AcceptProjectInvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'login-required'>('loading')
  const [message, setMessage] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectId, setProjectId] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid invitation link. No token provided.')
      return
    }

    acceptInvitation()
  }, [token])

  async function acceptInvitation() {
    try {
      const supabase = createClient()
      
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setStatus('login-required')
        setMessage('Please log in to accept this project invitation.')
        return
      }

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
        setProjectName(data.projectName || 'the project')
        setProjectId(data.projectId || '')
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to accept invitation.')
      }
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message || 'An unexpected error occurred.')
    }
  }

  function handleLogin() {
    // Save the current URL to redirect back after login
    const returnUrl = encodeURIComponent(window.location.href)
    router.push(`/login?returnUrl=${returnUrl}`)
  }

  function goToProject() {
    if (projectId) {
      router.push(`/projects/${projectId}`)
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing Invitation</h1>
            <p className="text-gray-500">Please wait while we process your project invitation...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to the Project!</h1>
            <p className="text-gray-500 mb-6">{message}</p>
            {projectName && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-3">
                  <FolderOpen className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">{projectName}</span>
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
                onClick={() => router.push('/projects')}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Go to Projects
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

        {status === 'login-required' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-6">
              <FolderOpen className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h1>
            <p className="text-gray-500 mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={handleLogin}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Log In to Accept
              </button>
              <p className="text-sm text-gray-400">
                Don't have an account?{' '}
                <a href="/signup" className="text-blue-600 hover:underline">
                  Sign up
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
