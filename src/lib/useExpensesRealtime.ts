"use client";
import { useEffect, useState } from 'react'
import { supabaseAnon } from './supabase'
import { upsertBy, removeBy } from './realtimeMerge'

export interface ExpenseRow { id:string; amount:number; spent_at:string|null; memo:string|null; created_at?:string|null }

export function useExpensesRealtime(initial: ExpenseRow[], companyId: string) {
  const [rows, setRows] = useState<ExpenseRow[]>(initial)
  useEffect(() => {
    if (!companyId) return
    const sb = supabaseAnon()
    const channelName = `expenses-company-${companyId}`
    const ch = sb.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, (payload: any) => {
        setRows(prev => {
          if (payload.eventType === 'DELETE') {
            return removeBy(prev, payload.old.id, r => r.id)
          }
          const item: ExpenseRow = {
            id: payload.new.id,
            amount: Number(payload.new.amount),
            spent_at: payload.new.spent_at || null,
            memo: payload.new.memo || null,
            created_at: payload.new.created_at || null,
          }
          const merged = upsertBy(prev, item, r => r.id)
          return merged.slice(0, 500)
        })
      })
      .subscribe()
    return () => { try { ch.unsubscribe() } catch {} }
  }, [companyId])
  return rows
}
