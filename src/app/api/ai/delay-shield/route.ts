/**
 * Delay Shield™ API - Main Route
 * 
 * GET  - Get all active alerts for company
 * POST - Run analysis for specific project or all projects
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionProfile } from '@/lib/auth';
import { supabaseService } from '@/lib/supabase';
import { analyzeProjectForDelays, analyzeAllProjects, type DelayPrediction } from '@/lib/delay-shield';

// Check if user has Enterprise plan
async function checkEnterprisePlan(companyId: string): Promise<boolean> {
  const supabase = supabaseService();
  
  const { data: company } = await supabase
    .from('companies')
    .select('plan')
    .eq('id', companyId)
    .single();

  return (company as any)?.plan === 'enterprise';
}

// GET - Fetch all active Delay Shield alerts
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionProfile();
    if (!session.user || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check Enterprise plan
    const isEnterprise = await checkEnterprisePlan(session.companyId);
    if (!isEnterprise) {
      return NextResponse.json({ 
        error: 'Delay Shield™ is an Enterprise feature',
        upgrade_required: true 
      }, { status: 403 });
    }

    const supabase = supabaseService();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status') || 'active';

    // Build query
    let query = supabase
      .from('delay_shield_alerts' as any)
      .select(`
        *,
        project:projects(id, name, code, budget)
      `)
      .eq('company_id', session.companyId)
      .order('risk_score', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: alerts, error } = await query;

    if (error) {
      console.error('[DelayShield API] Error fetching alerts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also get summary stats
    const { data: summary } = await supabase
      .from('delay_shield_summary' as any)
      .select('*')
      .eq('company_id', session.companyId)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        alerts: alerts || [],
        summary: summary || {
          active_alerts: 0,
          critical_count: 0,
          high_count: 0,
          medium_count: 0,
          low_count: 0,
          total_financial_risk: 0
        }
      }
    });

  } catch (error: any) {
    console.error('[DelayShield API] GET Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

// POST - Run Delay Shield analysis
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionProfile();
    if (!session.user || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check Enterprise plan
    const isEnterprise = await checkEnterprisePlan(session.companyId);
    if (!isEnterprise) {
      return NextResponse.json({ 
        error: 'Delay Shield™ is an Enterprise feature',
        upgrade_required: true 
      }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { project_id, scan_all } = body;

    const supabase = supabaseService();
    let predictions: DelayPrediction[] = [];

    if (scan_all) {
      // Analyze all active projects
      console.log(`[DelayShield API] Running full scan for company ${session.companyId}`);
      predictions = await analyzeAllProjects(session.companyId);
    } else if (project_id) {
      // Analyze single project
      console.log(`[DelayShield API] Running scan for project ${project_id}`);
      const prediction = await analyzeProjectForDelays(project_id, session.companyId);
      predictions = [prediction];
    } else {
      return NextResponse.json({ error: 'Missing project_id or scan_all parameter' }, { status: 400 });
    }

    // Store predictions in database
    const alertsToInsert = predictions.map(p => ({
      company_id: session.companyId,
      project_id: p.project_id,
      risk_score: p.risk_score,
      risk_level: p.risk_level,
      predicted_delay_days: p.predicted_delay_days,
      financial_impact: p.financial_impact,
      contributing_factors: p.contributing_factors,
      recovery_options: p.recovery_options,
      email_draft: p.email_draft,
      status: p.risk_score >= 0.1 ? 'active' : 'resolved', // Show alerts for 10%+ risk (was 25%)
      scan_source: scan_all ? 'scheduled' : 'manual'
    }));

    console.log('[DelayShield API] Predictions to save:', alertsToInsert.map(a => ({
      project: a.project_id,
      score: a.risk_score,
      level: a.risk_level,
      status: a.status,
      factors: a.contributing_factors?.length || 0
    })));

    // Upsert alerts (update if exists for same project, insert if new)
    for (const alert of alertsToInsert) {
      // Check for existing active alert
      const { data: existing } = await supabase
        .from('delay_shield_alerts' as any)
        .select('id')
        .eq('project_id', alert.project_id)
        .eq('company_id', alert.company_id as any)
        .eq('status', 'active')
        .single();

      if (existing) {
        // Update existing alert
        await (supabase
          .from('delay_shield_alerts' as any) as any)
          .update({
            risk_score: alert.risk_score,
            risk_level: alert.risk_level,
            predicted_delay_days: alert.predicted_delay_days,
            financial_impact: alert.financial_impact,
            contributing_factors: alert.contributing_factors,
            recovery_options: alert.recovery_options,
            email_draft: alert.email_draft,
            status: alert.status,
            scan_source: alert.scan_source,
            updated_at: new Date().toISOString()
          } as any)
          .eq('id', (existing as any).id);
      } else if (alert.status === 'active') {
        // Insert new alert only if it should be active
        await supabase
          .from('delay_shield_alerts' as any)
          .insert(alert as any);
      }
    }

    // Get updated alerts
    const { data: alerts } = await supabase
      .from('delay_shield_alerts')
      .select(`
        *,
        project:projects(id, name, code, budget)
      `)
      .eq('company_id', session.companyId)
      .eq('status', 'active')
      .order('risk_score', { ascending: false });

    return NextResponse.json({
      success: true,
      data: {
        predictions,
        alerts: alerts || [],
        scanned_projects: predictions.length
      }
    });

  } catch (error: any) {
    console.error('[DelayShield API] POST Error:', error);
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
  }
}
