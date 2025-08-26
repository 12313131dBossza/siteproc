// Unified cursor + realtime merge helper
// Provides list state management with:
// - Stable descending created_at ordering (default)
// - Cursor pagination (created_at based)
// - Realtime INSERT/UPDATE/DELETE merge (using id)
// - Optional filter predicate (e.g. job_id scoping)
// - Type safe generics (T extends { id: string; created_at?: string })
//
// Usage example:
// const { items, loadMore, loading, reset } = usePaginatedRealtime<JobRow>({
//   table: 'jobs', companyId, fetchPage: fetchJobsPage })
//
// fetchPage signature: async (opts:{ companyId:string; limit:number; cursor?:string }) => Promise<{ items:T[]; nextCursor:string|null }>
"use client";
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabaseAnon } from '@/lib/supabase'
import { tableChannelAll } from '@/lib/channels'

export interface FetchPageResult<T> { items: T[]; nextCursor: string | null }
export interface FetchPageOpts { companyId: string; limit: number; cursor?: string }
export type FetchPageFn<T> = (o: FetchPageOpts) => Promise<FetchPageResult<T>>

export interface UsePaginatedRealtimeOpts<T extends { id: string; created_at?: string | null }> {
  table: string
  companyId?: string | null
  limit?: number
  fetchPage: FetchPageFn<T>
  id: (row: T) => string
  filter?: (row: T) => boolean // optional client-side filter (e.g. job_id match)
  sort?: (a: T, b: T) => number // optional override (default: created_at desc then id)
  pause?: boolean
}

export interface PaginatedRealtime<T> {
  items: T[]
  loadMore: () => Promise<void>
  loading: boolean
  nextCursor: string | null
  reset: () => void
  received: number // realtime event counter
}

export function usePaginatedRealtime<T extends { id: string; created_at?: string | null }>(opts: UsePaginatedRealtimeOpts<T>): PaginatedRealtime<T> {
  const { table, companyId, limit = 50, fetchPage, id, filter, sort, pause } = opts
  const [items, setItems] = useState<T[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [received, setReceived] = useState(0)
  const cursorRef = useRef<string | null>(null)
  const mountedRef = useRef(false)

  const sortFn = useCallback((a: T, b: T) => {
    if (sort) return sort(a,b)
    const ca = a.created_at || ''
    const cb = b.created_at || ''
    if (ca === cb) return id(a).localeCompare(id(b))
    return ca > cb ? -1 : 1 // descending
  }, [sort, id])

  const mergeUpsert = useCallback((row: T) => {
    if (filter && !filter(row)) return
    setItems(prev => {
      const idx = prev.findIndex(r => id(r) === id(row))
      let next: T[]
      if (idx === -1) next = [row, ...prev]
      else { next = [...prev]; next[idx] = { ...prev[idx], ...row } }
      next.sort(sortFn)
      return next
    })
  }, [id, filter, sortFn])

  const mergeDelete = useCallback((rowId: string) => {
    setItems(prev => prev.filter(r => id(r) !== rowId))
  }, [id])

  const loadFirst = useCallback(async () => {
    if (!companyId || pause) return
    setLoading(true)
    try {
      const res = await fetchPage({ companyId, limit })
      let page = filter ? res.items.filter(filter) : res.items
      page.sort(sortFn)
      setItems(page)
      setNextCursor(res.nextCursor)
      cursorRef.current = res.nextCursor
    } finally { setLoading(false) }
  }, [companyId, fetchPage, limit, filter, sortFn, pause])

  const loadMore = useCallback(async () => {
    if (!companyId || pause) return
    if (!nextCursor) return
    setLoading(true)
    try {
      const res = await fetchPage({ companyId, limit, cursor: nextCursor })
      let page = filter ? res.items.filter(filter) : res.items
      setItems(prev => {
        const merged: T[] = [...prev]
        for (const r of page) {
          const idx = merged.findIndex(x => id(x) === id(r))
          if (idx === -1) {
            merged.push(r)
          } else {
            merged[idx] = { ...merged[idx], ...r }
          }
        }
        merged.sort(sortFn)
        return merged
      })
      setNextCursor(res.nextCursor)
      cursorRef.current = res.nextCursor
    } finally { setLoading(false) }
  }, [companyId, pause, nextCursor, fetchPage, limit, filter, sortFn, id])

  // Initial load
  useEffect(() => { mountedRef.current = true; loadFirst(); return () => { mountedRef.current = false } }, [loadFirst])

  // Realtime subscription
  useEffect(() => {
    if (!companyId || pause) return
    const sb = supabaseAnon()
    const channels = tableChannelAll(table, companyId)
    const subs: any[] = []
    for (const name of channels) {
      const ch = sb.channel(name)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          if (payload.eventType === 'DELETE') mergeDelete((payload.old as any).id)
          else mergeUpsert(payload.new as T)
          setReceived(r => r + 1)
        })
        .subscribe()
      subs.push(ch)
    }
    return () => { for (const ch of subs) { try { ch.unsubscribe() } catch {} } }
  }, [companyId, table, mergeUpsert, mergeDelete, pause])

  const reset = useCallback(() => { loadFirst() }, [loadFirst])

  return { items, loadMore, loading, nextCursor, reset, received }
}

export default usePaginatedRealtime
