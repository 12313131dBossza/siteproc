import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';
import { getCurrentUserProfile } from '@/lib/server-utils';

// GET /api/activity - List activity logs with filters and pagination
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
      activities: activities || [],
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
    console.error('Error in GET /api/activity:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/activity - Create new activity log
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
    const validTypes = ['delivery', 'expense', 'order', 'project', 'payment', 'user', 'change_order', 'product', 'client', 'contractor', 'bid', 'other'];
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
    console.error('Error in POST /api/activity:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to log activity (can be imported by other API routes)
export async function logActivity(params: {
  type: string;
  action: string;
  title: string;
  description?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, any>;
  status?: string;
  amount?: number;
  user_id?: string;
  company_id?: string;
}) {
  try {
    const supabase = await sbServer();
    
    // Get user and company if not provided
    let userId = params.user_id;
    let companyId = params.company_id;
    let userName = null;
    let userEmail = null;
    
    if (!userId || !companyId) {
      const { user, profile, error: authError } = await getCurrentUserProfile();
      if (!authError && profile && user) {
        userId = userId || user.id;
        companyId = companyId || profile.company_id;
        userName = profile.full_name;
        userEmail = profile.email;
      }
    } else {
      // Get user details if we have user_id but not name/email
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();
      
      if (userProfile) {
        userName = userProfile.full_name;
        userEmail = userProfile.email;
      }
    }

    const { data, error: insertError } = await supabase
      .from('activity_logs')
      .insert({
        type: params.type,
        action: params.action,
        title: params.title,
        description: params.description || null,
        user_id: userId || null,
        user_name: userName,
        user_email: userEmail,
        company_id: companyId,
        entity_type: params.entity_type || null,
        entity_id: params.entity_id || null,
        metadata: params.metadata || {},
        status: params.status || 'success',
        amount: params.amount || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error logging activity:', insertError);
      return null;
    }

    // 🔔 NEW: Trigger email notifications based on activity type and action
    // Run asynchronously - don't block activity logging if email fails
    triggerActivityEmail(data, companyId).catch(error => {
      console.error('Failed to send activity email notification:', error);
    });

    return data;
  } catch (error) {
    console.error('Error in logActivity helper:', error);
    return null;
  }
}

// 🔔 NEW: Email notification trigger based on activity logs
async function triggerActivityEmail(activity: any, companyId: string) {
  try {
    // Dynamically import email functions to avoid circular dependencies
    const emailLib = await import('@/lib/email');
    const { getCompanyAdminEmails } = await import('@/lib/server-utils');
    
    if (!emailLib.isEmailEnabled()) {
      console.log('📧 Email notifications disabled - skipping');
      return;
    }

    const supabase = await sbServer();
    const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Determine who to notify and what email to send based on activity
    const emailType = `${activity.type}_${activity.action}`;
    
    console.log(`📧 Processing email for activity: ${emailType}`);

    switch (emailType) {
      // ORDER NOTIFICATIONS
      case 'order_approved':
      case 'order_rejected': {
        // Notify the person who created the order
        if (activity.metadata?.created_by || activity.metadata?.order_creator_id) {
          const creatorId = activity.metadata.created_by || activity.metadata.order_creator_id;
          const { data: creator } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', creatorId)
            .single();

          if (creator?.email) {
            const isApproval = activity.action === 'approved';
            const notificationFn = isApproval ? emailLib.sendOrderApprovalNotification : emailLib.sendOrderRejectionNotification;
            
            await notificationFn({
              orderId: activity.entity_id || 'N/A',
              projectName: activity.metadata?.project_name || 'Project',
              companyName: activity.metadata?.company_name || 'Company',
              requestedBy: creator.full_name || creator.email,
              requestedByEmail: creator.email,
              amount: activity.amount || 0,
              description: activity.description || activity.title,
              category: activity.metadata?.category || 'General',
              approverName: activity.user_name || 'Admin',
              dashboardUrl: `${dashboardUrl}/orders`,
              ...(isApproval ? { approvedBy: activity.user_name || 'Admin' } : { 
                rejectedBy: activity.user_name || 'Admin',
                reason: activity.metadata?.rejection_reason || activity.metadata?.notes || 'No reason provided'
              })
            });
            console.log(`✅ Order ${activity.action} email sent to ${creator.email}`);
          }
        }
        break;
      }

      // EXPENSE NOTIFICATIONS
      case 'expense_created':
      case 'expense_submitted': {
        // Notify admins when expense is submitted
        const adminEmails = await getCompanyAdminEmails(companyId);
        if (adminEmails.length > 0) {
          await emailLib.sendExpenseSubmissionNotification({
            expenseId: activity.entity_id || 'N/A',
            vendor: activity.metadata?.vendor || 'Vendor',
            category: activity.metadata?.category || 'General',
            amount: activity.amount || 0,
            description: activity.description || activity.title,
            submittedBy: activity.user_name || 'User',
            submittedByEmail: activity.user_email || 'user@example.com',
            companyName: activity.metadata?.company_name || 'Company',
            approverName: adminEmails[0],
            dashboardUrl: `${dashboardUrl}/expenses`,
          });
          console.log(`✅ Expense submission email sent to ${adminEmails.length} admins`);
        }
        break;
      }

      case 'expense_approved':
      case 'expense_rejected': {
        // Notify the person who submitted the expense
        if (activity.metadata?.submitted_by) {
          const { data: submitter } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', activity.metadata.submitted_by)
            .single();

          if (submitter?.email) {
            // Use generic approval/rejection email template
            const status = activity.action === 'approved' ? 'Approved' : 'Rejected';
            await emailLib.sendEmail({
              to: submitter.email,
              subject: `Expense ${status}`,
              html: `
                <h2>Expense ${status}</h2>
                <p>Hi ${submitter.full_name || 'there'},</p>
                <p>Your expense for <strong>${activity.metadata?.vendor || 'Unknown'}</strong> (${activity.amount ? `$${activity.amount}` : 'Amount N/A'}) has been <strong>${status.toLowerCase()}</strong>.</p>
                ${activity.metadata?.notes ? `<p><strong>Note:</strong> ${activity.metadata.notes}</p>` : ''}
                <p>${status} by: ${activity.user_name || 'Admin'}</p>
                <p><a href="${dashboardUrl}/expenses" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Expenses</a></p>
              `,
              text: `Expense ${status}\n\nYour expense for ${activity.metadata?.vendor || 'Unknown'} has been ${status.toLowerCase()}.\n\nView at: ${dashboardUrl}/expenses`
            });
            console.log(`✅ Expense ${activity.action} email sent to ${submitter.email}`);
          }
        }
        break;
      }

      // DELIVERY NOTIFICATIONS
      case 'delivery_updated':
      case 'delivery_completed': {
        // Notify order creator when delivery is completed
        if (activity.metadata?.order_id) {
          const { data: order } = await supabase
            .from('purchase_orders')
            .select('created_by')
            .eq('id', activity.metadata.order_id)
            .single();

          if (order?.created_by) {
            const { data: creator } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', order.created_by)
              .single();

            if (creator?.email) {
              await emailLib.sendDeliveryConfirmationNotification({
                deliveryId: activity.entity_id || 'N/A',
                projectName: activity.metadata?.project_name || 'Project',
                companyName: activity.metadata?.company_name || 'Company',
                orderId: activity.metadata.order_id,
                orderDescription: activity.description || 'Order',
                deliveredBy: activity.user_name || 'System',
                deliveredByEmail: activity.user_email || 'system@example.com',
                adminName: creator.full_name || creator.email,
                dashboardUrl: `${dashboardUrl}/deliveries`,
                photoUrls: activity.metadata?.photo_urls || []
              });
              console.log(`✅ Delivery completed email sent to ${creator.email}`);
            }
          }
        }
        break;
      }

      // PAYMENT NOTIFICATIONS
      case 'payment_created':
      case 'payment_status_changed':
      case 'payment_updated': {
        // Notify admins for payment requests
        const adminEmails = await getCompanyAdminEmails(companyId);
        if (adminEmails.length > 0 && activity.action === 'created') {
          await emailLib.sendEmail({
            to: adminEmails,
            subject: 'New Payment Request',
            html: `
              <h2>New Payment Request</h2>
              <p>A new payment has been recorded:</p>
              <ul>
                <li><strong>Vendor:</strong> ${activity.metadata?.vendor_name || 'Unknown'}</li>
                <li><strong>Amount:</strong> $${activity.amount || 0}</li>
                <li><strong>Status:</strong> ${activity.metadata?.status || 'Pending'}</li>
                <li><strong>Created by:</strong> ${activity.user_name || 'User'}</li>
              </ul>
              <p><a href="${dashboardUrl}/payments" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Payment</a></p>
            `,
            text: `New payment request from ${activity.user_name}: $${activity.amount || 0} to ${activity.metadata?.vendor_name || 'Unknown'}\n\nView at: ${dashboardUrl}/payments`
          });
          console.log(`✅ Payment ${activity.action} email sent to ${adminEmails.length} admins`);
        }
        
        // Notify creator when payment status changes
        if (activity.action !== 'created' && activity.metadata?.created_by) {
          const { data: creator } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', activity.metadata.created_by)
            .single();

          if (creator?.email) {
            await emailLib.sendEmail({
              to: creator.email,
              subject: 'Payment Status Updated',
              html: `
                <h2>Payment Status Updated</h2>
                <p>Hi ${creator.full_name || 'there'},</p>
                <p>Payment to <strong>${activity.metadata?.vendor_name || 'Unknown'}</strong> (${activity.amount ? `$${activity.amount}` : 'Amount N/A'}) status has been updated to <strong>${activity.metadata?.new_status || activity.metadata?.status || 'Updated'}</strong>.</p>
                <p>Updated by: ${activity.user_name || 'Admin'}</p>
                <p><a href="${dashboardUrl}/payments" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Payments</a></p>
              `,
              text: `Payment status updated for ${activity.metadata?.vendor_name || 'Unknown'}: ${activity.metadata?.new_status || 'Updated'}\n\nView at: ${dashboardUrl}/payments`
            });
            console.log(`✅ Payment status email sent to ${creator.email}`);
          }
        }
        break;
      }

      // CHANGE ORDER NOTIFICATIONS
      case 'change_order_approved':
      case 'change_order_rejected': {
        // Notify the person who created the change order
        if (activity.metadata?.created_by) {
          const { data: creator } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', activity.metadata.created_by)
            .single();

          if (creator?.email) {
            const status = activity.action === 'approved' ? 'Approved' : 'Rejected';
            await emailLib.sendEmail({
              to: creator.email,
              subject: `Change Order ${status}`,
              html: `
                <h2>Change Order ${status}</h2>
                <p>Hi ${creator.full_name || 'there'},</p>
                <p>Your change order request has been <strong>${status.toLowerCase()}</strong>.</p>
                <ul>
                  <li><strong>Cost Change:</strong> $${activity.metadata?.cost_delta || 0}</li>
                  <li><strong>Reason:</strong> ${activity.metadata?.reason || 'N/A'}</li>
                  <li><strong>${status} by:</strong> ${activity.user_name || 'Admin'}</li>
                </ul>
                ${activity.metadata?.notes ? `<p><strong>Note:</strong> ${activity.metadata.notes}</p>` : ''}
                <p><a href="${dashboardUrl}/change-orders" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Change Orders</a></p>
              `,
              text: `Change Order ${status}\n\nYour change order has been ${status.toLowerCase()}.\nCost change: $${activity.metadata?.cost_delta || 0}\n\nView at: ${dashboardUrl}/change-orders`
            });
            console.log(`✅ Change order ${activity.action} email sent to ${creator.email}`);
          }
        }
        break;
      }

      default:
        console.log(`📧 No email template for activity type: ${emailType}`);
    }
  } catch (error) {
    console.error('Error sending activity-triggered email:', error);
    throw error; // Re-throw to be caught by caller
  }
}
