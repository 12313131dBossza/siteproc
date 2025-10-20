/**
 * Activity Logs API Endpoint (Alternative Route)
 * 
 * This is an alias to /api/activity for consistency
 * Handles GET for listing activity logs and POST for creating new ones
 */

import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';
import { getCurrentUserProfile } from '@/lib/server-utils';

// GET /api/activity-logs - List activity logs with filters and pagination
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');
    const action = searchParams.get('action');
    const status = searchParams.get('status');
    const userId = searchParams.get('user_id');
    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const search = searchParams.get('search');

    // Build query
    let query = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (type) query = query.eq('type', type);
    if (action) query = query.eq('action', action);
    if (status) query = query.eq('status', status);
    if (userId) query = query.eq('user_id', userId);
    if (entityType) query = query.eq('entity_type', entityType);
    if (entityId) query = query.eq('entity_id', entityId);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,user_name.ilike.%${search}%`);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: activities, error: queryError, count } = await query;

    if (queryError) {
      console.error('Error fetching activities:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch activities', details: queryError.message },
        { status: 500 }
      );
    }

    // Calculate stats
    const statsQuery = supabase
      .from('activity_logs')
      .select('type, action, status, created_at', { count: 'exact' })
      .eq('company_id', profile.company_id);

    const { data: allActivities } = await statsQuery;

    // Calculate statistics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: count || 0,
      total_today: allActivities?.filter(a => new Date(a.created_at) >= today).length || 0,
      total_week: allActivities?.filter(a => new Date(a.created_at) >= weekAgo).length || 0,
      unique_users: new Set(activities?.map(a => a.user_id).filter(Boolean)).size,
      by_type: {} as Record<string, number>,
      by_status: {} as Record<string, number>,
    };

    // Count by type
    allActivities?.forEach(a => {
      stats.by_type[a.type] = (stats.by_type[a.type] || 0) + 1;
      if (a.status) {
        stats.by_status[a.status] = (stats.by_status[a.status] || 0) + 1;
      }
    });

    // Find most active type
    const mostActiveType = Object.entries(stats.by_type)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || '';

    return NextResponse.json({
      ok: true,
      data: activities || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
      stats: {
        ...stats,
        most_active_type: mostActiveType,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/activity-logs:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/activity-logs - Create new activity log
export async function POST(request: NextRequest) {
  try {
    const { user, profile, error: authError } = await getCurrentUserProfile();

    if (authError || !profile || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await sbServer();
    const body = await request.json();
    const {
      type,
      action,
      title,
      description,
      entity_type,
      entity_id,
      metadata,
      status,
      amount,
    } = body;

    // Validate required fields
    if (!type || !action || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: type, action, title' },
        { status: 400 }
      );
    }

    // Validate enum values
    const validTypes = ['delivery', 'expense', 'order', 'project', 'payment', 'user', 'change_order', 'product', 'other'];
    const validActions = ['created', 'updated', 'deleted', 'approved', 'rejected', 'submitted', 'completed', 'cancelled', 'status_changed', 'invited', 'processed', 'failed'];
    
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }
    
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Insert activity log
    const { data: activity, error: insertError } = await supabase
      .from('activity_logs')
      .insert({
        type,
        action,
        title,
        description: description || null,
        user_id: user.id,
        user_name: profile.full_name,
        user_email: profile.email,
        company_id: profile.company_id,
        entity_type: entity_type || null,
        entity_id: entity_id || null,
        metadata: metadata || {},
        status: status || 'success',
        amount: amount || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating activity:', insertError);
      return NextResponse.json(
        { error: 'Failed to create activity', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: activity,
    });
  } catch (error: any) {
    console.error('Error in POST /api/activity-logs:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
