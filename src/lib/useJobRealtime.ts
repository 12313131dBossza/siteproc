"use client"
import { useEffect } from 'react'
import { supabaseAnon } from '@/lib/supabase'
import { EVENTS, UUID_RE } from '@/lib/constants'

/**
 * Subscribe to job aggregate events (expenses, deliveries, cost codes)
 * Channel: job:{jobId}
 * Events: job-expense-updated, job-delivery-updated, job-cost-code-updated
 */
// ---- Payload Shapes -------------------------------------------------------
// (Kept minimal / additive; optional fields account for variant emissions.)
export interface JobExpenseEventPayload { kind: 'expense'; job_id: string; expense_id: string; at: string }
export interface JobDeliveryEventPayload { kind: 'delivery'; job_id: string; delivery_id: string; at: string; status?: string; photos_added?: number; signature?: string }
export interface JobCostCodeEventPayload { kind: 'cost_code'; job_id: string; cost_code_id: string; at: string }
export interface JobPoEventPayload { kind: 'po'; job_id: string; po_id: string; at: string }
export interface JobChangeOrderEventPayload { kind: 'change_order'; job_id: string; change_order_id: string; at: string; status?: string }
export type JobEventPayload = JobExpenseEventPayload | JobDeliveryEventPayload | JobCostCodeEventPayload | JobPoEventPayload | JobChangeOrderEventPayload

export function isJobEventPayload(v: any): v is JobEventPayload {
  return v && typeof v === 'object' && typeof v.kind === 'string' && typeof v.job_id === 'string'
}

export interface UseJobRealtimeHandlers {
  onExpense?: (payload: JobExpenseEventPayload) => void
  onDelivery?: (payload: JobDeliveryEventPayload) => void
  onCostCode?: (payload: JobCostCodeEventPayload) => void
  onPo?: (payload: JobPoEventPayload) => void
  onChangeOrder?: (payload: JobChangeOrderEventPayload) => void
  /** Called for every job event after the specific handler */
  onAny?: (payload: JobEventPayload, event: typeof EVENTS[keyof typeof EVENTS]) => void
  onStatus?: (status: 'idle' | 'connecting' | 'connected' | 'error') => void
}

export function useJobRealtime(jobId: string | undefined, handlers: UseJobRealtimeHandlers) {
  useEffect(() => {
    if (!jobId) return
    if (!UUID_RE.test(jobId)) return
    let cancelled = false
    let attempt = 0
    let timeout: number | null = null

    function connect() {
      if (cancelled) return
      handlers.onStatus?.('connecting')
      const sb = supabaseAnon()
      const ch = sb.channel(`job:${jobId}`)
        .on('broadcast', { event: EVENTS.JOB_EXPENSE_UPDATED }, (e) => {
          const payload = e.payload as JobExpenseEventPayload
          try { handlers.onExpense?.(payload) } catch {}
          try { handlers.onAny?.(payload, EVENTS.JOB_EXPENSE_UPDATED) } catch {}
        })
        .on('broadcast', { event: EVENTS.JOB_DELIVERY_UPDATED }, (e) => {
          const payload = e.payload as JobDeliveryEventPayload
          try { handlers.onDelivery?.(payload) } catch {}
          try { handlers.onAny?.(payload, EVENTS.JOB_DELIVERY_UPDATED) } catch {}
        })
        .on('broadcast', { event: EVENTS.JOB_COST_CODE_UPDATED }, (e) => {
          const payload = e.payload as JobCostCodeEventPayload
          try { handlers.onCostCode?.(payload) } catch {}
          try { handlers.onAny?.(payload, EVENTS.JOB_COST_CODE_UPDATED) } catch {}
        })
        .on('broadcast', { event: EVENTS.JOB_PO_UPDATED }, (e) => {
          const payload = e.payload as JobPoEventPayload
          try { handlers.onPo?.(payload) } catch {}
          try { handlers.onAny?.(payload, EVENTS.JOB_PO_UPDATED) } catch {}
        })
        .on('broadcast', { event: EVENTS.JOB_CHANGE_ORDER_UPDATED }, (e) => {
          const payload = e.payload as JobChangeOrderEventPayload
          try { handlers.onChangeOrder?.(payload) } catch {}
          try { handlers.onAny?.(payload, EVENTS.JOB_CHANGE_ORDER_UPDATED) } catch {}
        })

      const sub = ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') { attempt = 0; handlers.onStatus?.('connected') }
        else if (status === 'CHANNEL_ERROR') {
          handlers.onStatus?.('error')
          // incremental backoff: 0.5s,1s,2s,4s(max 5s)
          const backoff = Math.min(5000, 500 * Math.pow(2, attempt++))
          if (!cancelled) {
            if (timeout) window.clearTimeout(timeout)
            timeout = window.setTimeout(() => { try { sub.unsubscribe() } catch {}; connect() }, backoff)
          }
        }
      })
    }
    connect()
    return () => { cancelled = true; handlers.onStatus?.('idle'); if (timeout) window.clearTimeout(timeout) }
  // We intentionally depend on specific handler refs – if caller redefines object each render, a resubscribe occurs (acceptable for now).
  }, [jobId, handlers.onExpense, handlers.onDelivery, handlers.onCostCode, handlers.onPo, handlers.onChangeOrder, handlers.onAny, handlers.onStatus])
}
