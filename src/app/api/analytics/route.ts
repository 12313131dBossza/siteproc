import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/server-utils'

export async function GET(request: NextRequest) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('range') || 'month'

    // Calculate date range based on selection
    const now = new Date()
    let start: Date
    let end: Date = now

    switch (dateRange) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'year':
        start = new Date(now.getFullYear(), 0, 1)
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    // Fetch all relevant data
    const [ordersResult, expensesResult, projectsResult, paymentsResult] = await Promise.all([
      // Orders (approved only for revenue calculation)
      supabase
        .from('purchase_orders')
        .select('id, amount, status, created_at, project_id')
        .eq('company_id', profile.company_id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString()),

      // Expenses
      supabase
        .from('expenses')
        .select('id, amount, category, vendor, status, spent_at, created_at, project_id')
        .eq('company_id', profile.company_id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString()),

      // Projects
      supabase
        .from('projects')
        .select('id, name, code, budget, status, created_at')
        .eq('company_id', profile.company_id),

      // Payments
      supabase
        .from('payments')
        .select('id, amount, status, payment_date, created_at')
        .eq('company_id', profile.company_id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
    ])

    const orders = ordersResult.data || []
    const expenses = expensesResult.data || []
    const projects = projectsResult.data || []
    const payments = paymentsResult.data || []

    // Calculate KPIs
    const totalOrders = orders.filter(o => o.status === 'approved').reduce((sum, o) => sum + (o.amount || 0), 0)
    const totalExpenses = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0)
    const totalPayments = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0)
    const profit = totalOrders - totalExpenses

    // Active projects
    const activeProjects = projects.filter(p => p.status === 'active').length
    const totalProjects = projects.length

    // Budget utilization
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0)
    const budgetUsed = totalExpenses
    const budgetUtilization = totalBudget > 0 ? (budgetUsed / totalBudget) * 100 : 0

    // Expense by category
    const expensesByCategory = expenses.reduce((acc: any, expense) => {
      const category = expense.category || 'Uncategorized'
      acc[category] = (acc[category] || 0) + (expense.amount || 0)
      return acc
    }, {})

    // Top vendors
    const vendorSpending = expenses.reduce((acc: any, expense) => {
      const vendor = expense.vendor || 'Unknown'
      acc[vendor] = (acc[vendor] || 0) + (expense.amount || 0)
      return acc
    }, {})

    const topVendors = Object.entries(vendorSpending)
      .map(([vendor, amount]) => ({ vendor, amount }))
      .sort((a: any, b: any) => b.amount - a.amount)
      .slice(0, 5)

    // Time series data (daily aggregation)
    const dailyData = generateDailyTimeSeries(orders, expenses, start, end)

    // Project performance
    const projectPerformance = await calculateProjectPerformance(supabase, profile.company_id, projects)

    return NextResponse.json({
      ok: true,
      data: {
        kpis: {
          totalRevenue: totalOrders,
          totalExpenses: totalExpenses,
          totalPayments: totalPayments,
          profit: profit,
          profitMargin: totalOrders > 0 ? (profit / totalOrders) * 100 : 0,
          activeProjects,
          totalProjects,
          budgetUtilization,
          totalBudget,
          budgetUsed
        },
        charts: {
          expensesByCategory: Object.entries(expensesByCategory).map(([name, value]) => ({
            name,
            value
          })),
          topVendors,
          dailyTrend: dailyData,
          projectPerformance
        },
        summary: {
          ordersCount: orders.length,
          expensesCount: expenses.length,
          paymentsCount: payments.length,
          avgOrderValue: orders.length > 0 ? totalOrders / orders.length : 0,
          avgExpenseValue: expenses.length > 0 ? totalExpenses / expenses.length : 0
        }
      }
    })

  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to generate daily time series
function generateDailyTimeSeries(orders: any[], expenses: any[], start: Date, end: Date) {
  const days: any[] = []
  const current = new Date(start)

  while (current <= end) {
    const dayStr = current.toISOString().split('T')[0]
    
    const dayOrders = orders
      .filter(o => o.created_at.startsWith(dayStr) && o.status === 'approved')
      .reduce((sum, o) => sum + (o.amount || 0), 0)
    
    const dayExpenses = expenses
      .filter(e => e.created_at.startsWith(dayStr))
      .reduce((sum, e) => sum + (e.amount || 0), 0)

    days.push({
      date: dayStr,
      revenue: dayOrders,
      expenses: dayExpenses,
      profit: dayOrders - dayExpenses
    })

    current.setDate(current.getDate() + 1)
  }

  return days
}

// Calculate project performance metrics
async function calculateProjectPerformance(supabase: any, companyId: string, projects: any[]) {
  const performance = []

  for (const project of projects.slice(0, 10)) { // Top 10 projects
    // Get project expenses
    const { data: projectExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('project_id', project.id)
      .eq('status', 'approved')

    const spent = projectExpenses?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0
    const budget = project.budget || 0
    const remaining = budget - spent
    const utilization = budget > 0 ? (spent / budget) * 100 : 0

    performance.push({
      id: project.id,
      name: project.name,
      code: project.code,
      budget,
      spent,
      remaining,
      utilization,
      status: project.status
    })
  }

  return performance.sort((a, b) => b.spent - a.spent)
}
