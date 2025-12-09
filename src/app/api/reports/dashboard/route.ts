import { NextResponse } from 'next/server';
import { getSessionProfile } from '@/lib/auth';
import { supabaseService } from '@/lib/supabase';

/**
 * GET /api/reports/dashboard
 * 
 * Fetch comprehensive dashboard data using Phase 8 report views
 * Returns: KPI stats, budget variance, monthly trends, vendor summary
 */
export async function GET() {
  try {
    const session = await getSessionProfile();
    if (!session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Prefer the normalized companyId field, fall back to raw profile.company_id
    const companyId = session.companyId || session.profile?.company_id;
    
    console.log('[Dashboard API] Session info:', {
      userId: session.user?.id,
      userEmail: session.user?.email,
      companyId: companyId,
      sessionCompanyId: session.companyId,
      profileCompanyId: session.profile?.company_id,
      role: session.role,
      hasProfile: !!session.profile
    });
    
    if (!companyId) {
      console.error('[Dashboard API] No company_id found in session');
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    const supabase = supabaseService();

    console.log('[Dashboard API] Fetching data for company:', companyId);

    // Fetch all dashboard data in parallel
    const [
      projectsRes,
      expensesRes,
      deliveriesRes,
      paymentsRes,
      ordersRes
    ] = await Promise.allSettled([
      // Raw data for KPIs and calculations - NOTE: actual_expenses column may not exist, we'll calculate it
      supabase.from('projects').select('id, name, code, status, budget').eq('company_id', companyId),
      supabase.from('expenses').select('*').eq('company_id', companyId),
      supabase.from('deliveries').select('id, status, created_at, company_id').eq('company_id', companyId),
      supabase.from('payments').select('id, status, amount, payment_date, vendor_name').eq('company_id', companyId),
      supabase.from('purchase_orders').select('id, status, amount, created_at').eq('company_id', companyId),
    ]);

    console.log('[Dashboard API] Projects result:', {
      status: projectsRes.status,
      count: projectsRes.status === 'fulfilled' ? projectsRes.value.data?.length : 0,
      error: projectsRes.status === 'rejected' ? projectsRes.reason : (projectsRes.status === 'fulfilled' ? projectsRes.value.error : null)
    });

    // Extract data from settled promises
    const projects = projectsRes.status === 'fulfilled' ? (projectsRes.value.data || []) : [];
    const expenses = expensesRes.status === 'fulfilled' ? (expensesRes.value.data || []) : [];
    const deliveries = deliveriesRes.status === 'fulfilled' ? (deliveriesRes.value.data || []) : [];
    const payments = paymentsRes.status === 'fulfilled' ? (paymentsRes.value.data || []) : [];
    const orders = ordersRes.status === 'fulfilled' ? (ordersRes.value.data || []) : [];

    console.log('[Dashboard API] Data counts:', {
      projects: projects.length,
      expenses: expenses.length,
      deliveries: deliveries.length,
      payments: payments.length,
      orders: orders.length
    });

    // Calculate actual expenses per project from expenses table
    const projectExpenses = new Map<string, number>();
    expenses.forEach((expense: any) => {
      if (expense.project_id && expense.status === 'approved') {
        const projectId = expense.project_id;
        const current = projectExpenses.get(projectId) || 0;
        projectExpenses.set(projectId, current + (Number(expense.amount) || 0));
      }
    });

    // Add calculated actual_expenses to each project
    const projectsWithExpenses = projects.map((p: any) => ({
      ...p,
      actual_expenses: projectExpenses.get(p.id) || 0,
      variance: (Number(p.budget) || 0) - (projectExpenses.get(p.id) || 0)
    }));

    console.log('[Dashboard API] Projects with calculated expenses:', {
      projectsCount: projectsWithExpenses.length,
      totalBudget: projectsWithExpenses.reduce((sum: number, p: any) => sum + (Number(p.budget) || 0), 0),
      totalActual: projectsWithExpenses.reduce((sum: number, p: any) => sum + (p.actual_expenses || 0), 0)
    });

    // Calculate monthly financial data from expenses and payments
    const monthlyData = new Map<string, any>();
    
    // Group expenses by month
    expenses.forEach((expense: any) => {
      if (expense.spent_at && expense.status === 'approved') {
        const date = new Date(expense.spent_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { month: monthKey, expenses: 0, payments: 0 });
        }
        const data = monthlyData.get(monthKey);
        data.expenses += Number(expense.amount) || 0;
      }
    });

    // Group payments by month
    payments.forEach((payment: any) => {
      if (payment.payment_date) {
        const date = new Date(payment.payment_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { month: monthKey, expenses: 0, payments: 0 });
        }
        const data = monthlyData.get(monthKey);
        data.payments += Number(payment.amount) || 0;
      }
    });

    // Calculate vendor summary from payments
    const vendorData = new Map<string, any>();
    payments.forEach((payment: any) => {
      if (payment.vendor_name && payment.status === 'paid') {
        const vendor = payment.vendor_name;
        if (!vendorData.has(vendor)) {
          vendorData.set(vendor, { name: vendor, totalPaid: 0, count: 0 });
        }
        const data = vendorData.get(vendor);
        data.totalPaid += Number(payment.amount) || 0;
        data.count += 1;
      }
    });

    // Calculate expense breakdown by category
    const categoryData = new Map<string, any>();
    expenses.forEach((expense: any) => {
      if (expense.category && expense.status === 'approved') {
        const category = expense.category;
        if (!categoryData.has(category)) {
          categoryData.set(category, { category, amount: 0, count: 0 });
        }
        const data = categoryData.get(category);
        data.amount += Number(expense.amount) || 0;
        data.count += 1;
      }
    });

    // Calculate KPI stats
    // Normalize helpers
    const toLower = (s: any) => (typeof s === 'string' ? s.toLowerCase() : s);

    const deliveriesStats = {
      total: deliveries.length,
      pending: deliveries.filter((d: any) => toLower(d.status) === 'pending').length,
      delivered: deliveries.filter((d: any) => toLower(d.status) === 'delivered').length,
      partial: deliveries.filter((d: any) => toLower(d.status) === 'partial').length,
    };

    const stats = {
      projects: {
        total: projectsWithExpenses.length,
        active: projectsWithExpenses.filter((p: any) => toLower(p.status) === 'active').length,
        totalBudget: projectsWithExpenses.reduce((sum: number, p: any) => sum + (Number(p.budget) || 0), 0),
        totalSpent: projectsWithExpenses.reduce((sum: number, p: any) => sum + (p.actual_expenses || 0), 0),
      },
      orders: {
        total: orders.length,
        pending: orders.filter((o: any) => toLower(o.status) === 'pending').length,
        approved: orders.filter((o: any) => toLower(o.status) === 'approved').length,
        thisMonth: orders.filter((o: any) => {
          if (!o.created_at) return false;
          const date = new Date(o.created_at);
          const now = new Date();
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length,
      },
      deliveries: deliveriesStats,
      payments: {
        total: payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
        paid: payments.filter((p: any) => toLower(p.status) === 'paid').reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
        unpaid: payments.filter((p: any) => toLower(p.status) === 'unpaid' || toLower(p.status) === 'partial' || toLower(p.status) === 'pending').reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
        thisMonth: payments.filter((p: any) => {
          if (!p.payment_date) return false;
          const date = new Date(p.payment_date);
          const now = new Date();
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
      },
    };

    // Calculate budget health distribution from projects
    const budgetHealth = {
      overBudget: projectsWithExpenses.filter((p: any) => {
        const spent = p.actual_expenses || 0;
        const budget = Number(p.budget) || 0;
        return budget > 0 && spent > budget;
      }).length,
      critical: projectsWithExpenses.filter((p: any) => {
        const spent = p.actual_expenses || 0;
        const budget = Number(p.budget) || 0;
        return budget > 0 && spent > budget * 0.9 && spent <= budget;
      }).length,
      warning: projectsWithExpenses.filter((p: any) => {
        const spent = p.actual_expenses || 0;
        const budget = Number(p.budget) || 0;
        return budget > 0 && spent > budget * 0.75 && spent <= budget * 0.9;
      }).length,
      healthy: projectsWithExpenses.filter((p: any) => {
        const spent = p.actual_expenses || 0;
        const budget = Number(p.budget) || 0;
        return budget > 0 && spent <= budget * 0.75;
      }).length,
    };

    // Generate last 6 months including current month
    const last6Months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      last6Months.push(monthKey);
    }

    // Transform monthly data for charts - ensure all 6 months are included
    const monthlyTrends = last6Months.map((monthKey) => {
      const data = monthlyData.get(monthKey) || { expenses: 0, payments: 0 };
      return {
        month: new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        expenses: data.expenses || 0,
        payments: data.payments || 0,
        orders: 0,
        deliveries: 0,
      };
    });

    // Top 5 vendors
    const topVendors = Array.from(vendorData.values())
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 5)
      .map((vendor: any) => ({
        name: vendor.name,
        totalPaid: vendor.totalPaid,
        paymentCount: vendor.count,
        avgPayment: vendor.count > 0 ? vendor.totalPaid / vendor.count : 0,
      }));

    // Expense category breakdown for pie chart
    const expenseBreakdown = Array.from(categoryData.values())
      .sort((a, b) => b.amount - a.amount)
      .map((cat: any) => ({
        category: cat.category,
        amount: cat.amount,
        count: cat.count,
      }));

    // Budget variance for top projects
    const budgetVariance = projectsWithExpenses
      .map((p: any) => ({
        project_name: p.name || 'Unnamed Project',
        budget: Number(p.budget) || 0,
        actual_cost: p.actual_expenses || 0,
        variance: p.variance || 0,
        variance_percent: Number(p.budget) > 0 
          ? (((p.variance || 0) / Number(p.budget)) * 100).toFixed(1)
          : 0,
      }))
      .slice(0, 5);

    console.log('[Dashboard API] Returning stats:', {
      projectsTotal: stats.projects.total,
      totalBudget: stats.projects.totalBudget,
      expensesCount: expenses.length,
      paymentsCount: payments.length,
      monthlyTrendsCount: monthlyTrends.length,
      topVendorsCount: topVendors.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        stats,
        budgetHealth,
        monthlyTrends,
        topVendors,
        expenseBreakdown,
        budgetVariance: budgetVariance.slice(0, 5), // Top 5 projects
      },
    });

  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
