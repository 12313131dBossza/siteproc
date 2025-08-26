"use client";
import { useEffect } from 'react'
import { supabaseAnon } from './supabase'
import { mergeList, removeFromList } from './mergeList'

export interface RealtimeTableOptions<T> {
  table: string
  companyId: string | null | undefined
  set: React.Dispatch<React.SetStateAction<T[]>>
  getId: (row: T) => string
  mapRow?: (payloadRow: any) => T
  limit?: number
}

export function useTableRealtime<T>(opts: RealtimeTableOptions<T>) {
  const { table, companyId, set, getId, mapRow, limit = 500 } = opts
  useEffect(() => {
    if (!companyId) return
    const sb = supabaseAnon()
    const ch = sb.channel(`${table}-company-${companyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        set(prev => {
          if (payload.eventType === 'DELETE') return removeFromList(prev, (payload.old as any).id, getId)
          const row = mapRow ? mapRow(payload.new) : payload.new as any as T
          const merged = mergeList(prev, row, getId)
          return merged.slice(0, limit)
        })
      })
      .subscribe()
    return () => { try { ch.unsubscribe() } catch {} }
  }, [table, companyId, getId, mapRow, limit, set])
}

export default useTableRealtime