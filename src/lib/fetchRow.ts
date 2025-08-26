import { supabaseService } from '@/lib/supabase'

export async function fetchRow<T>(table: string, id: string, companyId: string, select: string = '*'): Promise<T | null> {
  const sb = supabaseService()
  const { data, error } = await sb.from(table as any).select(select as any).eq('company_id', companyId).eq('id', id).single()
  if (error) return null
  return data as unknown as T
}

export default fetchRow