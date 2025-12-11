/**
 * Delay Shield™ API - Apply Recovery Option
 * 
 * POST - Apply a selected recovery option
 *        Creates change order, drafts emails, updates alert status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionProfile } from '@/lib/auth';
import { supabaseService } from '@/lib/supabase';
import { generateEmailDraft, fetchProjectData, type RecoveryOption } from '@/lib/delay-shield';
import { sendEmail } from '@/lib/email';

// Type for delay shield alerts (table may not be in generated types)
interface DelayShieldAlert {
  id: string;
  company_id: string;
  project_id: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  predicted_delay_days: number;
  financial_impact: number;
  contributing_factors: any[];
  recovery_options: RecoveryOption[];
  email_draft: any;
  status: string;
  applied_option_id?: number;
  applied_at?: string;
  applied_by?: string;
  change_order_id?: string;
  created_at: string;
}

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
    const { alert_id, option_id, send_email } = body;

    if (!alert_id || !option_id) {
      return NextResponse.json({ error: 'Missing alert_id or option_id' }, { status: 400 });
    }

    const db = getDb();

    // Get the alert
    const { data: alertData, error: alertError } = await db
      .from('delay_shield_alerts')
      .select('*')
      .eq('id', alert_id)
      .eq('company_id', session.companyId)
      .single();

    if (alertError || !alertData) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const alert = alertData as unknown as DelayShieldAlert;

    if (alert.status !== 'active') {
      return NextResponse.json({ error: 'Alert is not active' }, { status: 400 });
    }

    // Get the selected recovery option
    const recoveryOptions = alert.recovery_options;
    const selectedOption = recoveryOptions.find(o => o.id === option_id);

    if (!selectedOption) {
      return NextResponse.json({ error: 'Invalid option_id' }, { status: 400 });
    }

    // Get project data for email generation
    const projectData = await fetchProjectData(alert.project_id, session.companyId);

    // Create change order if the option has cost
    let changeOrderId: string | null = null;
    if (selectedOption.cost > 0) {
      try {
        const { data: changeOrder, error: coError } = await db
          .from('change_orders')
          .insert({
            company_id: session.companyId,
            project_id: alert.project_id,
            description: `Delay Shield™ Mitigation: ${selectedOption.name}`,
            reason: `Applied recovery option to mitigate ${alert.predicted_delay_days}-day predicted delay. ${selectedOption.description}`,
            cost_delta: selectedOption.cost,
            proposed_qty: selectedOption.cost,
            status: 'pending',
            created_by: session.user.id
          })
          .select('id')
          .single();

        if (!coError && changeOrder) {
          changeOrderId = changeOrder.id;
        } else {
          console.error('[DelayShield Apply] Change order creation failed:', coError);
        }
      } catch (coErr) {
        console.error('[DelayShield Apply] Change order exception:', coErr);
      }
    }

    // Generate updated email draft
    const emailDraft = generateEmailDraft(projectData, {
      risk_level: alert.risk_level,
      predicted_delay_days: alert.predicted_delay_days,
      financial_impact: alert.financial_impact,
      contributing_factors: alert.contributing_factors
    }, selectedOption);

    // Add current user's email if available (so they can see the notification)
    const userEmail = session.user?.email;
    if (userEmail && !emailDraft.to.includes(userEmail)) {
      emailDraft.to = [userEmail, ...emailDraft.to.filter(e => e !== 'team@example.com')];
    }
    // Remove placeholder email
    emailDraft.to = emailDraft.to.filter(e => e !== 'team@example.com');

    console.log('[DelayShield Apply] Email recipients:', emailDraft.to);

    // Update alert status
    const { error: updateError } = await db
      .from('delay_shield_alerts')
      .update({
        status: 'applied',
        applied_option_id: option_id,
        applied_at: new Date().toISOString(),
        applied_by: session.user.id,
        change_order_id: changeOrderId,
        email_draft: emailDraft
      })
      .eq('id', alert_id);

    if (updateError) {
      console.error('[DelayShield Apply] Update failed:', updateError);
      return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
    }

    // Send email if requested
    let emailSent = false;
    let emailError: string | null = null;
    if (send_email && emailDraft.to.length > 0) {
      try {
        console.log('[DelayShield Apply] Attempting to send email to:', emailDraft.to);
        const result = await sendEmail({
          to: emailDraft.to,
          subject: emailDraft.subject,
          text: emailDraft.body,
          html: `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${emailDraft.body}</pre>`
        });
        console.log('[DelayShield Apply] Email result:', result);
        if (result && !result.skipped && result.ok !== false) {
          emailSent = true;
          console.log('[DelayShield Apply] Email sent successfully to:', emailDraft.to);
        } else if (result?.skipped) {
          console.log('[DelayShield Apply] Email skipped - provider not configured');
          emailError = 'Email provider not configured';
        } else {
          emailError = result?.error || 'Unknown error';
        }
      } catch (err: any) {
        console.error('[DelayShield Apply] Email send failed:', err);
        emailError = err?.message || 'Failed to send';
      }
    } else if (send_email) {
      console.log('[DelayShield Apply] No recipients for email');
      emailError = 'No valid email recipients';
    }

    // Create activity log
    try {
      await db.from('activity_logs').insert({
        company_id: session.companyId,
        actor_id: session.user.id,
        entity_type: 'project',
        entity_id: alert.project_id,
        action: 'delay_shield_applied',
        meta: {
          alert_id: alert_id,
          option_name: selectedOption.name,
          option_type: selectedOption.type,
          estimated_cost: selectedOption.cost,
          time_saved_days: selectedOption.time_saved_days,
          change_order_id: changeOrderId,
          email_sent: emailSent
        }
      });
    } catch (logError) {
      console.error('[DelayShield Apply] Activity log failed:', logError);
    }

    return NextResponse.json({
      success: true,
      data: {
        applied_option: selectedOption,
        change_order_id: changeOrderId,
        email_sent: emailSent,
        email_error: emailError,
        email_recipients: emailDraft.to,
        email_draft: emailDraft
      }
    });

  } catch (error: any) {
    console.error('[DelayShield Apply] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to apply fix' }, { status: 500 });
  }
}
