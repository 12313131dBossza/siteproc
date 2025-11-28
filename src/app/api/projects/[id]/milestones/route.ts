import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/milestones - Get all milestones for a project
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Get milestones for the project
    const { data: milestones, error } = await adminClient
      .from('project_milestones')
      .select(`
        *,
        completed_by_profile:profiles!project_milestones_completed_by_fkey(full_name, username),
        created_by_profile:profiles!project_milestones_created_by_fkey(full_name, username),
        linked_delivery:deliveries(id, status),
        linked_order:orders(id, status),
        linked_payment:payments(id, status)
      `)
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('target_date', { ascending: true });

    if (error) {
      console.error('Error fetching milestones:', error);
      return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 });
    }

    // Calculate progress
    const total = milestones?.length || 0;
    const completed = milestones?.filter(m => m.completed).length || 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Check for overdue milestones
    const today = new Date().toISOString().split('T')[0];
    const overdue = milestones?.filter(m => !m.completed && m.target_date < today) || [];

    return NextResponse.json({
      milestones: milestones || [],
      progress,
      total,
      completed,
      overdue: overdue.length,
    });
  } catch (error) {
    console.error('Milestones API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects/[id]/milestones - Create a new milestone
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      target_date, 
      linked_delivery_id,
      linked_order_id,
      linked_payment_id,
      auto_complete_on,
      sort_order 
    } = body;

    if (!name || !target_date) {
      return NextResponse.json({ error: 'Name and target date are required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Get project to verify access and get company_id
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('id, company_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify user belongs to the company
    const { data: profile } = await adminClient
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profile?.company_id !== project.company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get max sort_order for this project
    const { data: maxOrder } = await adminClient
      .from('project_milestones')
      .select('sort_order')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const newSortOrder = sort_order ?? ((maxOrder?.sort_order || 0) + 1);

    // Create milestone
    const { data: milestone, error: createError } = await adminClient
      .from('project_milestones')
      .insert({
        project_id: projectId,
        company_id: project.company_id,
        name,
        description,
        target_date,
        linked_delivery_id,
        linked_order_id,
        linked_payment_id,
        auto_complete_on,
        sort_order: newSortOrder,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating milestone:', createError);
      return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 });
    }

    return NextResponse.json({ milestone });
  } catch (error) {
    console.error('Create milestone error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
