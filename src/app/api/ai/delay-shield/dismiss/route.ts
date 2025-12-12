/**
 * Delay Shield™ API - Dismiss Alert
 * 
 * POST - Dismiss an alert (mark as not actionable)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionProfile } from '@/lib/auth';
import { supabaseService } from '@/lib/supabase';

// Helper to get untyped supabase client for custom tables
function getDb() {
  return supabaseService() as any;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionProfile();
    if (!session.user || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { alert_id, reason } = body;

    if (!alert_id) {
      return NextResponse.json({ error: 'Missing alert_id' }, { status: 400 });
    }

    const db = getDb();

    // Update alert status to dismissed
    const { data: alert, error } = await db
      .from('delay_shield_alerts')
      .update({
        status: 'dismissed',
        updated_at: new Date().toISOString()
      })
      .eq('id', alert_id)
      .eq('company_id', session.companyId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the dismissal
    try {
      await db.from('activity_logs').insert({
        company_id: session.companyId,
        user_id: session.user.id,
        type: 'delay_shield',
        action: 'delay_shield_dismissed',
        title: 'Delay Shield: Alert Dismissed',
        description: reason || 'User dismissed the alert',
        entity_type: 'project',
        entity_id: alert?.project_id || null,
        status: 'success',
        metadata: {
          alert_id,
          reason: reason || 'User dismissed'
        }
      });
    } catch (logError) {
      console.error('[DelayShield Dismiss] Activity log failed:', logError);
    }

    return NextResponse.json({ success: true, data: alert });

  } catch (error: any) {
    console.error('[DelayShield Dismiss] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to dismiss' }, { status: 500 });
  }
}
