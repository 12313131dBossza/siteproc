'use client'
import { useEffect } from 'react'
import { supabaseAnon } from '@/lib/supabase'
import { UUID_RE } from '@/lib/constants'

/** Generic broadcast subscription hook.
 * channelPattern expects a function that receives id -> channel name (e.g. id => `delivery:${id}`).
 * event name is the broadcast event (e.g. 'delivery-updated').
 */
export function useEntityRealtime(id: string | undefined, channelFor: (id: string)=>string, event: string, onUpdate: (payload?: any)=>void) {
  useEffect(() => {
    if (!id) return
    if (!UUID_RE.test(id)) return
    const sb = supabaseAnon()
    const ch = sb.channel(channelFor(id))
      .on('broadcast', { event }, (p) => { try { onUpdate(p?.payload) } catch {} })
      .subscribe()
    return () => { try { ch.unsubscribe() } catch {} }
  }, [id, channelFor, event, onUpdate])
}
