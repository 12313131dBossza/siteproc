'use client'
import { useEffect } from 'react'
import { supabaseAnon } from '@/lib/supabase'
import { EVENTS, UUID_RE } from '@/lib/constants'

/**
 * Subscribe to realtime PO broadcast events.
 * @param id PO UUID
 * @param onUpdate callback invoked whenever a 'po-updated' broadcast arrives
 */
export function usePoRealtime(id: string | undefined, onUpdate: () => void) {
  useEffect(() => {
    if (!id) return
    if (!UUID_RE.test(id)) return

    const sb = supabaseAnon()
    const ch = sb.channel(`po:${id}`)
      .on('broadcast', { event: EVENTS.PO_UPDATED }, () => {
        try { onUpdate() } catch {}
      })
      .subscribe()

    return () => { try { ch.unsubscribe() } catch {} }
  }, [id, onUpdate])
}
