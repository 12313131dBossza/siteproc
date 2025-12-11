/**
 * Delay Shield™ API - Apply Recovery Option
 * 
 * POST - Apply a selected recovery option
 *        ALL-IN-ONE automatic execution:
 *        1. Create change order
 *        2. Send in-app notifications to all team members
 *        3. Send emails to stakeholders (suppliers, clients, contractors, accountants)
 *        4. Update project budget with cost impact
 *        5. Mark alert as Applied
 *        6. Log activity
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

    // ============================================================
    // AUTOMATIC EXECUTION - NO EXTRA CLICKS
    // ============================================================

    const projectName = projectData.project?.name || 'Project';
    const projectId = alert.project_id;

    // 1. GATHER ALL STAKEHOLDERS
    // ============================================================
    
    // Get all company team members for in-app notifications
    const { data: teamMembers } = await db
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('company_id', session.companyId);

    // Get project members (clients, contractors, subcontractors)
    const { data: projectMembers } = await db
      .from('project_members')
      .select('user_id, email, external_type, profiles:user_id(id, email, full_name)')
      .eq('project_id', projectId);

    // Get suppliers from orders related to the risk factors
    const supplierEmails: string[] = [];
    const supplierNames: string[] = [];
    const riskSuppliers = alert.contributing_factors
      .filter((f: any) => f.type === 'supplier')
      .map((f: any) => f.name);

    if (riskSuppliers.length > 0) {
      // Look up supplier/contractor emails
      const { data: contractors } = await db
        .from('contractors')
        .select('id, email, company_name')
        .eq('company_id', session.companyId)
        .in('company_name', riskSuppliers);
      
      if (contractors) {
        contractors.forEach((c: any) => {
          if (c.email) {
            supplierEmails.push(c.email);
            supplierNames.push(c.company_name);
          }
        });
      }
    }

    // 2. CREATE IN-APP NOTIFICATIONS FOR ALL TEAM MEMBERS
    // ============================================================
    
    const notificationsCreated: string[] = [];
    const notificationTitle = `🛡️ Delay Shield™: Recovery Plan Applied`;
    const notificationMessage = `${selectedOption.name} has been applied to ${projectName}. ` +
      `Predicted to save ${selectedOption.time_saved_days} days. ` +
      (selectedOption.cost > 0 ? `Cost: $${selectedOption.cost.toLocaleString()}` : 'No additional cost.');

    // Notify all internal team members
    if (teamMembers && teamMembers.length > 0) {
      const notificationInserts = teamMembers.map((member: any) => ({
        user_id: member.id,
        company_id: session.companyId,
        type: 'project_update',
        title: notificationTitle,
        message: notificationMessage,
        link: `/delay-shield`,
        metadata: {
          alert_id: alert_id,
          project_id: projectId,
          option_name: selectedOption.name,
          cost: selectedOption.cost,
          time_saved: selectedOption.time_saved_days
        },
        read: false,
        created_at: new Date().toISOString()
      }));

      try {
        const { data: notifs, error: notifError } = await db
          .from('notifications')
          .insert(notificationInserts)
          .select('id');
        
        if (!notifError && notifs) {
          notificationsCreated.push(...notifs.map((n: any) => n.id));
          console.log(`[DelayShield Apply] Created ${notifs.length} in-app notifications`);
        } else {
          console.error('[DelayShield Apply] Notification creation failed:', notifError);
        }
      } catch (notifErr) {
        console.error('[DelayShield Apply] Notification exception:', notifErr);
      }
    }

    // 3. COMPILE ALL EMAIL RECIPIENTS
    // ============================================================
    
    // Generate base email draft
    const emailDraft = generateEmailDraft(projectData, {
      risk_level: alert.risk_level,
      predicted_delay_days: alert.predicted_delay_days,
      financial_impact: alert.financial_impact,
      contributing_factors: alert.contributing_factors
    }, selectedOption);

    // Build comprehensive recipient list
    const allRecipients = new Set<string>();
    
    // Current user (for verification)
    if (session.user?.email) {
      allRecipients.add(session.user.email);
    }

    // Suppliers from risk factors
    supplierEmails.forEach(email => allRecipients.add(email));

    // Project members (clients, subcontractors)
    if (projectMembers) {
      projectMembers.forEach((pm: any) => {
        if (pm.email) allRecipients.add(pm.email);
        if (pm.profiles?.email) allRecipients.add(pm.profiles.email);
      });
    }

    // Team members with certain roles (accountants, admins, PMs)
    if (teamMembers) {
      teamMembers.forEach((tm: any) => {
        if (tm.email && ['owner', 'admin', 'accountant', 'project_manager'].includes(tm.role)) {
          allRecipients.add(tm.email);
        }
      });
    }

    // Original email draft recipients
    emailDraft.to.forEach((email: string) => {
      if (email && email !== 'team@example.com') {
        allRecipients.add(email);
      }
    });

    // Convert to array and filter invalid
    emailDraft.to = Array.from(allRecipients).filter(email => 
      email && email.includes('@') && email !== 'team@example.com'
    );

    console.log('[DelayShield Apply] All email recipients:', emailDraft.to);

    // 4. UPDATE PROJECT BUDGET (if there's a cost impact)
    // ============================================================
    
    let budgetUpdated = false;
    if (selectedOption.cost > 0 && projectData.project) {
      try {
        const currentBudget = Number(projectData.project.budget) || 0;
        const newBudget = currentBudget + selectedOption.cost;
        
        const { error: budgetError } = await db
          .from('projects')
          .update({ 
            budget: newBudget,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId)
          .eq('company_id', session.companyId);
        
        if (!budgetError) {
          budgetUpdated = true;
          console.log(`[DelayShield Apply] Updated project budget: $${currentBudget} → $${newBudget}`);
        } else {
          console.error('[DelayShield Apply] Budget update failed:', budgetError);
        }
      } catch (budgetErr) {
        console.error('[DelayShield Apply] Budget exception:', budgetErr);
      }
    }

    // 5. UPDATE ALERT STATUS (Mark as Applied)
    // ============================================================
    
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

    // 6. SEND EMAILS TO ALL STAKEHOLDERS
    // ============================================================
    
    let emailSent = false;
    let emailError: string | null = null;
    let emailCount = 0;

    if (emailDraft.to.length > 0) {
      try {
        console.log('[DelayShield Apply] Sending emails to:', emailDraft.to);
        
        // Create professional HTML email
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); padding: 20px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🛡️ Delay Shield™ Alert</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Recovery Plan Applied</p>
            </div>
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
              <h2 style="color: #1e293b; margin: 0 0 16px 0;">${projectName}</h2>
              
              <div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 1px solid #e2e8f0;">
                <h3 style="color: #059669; margin: 0 0 8px 0;">✅ ${selectedOption.name}</h3>
                <p style="color: #64748b; margin: 0;">${selectedOption.description}</p>
              </div>
              
              <div style="display: flex; gap: 16px; margin-bottom: 16px;">
                <div style="flex: 1; background: white; border-radius: 8px; padding: 12px; text-align: center; border: 1px solid #e2e8f0;">
                  <div style="font-size: 24px; font-weight: bold; color: #059669;">${selectedOption.time_saved_days}</div>
                  <div style="color: #64748b; font-size: 12px;">Days Saved</div>
                </div>
                <div style="flex: 1; background: white; border-radius: 8px; padding: 12px; text-align: center; border: 1px solid #e2e8f0;">
                  <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">$${selectedOption.cost.toLocaleString()}</div>
                  <div style="color: #64748b; font-size: 12px;">Cost</div>
                </div>
              </div>
              
              <div style="background: #fef3c7; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                <strong style="color: #92400e;">Original Risk:</strong>
                <span style="color: #78350f;">${alert.predicted_delay_days}-day delay predicted, ${alert.risk_level} risk</span>
              </div>
              
              <h4 style="color: #1e293b; margin: 16px 0 8px 0;">Action Items:</h4>
              <ul style="color: #475569; margin: 0; padding-left: 20px;">
                ${selectedOption.action_items.map((item: string) => `<li style="margin-bottom: 4px;">${item}</li>`).join('')}
              </ul>
              
              ${changeOrderId ? `
                <div style="margin-top: 16px; padding: 12px; background: #eff6ff; border-radius: 8px;">
                  <strong style="color: #1e40af;">📋 Change Order Created:</strong>
                  <span style="color: #1e3a8a;">${changeOrderId}</span>
                </div>
              ` : ''}
            </div>
            <div style="background: #1e293b; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                Powered by SiteProc Delay Shield™ AI
              </p>
            </div>
          </div>
        `;

        const result = await sendEmail({
          to: emailDraft.to,
          subject: emailDraft.subject,
          text: emailDraft.body,
          html: htmlBody
        });

        console.log('[DelayShield Apply] Email result:', result);
        
        if (result && !result.skipped && result.ok !== false) {
          emailSent = true;
          emailCount = emailDraft.to.length;
          console.log(`[DelayShield Apply] Email sent successfully to ${emailCount} recipients`);
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
    } else {
      console.log('[DelayShield Apply] No recipients for email');
      emailError = 'No valid email recipients';
    }

    // 7. CREATE ACTIVITY LOG
    // ============================================================
    
    try {
      await db.from('activity_logs').insert({
        company_id: session.companyId,
        actor_id: session.user.id,
        entity_type: 'project',
        entity_id: projectId,
        action: 'delay_shield_applied',
        meta: {
          alert_id: alert_id,
          option_name: selectedOption.name,
          option_type: selectedOption.type,
          estimated_cost: selectedOption.cost,
          time_saved_days: selectedOption.time_saved_days,
          change_order_id: changeOrderId,
          email_sent: emailSent,
          email_count: emailCount,
          notifications_count: notificationsCreated.length,
          budget_updated: budgetUpdated,
          recipients: {
            suppliers: supplierNames,
            team_notified: notificationsCreated.length,
            emails_sent: emailDraft.to.length
          }
        }
      });
    } catch (logError) {
      console.error('[DelayShield Apply] Activity log failed:', logError);
    }

    // 8. RETURN SUCCESS WITH ALL DETAILS
    // ============================================================
    
    return NextResponse.json({
      success: true,
      data: {
        applied_option: selectedOption,
        change_order_id: changeOrderId,
        change_order_created: !!changeOrderId,
        notifications_sent: notificationsCreated.length,
        email_sent: emailSent,
        email_count: emailCount,
        email_error: emailError,
        email_recipients: emailDraft.to,
        budget_updated: budgetUpdated,
        budget_increase: budgetUpdated ? selectedOption.cost : 0,
        alert_marked_applied: true
      }
    });

  } catch (error: any) {
    console.error('[DelayShield Apply] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to apply fix' }, { status: 500 });
  }
}
