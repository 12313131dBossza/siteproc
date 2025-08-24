import { sbServer } from '@/lib/supabase-server';
export const dynamic = 'force-dynamic';
export default async function ExpenseDetail({ params }: { params: { id: string }}) {
  const supabase = await sbServer();
  const { data, error } = await supabase
    .from('expenses')
    .select('id, category, vendor, amount, spent_at, description, status')
    .eq('id', params.id)
    .single();
  if(error || !data) return <div>Not found.</div>;
  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>Expense {data.id}</h1>
      <div className='grid grid-cols-1 sm:grid-cols-4 gap-4'>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Category</p><p>{data.category || '—'}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Vendor</p><p>{data.vendor || '—'}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Amount</p><p>${data.amount}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Date</p><p>{data.spent_at}</p></div>
      </div>
      <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Description</p><p>{data.description || '—'}</p></div>
      <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Status</p><p>{data.status || '—'}</p></div>
    </div>
  );
}
