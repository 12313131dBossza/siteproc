import { sbServer } from '@/lib/supabase-server'
import RoleGate from '@/components/RoleGate'
import RfqsPageClient from './pageClient'
export const dynamic = 'force-dynamic'
export default async function RfqsListPage(){
  const supabase = await sbServer()
  const { data, error } = await supabase
    .from('rfqs')
    .select('id,job_id,title,status,needed_date,created_at,public_token')
    .order('created_at', { ascending:false })
    .limit(100)
  const rows = error || !data ? [] : data
  return <RoleGate role="foreman"><RfqsPageClient rows={rows as any} /></RoleGate>
}
