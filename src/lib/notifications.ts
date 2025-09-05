import { sendEmail } from './email';
import { sbServer } from './supabase-server';

// Email notification functions for expenses and orders

export async function sendExpenseNotifications(
  expenseId: string,
  action: 'created' | 'approved' | 'rejected',
  actionBy?: string
) {
  try {
    const supabase = await sbServer();
    
    // Get expense details with user info
    const { data: expense, error } = await supabase
      .from('expenses')
      .select(`
        *,
        creator:user_id(email),
        approver:approved_by(email),
        profiles!user_id(role, full_name)
      `)
      .eq('id', expenseId)
      .single();

    if (error || !expense) {
      console.error('Failed to fetch expense for notification:', error);
      return;
    }

    const notifications = [];

    if (action === 'created') {
      // Notify all admins when expense is created
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['admin', 'owner', 'bookkeeper']);

      if (adminProfiles) {
        for (const adminProfile of adminProfiles) {
          const { data: adminUser } = await supabase.auth.admin.getUserById(adminProfile.id);
          if (adminUser?.user?.email) {
            notifications.push({
              to: adminUser.user.email,
              subject: `New Expense Submitted - $${expense.amount}`,
              html: createExpenseEmailHtml({
                action: 'created',
                expense,
                recipientName: adminProfile.full_name || 'Admin',
                actionBy: expense.profiles?.full_name || 'Unknown User'
              })
            });
          }
        }
      }
    } else if (action === 'approved' || action === 'rejected') {
      // Notify expense creator about status change
      if (expense.creator?.email) {
        notifications.push({
          to: expense.creator.email,
          subject: `Expense ${action.charAt(0).toUpperCase() + action.slice(1)} - $${expense.amount}`,
          html: createExpenseEmailHtml({
            action,
            expense,
            recipientName: expense.profiles?.full_name || 'User',
            actionBy: actionBy || 'Admin'
          })
        });
      }
    }

    // Send all notifications
    if (notifications.length > 0) {
      await sendEmail(notifications);
      console.log(`Sent ${notifications.length} expense notifications for ${action}`);
    }

  } catch (error) {
    console.error('Error sending expense notifications:', error);
  }
}

export async function sendOrderNotifications(
  orderId: string,
  action: 'created' | 'approved' | 'rejected',
  actionBy?: string
) {
  try {
    const supabase = await sbServer();
    
    // Get order details with user info
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        creator:created_by(email),
        order_items(quantity, unit_price, products(name)),
        profiles!created_by(role, full_name)
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      console.error('Failed to fetch order for notification:', error);
      return;
    }

    const notifications = [];

    if (action === 'created') {
      // Notify all admins when order is created
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['admin', 'owner', 'bookkeeper']);

      if (adminProfiles) {
        for (const adminProfile of adminProfiles) {
          const { data: adminUser } = await supabase.auth.admin.getUserById(adminProfile.id);
          if (adminUser?.user?.email) {
            notifications.push({
              to: adminUser.user.email,
              subject: `New Order Request - $${order.total_amount}`,
              html: createOrderEmailHtml({
                action: 'created',
                order,
                recipientName: adminProfile.full_name || 'Admin',
                actionBy: order.profiles?.full_name || 'Unknown User'
              })
            });
          }
        }
      }
    } else if (action === 'approved' || action === 'rejected') {
      // Notify order creator about status change
      if (order.creator?.email) {
        notifications.push({
          to: order.creator.email,
          subject: `Order ${action.charAt(0).toUpperCase() + action.slice(1)} - $${order.total_amount}`,
          html: createOrderEmailHtml({
            action,
            order,
            recipientName: order.profiles?.full_name || 'User',
            actionBy: actionBy || 'Admin'
          })
        });
      }
    }

    // Send all notifications
    if (notifications.length > 0) {
      await sendEmail(notifications);
      console.log(`Sent ${notifications.length} order notifications for ${action}`);
    }

  } catch (error) {
    console.error('Error sending order notifications:', error);
  }
}

// Helper function to create expense email HTML
function createExpenseEmailHtml({
  action,
  expense,
  recipientName,
  actionBy
}: {
  action: 'created' | 'approved' | 'rejected';
  expense: any;
  recipientName: string;
  actionBy: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-app.vercel.app';
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
        <h1 style="color: #1e293b; margin: 0 0 16px 0;">
          Expense ${action === 'created' ? 'Submitted' : action.charAt(0).toUpperCase() + action.slice(1)}
        </h1>
        <p style="color: #64748b; margin: 0;">Hi ${recipientName},</p>
      </div>

      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
        <h2 style="color: #1e293b; margin: 0 0 16px 0;">Expense Details</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 120px;">Expense ID:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${expense.id}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Vendor:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${expense.vendor}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Category:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 500; text-transform: capitalize;">${expense.category}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Amount:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 18px;">$${expense.amount}</td>
          </tr>
          ${expense.notes ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; vertical-align: top;">Notes:</td>
            <td style="padding: 8px 0; color: #1e293b;">${expense.notes}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Status:</td>
            <td style="padding: 8px 0;">
              <span style="
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 500;
                text-transform: uppercase;
                ${expense.status === 'approved' ? 'background: #dcfce7; color: #166534;' :
                  expense.status === 'rejected' ? 'background: #fef2f2; color: #dc2626;' :
                  'background: #fef3c7; color: #d97706;'}
              ">
                ${expense.status}
              </span>
            </td>
          </tr>
          ${action !== 'created' ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Action by:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${actionBy}</td>
          </tr>
          ` : `
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Submitted by:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${actionBy}</td>
          </tr>
          `}
        </table>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${baseUrl}/expenses" style="
          display: inline-block;
          background: #3b82f6;
          color: white;
          padding: 12px 24px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 500;
        ">View Expenses</a>
      </div>

      <div style="color: #64748b; font-size: 12px; text-align: center; margin-top: 32px;">
        This is an automated message from SiteProc. Please do not reply to this email.
      </div>
    </div>
  `;
}

// Helper function to create order email HTML  
function createOrderEmailHtml({
  action,
  order,
  recipientName,
  actionBy
}: {
  action: 'created' | 'approved' | 'rejected';
  order: any;
  recipientName: string;
  actionBy: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-app.vercel.app';
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
        <h1 style="color: #1e293b; margin: 0 0 16px 0;">
          Order ${action === 'created' ? 'Created' : action.charAt(0).toUpperCase() + action.slice(1)}
        </h1>
        <p style="color: #64748b; margin: 0;">Hi ${recipientName},</p>
      </div>

      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
        <h2 style="color: #1e293b; margin: 0 0 16px 0;">Order Details</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 120px;">Order ID:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${order.id}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Supplier:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${order.supplier_name || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Total Amount:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 18px;">$${order.total_amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Status:</td>
            <td style="padding: 8px 0;">
              <span style="
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 500;
                text-transform: uppercase;
                ${order.status === 'approved' ? 'background: #dcfce7; color: #166534;' :
                  order.status === 'rejected' ? 'background: #fef2f2; color: #dc2626;' :
                  'background: #fef3c7; color: #d97706;'}
              ">
                ${order.status}
              </span>
            </td>
          </tr>
          ${order.delivery_address ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; vertical-align: top;">Delivery:</td>
            <td style="padding: 8px 0; color: #1e293b;">${order.delivery_address}</td>
          </tr>
          ` : ''}
          ${order.notes ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; vertical-align: top;">Notes:</td>
            <td style="padding: 8px 0; color: #1e293b;">${order.notes}</td>
          </tr>
          ` : ''}
          ${action !== 'created' ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Action by:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${actionBy}</td>
          </tr>
          ` : `
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Created by:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${actionBy}</td>
          </tr>
          `}
        </table>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${baseUrl}/orders" style="
          display: inline-block;
          background: #3b82f6;
          color: white;
          padding: 12px 24px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 500;
        ">View Orders</a>
      </div>

      <div style="color: #64748b; font-size: 12px; text-align: center; margin-top: 32px;">
        This is an automated message from SiteProc. Please do not reply to this email.
      </div>
    </div>
  `;
}
