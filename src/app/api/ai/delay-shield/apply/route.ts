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

    const supabase = supabaseService();

    // Get the alert
    const { data: alert, error: alertError } = await supabase
      .from('delay_shield_alerts' as any)
      .select('*')
      .eq('id', alert_id)
      .eq('company_id', session.companyId)
      .single();

    if (alertError || !alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    if (alert.status !== 'active') {
      return NextResponse.json({ error: 'Alert is not active' }, { status: 400 });
    }

    // Get the selected recovery option
    const recoveryOptions = alert.recovery_options as RecoveryOption[];
    const selectedOption = recoveryOptions.find(o => o.id === option_id);

    if (!selectedOption) {
      return NextResponse.json({ error: 'Invalid option_id' }, { status: 400 });
    }

    // Get project data for email generation
    const projectData = await fetchProjectData(alert.project_id, session.companyId);

    // Create change order if the option has cost
    let changeOrderId = null;
    if (selectedOption.cost > 0) {
      const { data: changeOrder, error: coError } = await supabase
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

      if (coError) {
        console.error('[DelayShield Apply] Change order creation failed:', coError);
        // Try without project_id if it fails
        const { data: coRetry, error: coRetryError } = await supabase
          .from('change_orders')
          .insert({
            company_id: session.companyId,
            description: `Delay Shield™ Mitigation: ${selectedOption.name}`,
            reason: `Applied recovery option to mitigate ${alert.predicted_delay_days}-day predicted delay. ${selectedOption.description}`,
            cost_delta: selectedOption.cost,
            proposed_qty: selectedOption.cost,
            status: 'pending',
            created_by: session.user.id
          })
          .select('id')
          .single();

        if (!coRetryError && coRetry) {
          changeOrderId = coRetry.id;
        }
      } else if (changeOrder) {
        changeOrderId = changeOrder.id;
      }
    }

    // Generate updated email draft
    const emailDraft = generateEmailDraft(projectData, {
      risk_level: alert.risk_level,
      predicted_delay_days: alert.predicted_delay_days,
      financial_impact: alert.financial_impact,
      contributing_factors: alert.contributing_factors
    }, selectedOption);

    // Update alert status
    const { error: updateError } = await supabase
      .from('delay_shield_alerts' as any)
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
    if (send_email && emailDraft.to.length > 0) {
      try {
        await sendEmail({
          to: emailDraft.to,
          subject: emailDraft.subject,
          text: emailDraft.body,
          html: `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${emailDraft.body}</pre>`
        });
        emailSent = true;
        console.log('[DelayShield Apply] Email sent to:', emailDraft.to);
      } catch (emailError) {
        console.error('[DelayShield Apply] Email send failed:', emailError);
      }
    }

    // Create activity log
    try {
      await supabase.from('activity_logs').insert({
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
        email_draft: emailDraft
      }
    });

  } catch (error: any) {
    console.error('[DelayShield Apply] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to apply fix' }, { status: 500 });
  }
}
