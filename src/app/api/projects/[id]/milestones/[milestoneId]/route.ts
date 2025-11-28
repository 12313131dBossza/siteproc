import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{ id: string; milestoneId: string }>;
}

// PATCH /api/projects/[id]/milestones/[milestoneId] - Update a milestone
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId, milestoneId } = await context.params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const adminClient = createAdminClient();

    // Verify milestone exists and user has access
    const { data: milestone, error: findError } = await adminClient
      .from('project_milestones')
      .select('*, projects(company_id)')
      .eq('id', milestoneId)
      .eq('project_id', projectId)
      .single();

    if (findError || !milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    // Verify user belongs to the company
    const { data: profile } = await adminClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profile?.company_id !== (milestone.projects as any)?.company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.target_date !== undefined) updateData.target_date = body.target_date;
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;
    if (body.linked_delivery_id !== undefined) updateData.linked_delivery_id = body.linked_delivery_id;
    if (body.linked_order_id !== undefined) updateData.linked_order_id = body.linked_order_id;
    if (body.linked_payment_id !== undefined) updateData.linked_payment_id = body.linked_payment_id;
    if (body.auto_complete_on !== undefined) updateData.auto_complete_on = body.auto_complete_on;

    // Handle completion toggle
    if (body.completed !== undefined) {
      updateData.completed = body.completed;
      if (body.completed) {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = user.id;
      } else {
        updateData.completed_at = null;
        updateData.completed_by = null;
      }
    }

    // Update milestone
    const { data: updated, error: updateError } = await adminClient
      .from('project_milestones')
      .update(updateData)
      .eq('id', milestoneId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating milestone:', updateError);
      return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 });
    }

    // If marking as complete, create a notification
    if (body.completed === true) {
      try {
        // Get project info
        const { data: project } = await adminClient
          .from('projects')
          .select('name, company_id')
          .eq('id', projectId)
          .single();

        // Get company members to notify
        const { data: members } = await adminClient
          .from('profiles')
          .select('id')
          .eq('company_id', project?.company_id)
          .neq('id', user.id);

        if (members && members.length > 0) {
          const notifications = members.map(m => ({
            user_id: m.id,
            company_id: project?.company_id,
            type: 'project_update',
            title: `Milestone Completed: ${body.name || milestone.name}`,
            message: `A milestone has been completed in project "${project?.name}"`,
            link: `/projects/${projectId}`,
            metadata: { milestone_id: milestoneId, project_id: projectId },
            read: false,
          }));

          await adminClient.from('notifications').insert(notifications);
        }
      } catch (notifError) {
        console.error('Error sending milestone notification:', notifError);
      }
    }

    return NextResponse.json({ milestone: updated });
  } catch (error) {
    console.error('Update milestone error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/milestones/[milestoneId] - Delete a milestone
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId, milestoneId } = await context.params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Verify milestone exists and user has access
    const { data: milestone, error: findError } = await adminClient
      .from('project_milestones')
      .select('*, projects(company_id)')
      .eq('id', milestoneId)
      .eq('project_id', projectId)
      .single();

    if (findError || !milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    // Verify user belongs to the company
    const { data: profile } = await adminClient
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profile?.company_id !== (milestone.projects as any)?.company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Don't allow deleting "Project Started" milestone
    if (milestone.name === 'Project Started' && milestone.sort_order === 0) {
      return NextResponse.json({ error: 'Cannot delete the Project Started milestone' }, { status: 400 });
    }

    // Delete milestone
    const { error: deleteError } = await adminClient
      .from('project_milestones')
      .delete()
      .eq('id', milestoneId);

    if (deleteError) {
      console.error('Error deleting milestone:', deleteError);
      return NextResponse.json({ error: 'Failed to delete milestone' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete milestone error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
