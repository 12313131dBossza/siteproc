import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';
import { getCurrentUserProfile } from '@/lib/server-utils';

// GET /api/reports/payments - Payment Summary Report
export async function GET(request: NextRequest) {
  try {
    const { user, profile, error: authError } = await getCurrentUserProfile();

    if (authError || !profile || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await sbServer();

    // Get all expenses (which represent payments/payables) for the company
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('id, vendor, category, amount, status, created_at, approved_at, description')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError);
      return NextResponse.json(
        { error: 'Failed to fetch payment data', details: expensesError.message },
        { status: 500 }
      );
    }

    // Categorize payments by status
    const paid = expenses?.filter(e => e.status === 'paid' || e.status === 'approved') || [];
    const unpaid = expenses?.filter(e => e.status === 'pending') || [];
    const rejected = expenses?.filter(e => e.status === 'rejected') || [];

    // Calculate overdue (expenses older than 30 days and still pending)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const overdue = unpaid.filter(e => new Date(e.created_at) < thirtyDaysAgo);

    // Calculate amounts
    const totalPaid = paid.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const totalUnpaid = unpaid.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const totalOverdue = overdue.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const totalRejected = rejected.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    // Format the data for the report
    const report = expenses?.map(expense => ({
      id: expense.id,
      vendor: expense.vendor || 'Unknown Vendor',
      category: expense.category || 'Other',
      amount: parseFloat(expense.amount) || 0,
      status: expense.status,
      description: expense.description,
      created_at: expense.created_at,
      approved_at: expense.approved_at,
      is_overdue: expense.status === 'pending' && new Date(expense.created_at) < thirtyDaysAgo,
      age_days: Math.floor((new Date().getTime() - new Date(expense.created_at).getTime()) / (1000 * 60 * 60 * 24))
    })) || [];

    // Group by category
    const byCategory: Record<string, { count: number; total: number }> = {};
    expenses?.forEach(e => {
      const cat = e.category || 'Other';
      if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, total: 0 };
      }
      byCategory[cat].count++;
      byCategory[cat].total += parseFloat(e.amount) || 0;
    });

    return NextResponse.json({
      ok: true,
      data: report,
      summary: {
        total_payments: expenses?.length || 0,
        total_paid_amount: totalPaid,
        total_unpaid_amount: totalUnpaid,
        total_overdue_amount: totalOverdue,
        total_rejected_amount: totalRejected,
        paid_count: paid.length,
        unpaid_count: unpaid.length,
        overdue_count: overdue.length,
        rejected_count: rejected.length,
        by_category: byCategory
      }
    });
  } catch (error: any) {
    console.error('Error in GET /api/reports/payments:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
