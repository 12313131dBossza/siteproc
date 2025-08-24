import { sbServer } from '@/lib/supabase-server';
export const dynamic = 'force-dynamic';
export default async function ChangeOrderDetail({ params }: { params: { id: string }}) {
  const supabase = await sbServer();
  const { data, error } = await supabase
    .from('change_orders')
    .select('id, status, cost_delta, approved_at, created_at, job_id')
    .eq('id', params.id)
    .single();
  if(error || !data) return <div>Not found.</div>;
  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>Change Order {data.id}</h1>
      <div className='grid grid-cols-1 sm:grid-cols-4 gap-4'>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Project</p><p>{data.job_id?.slice(0,8)}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Status</p><p>{data.status}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Amount Δ</p><p>{data.cost_delta}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Submitted</p><p>{new Date(data.created_at).toLocaleString()}</p></div>
      </div>
    </div>
  );
}
