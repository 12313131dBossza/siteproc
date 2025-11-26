import { sbServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/projects/[id]/settings - Get project settings
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;

    const { data: settings, error } = await supabase
      .from('project_settings')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error) {
      // If no settings exist, return defaults
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          settings: {
            project_id: projectId,
            visibility: 'company',
            allow_external_sharing: true,
            require_approval_for_external: true,
            default_member_permissions: {
              view_project: true,
              view_orders: true,
              view_expenses: false,
              view_payments: false,
              view_documents: true,
              edit_project: false,
              create_orders: false,
              upload_documents: false,
              invite_others: false,
            }
          }
        });
      }
      console.error('Error fetching settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/projects/[id]/settings - Update project settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const body = await request.json();
    const { 
      visibility, 
      allow_external_sharing, 
      require_approval_for_external,
      default_member_permissions 
    } = body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (visibility !== undefined) updateData.visibility = visibility;
    if (allow_external_sharing !== undefined) updateData.allow_external_sharing = allow_external_sharing;
    if (require_approval_for_external !== undefined) updateData.require_approval_for_external = require_approval_for_external;
    if (default_member_permissions !== undefined) updateData.default_member_permissions = default_member_permissions;

    // Upsert - create if doesn't exist
    const { data: settings, error } = await supabase
      .from('project_settings')
      .upsert({
        project_id: projectId,
        ...updateData
      }, {
        onConflict: 'project_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
