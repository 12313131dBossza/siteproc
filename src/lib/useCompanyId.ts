"use client";
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export function useCompanyId(initial?: string | null): string | null {
  const [cid, setCid] = useState<string | null>(initial ?? null)
  
  useEffect(() => {
    if (cid) return
    
    // First try localStorage
    try {
      const v = localStorage.getItem('company_id')
      if (v) {
        setCid(v)
        return
      }
    } catch {}
    
    // If not in localStorage, fetch from user's profile
    const fetchCompanyId = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single()
        
        if (profile?.company_id) {
          localStorage.setItem('company_id', profile.company_id)
          setCid(profile.company_id)
        }
      } catch (error) {
        console.error('Failed to fetch company_id:', error)
      }
    }
    
    fetchCompanyId()
  }, [cid])
  
  return cid
}

export default useCompanyId