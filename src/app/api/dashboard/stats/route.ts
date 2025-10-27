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

    // Fetch all stats in parallel
    const [projectsRes, ordersRes, expensesRes, deliveriesRes] = await Promise.all([
      supabase
        .from('projects')
        .select('total_estimated')
        .eq('company_id', companyId),
      
      supabase
        .from('purchase_orders')
        .select('status, quantity, amount')
        .eq('company_id', companyId),
      
      supabase
        .from('expenses')
        .select('amount, status')
        .eq('company_id', companyId),
      
      supabase
        .from('deliveries')
        .select('id')
        .eq('company_id', companyId),
    ]);

    // Calculate stats
    const projects = projectsRes.data || [];
    const orders = ordersRes.data || [];
    const expenses = expensesRes.data || [];
    const deliveries = deliveriesRes.data || [];

    const totalBudget = projects.reduce((sum, p) => sum + (Number(p.total_estimated) || 0), 0);
    const actualExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const budgetUtilization = totalBudget > 0 ? (actualExpenses / totalBudget) * 100 : 0;
    const pendingApprovals = [
      ...orders.filter(o => o.status === 'pending'),
      ...expenses.filter(e => e.status === 'pending'),
    ].length;

    const stats = {
      totalProjects: projects.length,
      totalOrders: orders.length,
      totalExpenses: expenses.length,
      totalDeliveries: deliveries.length,
      totalBudget,
      actualExpenses,
      budgetUtilization,
      pendingApprovals,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
