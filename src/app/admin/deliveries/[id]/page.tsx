import { sbServer } from '@/lib/supabase-server';
export const dynamic = 'force-dynamic';
export default async function DeliveryDetail({ params }: { params: { id: string }}) {
  const supabase = await sbServer();
  const { data, error } = await supabase
    .from('deliveries')
    .select('id,status,delivered_at,signer_name,job_id')
    .eq('id', params.id)
    .single();
  if(error || !data) return <div>Not found.</div>;
  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>Delivery {data.id}</h1>
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Project</p><p>{data.job_id?.slice(0,8)}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Status</p><p>{data.status}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Delivered</p><p>{data.delivered_at ? new Date(data.delivered_at).toLocaleString(): '—'}</p></div>
      </div>
      <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Signer</p><p>{data.signer_name || '—'}</p></div>
    </div>
  );
}
