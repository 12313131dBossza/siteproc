import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get user's company_id
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    const companyId = profile.company_id;

    // Fetch data for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [ordersRes, expensesRes, deliveriesRes] = await Promise.all([
      supabase
        .from('purchase_orders')
        .select('created_at')
        .eq('company_id', companyId)
        .gte('created_at', sixMonthsAgo.toISOString()),
      
      supabase
        .from('expenses')
        .select('created_at')
        .eq('company_id', companyId)
        .gte('created_at', sixMonthsAgo.toISOString()),
      
      supabase
        .from('deliveries')
        .select('created_at')
        .eq('company_id', companyId)
        .gte('created_at', sixMonthsAgo.toISOString()),
    ]);

    // Group by month
    const monthMap = new Map<string, { orders: number; expenses: number; deliveries: number }>();

    const addToMonth = (dateStr: string, type: 'orders' | 'expenses' | 'deliveries') => {
      const date = new Date(dateStr);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { orders: 0, expenses: 0, deliveries: 0 });
      }
      
      const monthData = monthMap.get(monthKey)!;
      monthData[type]++;
    };

    (ordersRes.data || []).forEach(o => addToMonth(o.created_at, 'orders'));
    (expensesRes.data || []).forEach(e => addToMonth(e.created_at, 'expenses'));
    (deliveriesRes.data || []).forEach(d => addToMonth(d.created_at, 'deliveries'));

    // Convert to array and sort by date
    const result = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        ...data,
      }))
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Monthly trends error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly trends' },
      { status: 500 }
    );
  }
}
