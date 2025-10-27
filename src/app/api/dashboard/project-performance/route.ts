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

    // Fetch all projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, total_estimated')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    // For each project, get actual expenses
    const projectPerformance = await Promise.all(
      (projects || []).map(async (project) => {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('project_id', project.id);

        const actualExpenses = (expenses || []).reduce(
          (sum, e) => sum + (Number(e.amount) || 0),
          0
        );

        const budget = Number(project.total_estimated) || 0;
        const variance = budget - actualExpenses;

        return {
          name: project.name.length > 20 ? project.name.substring(0, 20) + '...' : project.name,
          budget,
          actual: actualExpenses,
          variance,
        };
      })
    );

    return NextResponse.json(projectPerformance);
  } catch (error) {
    console.error('Project performance error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project performance' },
      { status: 500 }
    );
  }
}
