import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';
import { getCurrentUserProfile } from '@/lib/server-utils';

// GET /api/reports/projects - Project Financial Report (Budget vs Actual vs Variance)
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

    // Get all projects for the company with their budget
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, budget, status, created_at')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return NextResponse.json(
        { error: 'Failed to fetch projects', details: projectsError.message },
        { status: 500 }
      );
    }

    // Get actual expenses for each project
    const projectIds = projects?.map(p => p.id) || [];
    
    let expensesData: any[] = [];
    if (projectIds.length > 0) {
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('project_id, amount, status')
        .eq('company_id', profile.company_id)
        .in('project_id', projectIds)
        .in('status', ['approved', 'paid']); // Only count approved/paid expenses

      if (!expensesError) {
        expensesData = expenses || [];
      }
    }

    // Calculate actuals and variance for each project
    const report = projects?.map(project => {
      const projectExpenses = expensesData.filter(e => e.project_id === project.id);
      const actualExpenses = projectExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      const budget = parseFloat(project.budget) || 0;
      const variance = budget - actualExpenses;
      const variancePercentage = budget > 0 ? (variance / budget) * 100 : 0;

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        budget: budget,
        actual: actualExpenses,
        variance: variance,
        variance_percentage: variancePercentage,
        expense_count: projectExpenses.length,
        budget_status: variance >= 0 ? 'on-budget' : 'over-budget',
        created_at: project.created_at
      };
    }) || [];

    // Calculate summary stats
    const totalBudget = report.reduce((sum, p) => sum + p.budget, 0);
    const totalActual = report.reduce((sum, p) => sum + p.actual, 0);
    const totalVariance = totalBudget - totalActual;
    const onBudgetCount = report.filter(p => p.budget_status === 'on-budget').length;
    const overBudgetCount = report.filter(p => p.budget_status === 'over-budget').length;

    return NextResponse.json({
      ok: true,
      data: report,
      summary: {
        total_projects: report.length,
        total_budget: totalBudget,
        total_actual: totalActual,
        total_variance: totalVariance,
        on_budget_count: onBudgetCount,
        over_budget_count: overBudgetCount,
        average_variance_percentage: report.length > 0 
          ? report.reduce((sum, p) => sum + p.variance_percentage, 0) / report.length 
          : 0
      }
    });
  } catch (error: any) {
    console.error('Error in GET /api/reports/projects:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
