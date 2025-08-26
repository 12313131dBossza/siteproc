// Placeholder for generated Supabase types.
// Run (example): npx supabase gen types typescript --project-id YOUR_ID --schema public > src/types/supabase.ts
// For now we define minimal row types used in new realtime hooks.

export interface JobsRow { id: string; company_id: string; name: string; code: string | null; created_at: string }
export interface ExpensesRow { id: string; company_id: string; job_id: string; amount: string | number; spent_at: string; memo?: string | null; created_at: string }
export interface DeliveriesRow { id: string; company_id: string; job_id: string; po_id: string | null; status: string; created_at: string; delivered_at?: string | null }
export interface CostCodesRow { id: string; company_id: string; job_id: string | null; code: string; description: string | null; created_at: string }
export interface QuotesRow { id: string; company_id: string; rfq_id: string; total: string | number | null; status: string; created_at: string }
export interface PosRow { id: string; company_id: string; job_id: string; po_number: string; status: string; total: string | number | null; created_at: string }

export type Tables = {
  jobs: JobsRow
  expenses: ExpensesRow
  deliveries: DeliveriesRow
  cost_codes: CostCodesRow
  quotes: QuotesRow
  pos: PosRow
}
