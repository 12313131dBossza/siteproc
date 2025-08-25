"use client";
import { useEffect, useRef } from 'react'
import { supabaseAnon } from './supabase'
import { EVENTS } from './constants'
import { dashboardChannel } from './realtime'

export function useDashboardRealtime(companyId: string | null | undefined, onUpdate: () => void) {
  const cbRef = useRef(onUpdate)
  cbRef.current = onUpdate
  useEffect(() => {
    if (!companyId) return
    const sb = supabaseAnon()
    const ch = sb.channel(dashboardChannel(companyId))
      .on('broadcast', { event: EVENTS.DASHBOARD_UPDATED }, () => {
        cbRef.current?.()
      })
      .subscribe()
    return () => { try { ch.unsubscribe() } catch {} }
  }, [companyId])
}

export default useDashboardRealtime