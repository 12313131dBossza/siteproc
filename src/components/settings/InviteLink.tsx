"use client";
import { useState } from 'react'

interface Props { companyId: string; companyName?: string }

export default function InviteLink({ companyId, companyName }: Props) {
  const path = `/onboarding?c=${companyId}`
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path
  const [status, setStatus] = useState<'idle'|'copied'|'error'>('idle')
  
  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setStatus('copied')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2500)
    }
  }
  
  return (
    <div className="space-y-3 p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
      <div className="flex items-start justify-between">
        <div>
          <label className="text-sm font-medium text-white">Team Invite Link</label>
          <p className="text-xs text-neutral-400 mt-1">
            Share this link with teammates to invite them to{' '}
            {companyName ? <span className="font-medium text-blue-400">{companyName}</span> : 'your company'}
          </p>
        </div>
        {status === 'copied' && (
          <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </span>
        )}
      </div>
      
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input 
            readOnly 
            value={fullUrl} 
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-300 font-mono pr-20"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
        </div>
        <button 
          type="button" 
          onClick={copy} 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </button>
      </div>
      
      {status === 'error' && (
        <p className="text-xs text-red-400">Failed to copy. Please copy manually.</p>
      )}
      {status === 'idle' && (
        <div className="flex items-start gap-2 text-xs text-neutral-500">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>New members will be added with 'Member' role by default. You can change their role after they join.</span>
        </div>
      )}
    </div>
  )
}

