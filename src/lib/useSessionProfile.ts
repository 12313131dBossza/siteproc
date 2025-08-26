"use client";
import { useState, useEffect } from 'react'

export interface SessionProfileState {
  loading: boolean
  user?: { id: string; email?: string | null }
  companyId?: string | null
  role?: string | null
  error?: string
}

export function useSessionProfile(): SessionProfileState {
  const [state, setState] = useState<SessionProfileState>({ loading: true })
  useEffect(() => {
    let active = true
    fetch('/api/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => { if (!active) return; if (j.error) setState({ loading: false, error: j.error }); else setState({ loading: false, user: j.user, companyId: j.companyId, role: j.role }) })
      .catch(() => { if (active) setState({ loading: false, error: 'network' }) })
    return () => { active = false }
  }, [])
  return state
}