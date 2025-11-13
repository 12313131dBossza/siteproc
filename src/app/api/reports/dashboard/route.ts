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
    if (!companyId) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    const supabase = supabaseService();

    // Fetch all dashboard data in parallel
    const [
      budgetVarianceRes,
      monthlyFinancialRes,
      vendorSummaryRes,
      expenseCategoryRes,
      projectsRes,
      ordersRes,
      deliveriesRes,
      paymentsRes
    ] = await Promise.allSettled([
      // Phase 8 Report Views - FILTERED BY COMPANY
      supabase.from('report_project_budget_variance').select('*').eq('company_id', companyId).limit(10),
      supabase.from('report_monthly_financial_summary').select('*').eq('company_id', companyId).limit(6),
      supabase.from('report_vendor_summary').select('*').eq('company_id', companyId).limit(10),
      supabase.from('report_expense_category_breakdown').select('*').eq('company_id', companyId),
      
      // Raw data for KPIs
      supabase.from('projects').select('id, status, budget, actual_cost').eq('company_id', companyId),
      // Use purchase_orders which powers the Orders page
      supabase.from('purchase_orders').select('id, status, created_at, amount, delivery_progress, ordered_qty, delivered_qty').eq('company_id', companyId),
      // Deliveries table (may be optional in some deployments)
      supabase.from('deliveries').select('id, status, created_at, company_id').eq('company_id', companyId),
      supabase.from('payments').select('id, status, amount, payment_date').eq('company_id', companyId),
    ]);

    // Extract data from settled promises
    const budgetVariance = budgetVarianceRes.status === 'fulfilled' && budgetVarianceRes.value.data || [];
    const monthlyFinancial = monthlyFinancialRes.status === 'fulfilled' && monthlyFinancialRes.value.data || [];
    const vendorSummary = vendorSummaryRes.status === 'fulfilled' && vendorSummaryRes.value.data || [];
    const expenseCategory = expenseCategoryRes.status === 'fulfilled' && expenseCategoryRes.value.data || [];
  const projects = projectsRes.status === 'fulfilled' && projectsRes.value.data || [];
  const orders = ordersRes.status === 'fulfilled' && ordersRes.value.data || [];
  const deliveries = deliveriesRes.status === 'fulfilled' && deliveriesRes.value.data || [];
    const payments = paymentsRes.status === 'fulfilled' && paymentsRes.value.data || [];

    // Calculate KPI stats
    // Normalize helpers
    const toLower = (s: any) => (typeof s === 'string' ? s.toLowerCase() : s);

    // Derive delivery stats from purchase_orders.delivery_progress first; fall back to deliveries table
    const poPending = orders.filter((o: any) => toLower(o.delivery_progress) === 'pending_delivery' || (toLower(o.status) === 'approved' && (!o.delivered_qty || Number(o.delivered_qty) <= 0))).length;
    const poPartial = orders.filter((o: any) => toLower(o.delivery_progress) === 'partially_delivered').length;
    const poDelivered = orders.filter((o: any) => ['completed','delivered'].includes(toLower(o.delivery_progress))).length;

    const deliveriesStats = {
      total: deliveries.length || (poPending + poPartial + poDelivered),
      pending: (poPending) || deliveries.filter((d: any) => toLower(d.status) === 'pending').length,
      delivered: (poDelivered) || deliveries.filter((d: any) => toLower(d.status) === 'delivered').length,
      partial: (poPartial) || deliveries.filter((d: any) => toLower(d.status) === 'partial').length,
    };

    const stats = {
      projects: {
        total: projects.length,
        active: projects.filter((p: any) => toLower(p.status) === 'active').length,
        totalBudget: projects.reduce((sum: number, p: any) => sum + (Number(p.budget) || 0), 0),
        totalSpent: projects.reduce((sum: number, p: any) => sum + (Number(p.actual_cost) || 0), 0),
      },
      orders: {
        total: orders.length,
        pending: orders.filter((o: any) => toLower(o.status) === 'pending').length,
        approved: orders.filter((o: any) => toLower(o.status) === 'approved').length,
        thisMonth: orders.filter((o: any) => {
          const date = new Date(o.created_at);
          const now = new Date();
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length,
      },
      deliveries: deliveriesStats,
      payments: {
        total: payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
        paid: payments.filter((p: any) => toLower(p.status) === 'paid').reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
        unpaid: payments.filter((p: any) => toLower(p.status) === 'unpaid').reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
        thisMonth: payments.filter((p: any) => {
          if (!p.payment_date) return false;
          const date = new Date(p.payment_date);
          const now = new Date();
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
      },
    };

    // Calculate budget health distribution
    const budgetHealth = {
      overBudget: budgetVariance.filter((p: any) => p.budget_health?.includes('Over Budget')).length,
      critical: budgetVariance.filter((p: any) => p.budget_health?.includes('Critical')).length,
      warning: budgetVariance.filter((p: any) => p.budget_health?.includes('Warning')).length,
      healthy: budgetVariance.filter((p: any) => p.budget_health?.includes('Healthy')).length,
    };

    // Transform monthly data for charts (reverse to show oldest first)
    const monthlyTrends = monthlyFinancial
      .slice()
      .reverse()
      .map((month: any) => ({
        month: month.month_display,
        expenses: Number(month.approved_expenses) || 0,
        payments: Number(month.paid_amount) || 0,
        orders: Number(month.order_count) || 0,
        deliveries: Number(month.delivered_count) || 0,
      }));

    // Top 5 vendors
    const topVendors = vendorSummary.slice(0, 5).map((vendor: any) => ({
      name: vendor.vendor_name,
      totalPaid: Number(vendor.total_paid) || 0,
      paymentCount: Number(vendor.payment_count) || 0,
      avgPayment: Number(vendor.avg_payment) || 0,
    }));

    // Expense category breakdown for pie chart
    const expenseBreakdown = expenseCategory.map((cat: any) => ({
      category: cat.category,
      amount: Number(cat.approved_amount) || 0,
      count: Number(cat.approved_count) || 0,
    }));

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
