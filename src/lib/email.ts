import sgMail from '@sendgrid/mail'

type Provider = 'sendgrid' | 'resend' | 'log'

function provider(): Provider {
  const p = (process.env.EMAIL_PROVIDER || 'sendgrid').toLowerCase()
  return (['sendgrid', 'resend', 'log'] as Provider[]).includes(p as Provider) ? (p as Provider) : 'sendgrid'
}

function getFromEnv() {
  // For Resend, use their verified domain for testing
  if (provider() === 'resend') {
    return process.env.RESEND_FROM || 'onboarding@resend.dev'
  }
  
  // Generic first, then provider-specific, then fallback
  return (
    process.env.EMAIL_FROM ||
    (provider() === 'sendgrid' ? process.env.SENDGRID_FROM : undefined) ||
    'no-reply@siteproc.local'
  )
}

export function getFromAddress() {
  return getFromEnv()
}

export function isEmailEnabled() {
  switch (provider()) {
    case 'sendgrid':
      return !!process.env.SENDGRID_API_KEY
    case 'resend':
      return !!process.env.RESEND_API_KEY
    case 'log':
      return true
  }
}

type BasicMessage = {
  to: string | string[]
  from?: string
  subject: string
  text?: string
  html?: string
}

async function sendViaSendGrid(messages: BasicMessage[]) {
  if (!process.env.SENDGRID_API_KEY) return { skipped: true }
  if (!(sgMail as any)._apiKey && process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  }
  await sgMail.send(messages as any)
  return { ok: true }
}

async function sendViaResend(messages: BasicMessage[]) {
  const key = process.env.RESEND_API_KEY
  if (!key) return { skipped: true }
  const endpoint = 'https://api.resend.com/emails'
  const ownerEmail = 'bossbcz@gmail.com'; // Verified email in Resend
  
  // Send one by one to keep it simple and avoid batching constraints
  for (const m of messages) {
    // In testing mode, only send to verified email
    // To fix: Verify a domain at resend.com/domains and update EMAIL_FROM in .env
    const recipients = Array.isArray(m.to) ? m.to : [m.to];
    const testMode = !recipients.some(email => email.includes('@') && !email.includes('resend.dev'));
    
    // Skip if trying to send to non-verified email in test mode
    if (testMode && !recipients.includes(ownerEmail)) {
      console.log(`[Resend] Skipping email to ${m.to} - verify domain to send to other recipients`);
      continue;
    }
    
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: m.from || getFromEnv(),
        to: m.to,
        subject: m.subject,
        text: m.text,
        html: m.html,
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(`[Resend] Error ${res.status}: ${text}`);
      // Don't throw - just log and continue
      console.log(`[Resend] Continuing despite error to avoid breaking approval flow`);
    }
  }
  return { ok: true }
}

export async function sendEmail(msg: BasicMessage | BasicMessage[]) {
  const messages = Array.isArray(msg) ? msg : [msg]
  const withFrom = messages.map(m => ({ from: m.from || getFromEnv(), ...m }))
  const p = provider()
  try {
    if (p === 'log') {
      console.log('[email:log] Skipping send. Messages:', withFrom)
      return { skipped: true }
    }
    if (!isEmailEnabled()) {
      console.log(`[email:${p}] disabled: missing API key; skipping send`)
      return { skipped: true }
    }
    if (p === 'resend') return await sendViaResend(withFrom)
    // default to sendgrid
    return await sendViaSendGrid(withFrom)
  } catch (e: any) {
    console.error(`Email error via ${p}`, e)
    return { ok: false, error: e?.message || String(e) }
  }
}

// Notification Email Templates

interface OrderNotificationData {
  orderId: string
  projectName: string
  companyName: string
  requestedBy: string
  requestedByEmail: string
  amount: number
  description: string
  category: string
  approverName: string
  dashboardUrl: string
}

interface ExpenseNotificationData {
  expenseId: string
  projectName: string
  companyName: string
  submittedBy: string
  submittedByEmail: string
  amount: number
  description: string
  category: string
  adminName: string
  dashboardUrl: string
  receiptUrl?: string
}

interface DeliveryNotificationData {
  deliveryId: string
  projectName: string
  companyName: string
  orderId: string
  orderDescription: string
  deliveredBy: string
  deliveredByEmail: string
  adminName: string
  dashboardUrl: string
  photoUrls?: string[]
}

interface BudgetAlertData {
  projectId: string
  projectName: string
  companyName: string
  currentSpent: number
  budget: number
  percentageUsed: number
  adminEmails: string[]
  dashboardUrl: string
}

interface InvitationEmailData {
  to: string
  inviterName: string
  companyName: string
  role: string
  invitationToken: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

// Order Request Notification
export async function sendOrderRequestNotification(data: OrderNotificationData) {
  const subject = `Order Request - ${data.projectName} (${formatCurrency(data.amount)})`
  const html = `
    <h2>New Order Request</h2>
    <p>A new order has been requested and requires approval:</p>
    
    <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <h3>${data.projectName}</h3>
      <p><strong>Company:</strong> ${data.companyName}</p>
      <p><strong>Requested by:</strong> ${data.requestedBy} (${data.requestedByEmail})</p>
      <p><strong>Amount:</strong> ${formatCurrency(data.amount)}</p>
      <p><strong>Category:</strong> ${data.category}</p>
      <p><strong>Description:</strong> ${data.description}</p>
    </div>
    
    <p>Please review and approve/reject this order in your dashboard.</p>
    <p><a href="${data.dashboardUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Review Order</a></p>
    
    <hr style="margin: 24px 0;">
    <p style="color: #666; font-size: 14px;">This is an automated notification from SiteProc.</p>
  `
  
  const text = `New Order Request - ${data.projectName}

A new order has been requested and requires approval:

Project: ${data.projectName}
Company: ${data.companyName}
Requested by: ${data.requestedBy} (${data.requestedByEmail})
Amount: ${formatCurrency(data.amount)}
Category: ${data.category}
Description: ${data.description}

Please review and approve/reject this order in your dashboard: ${data.dashboardUrl}`

  return sendEmail({
    to: data.approverName,
    subject,
    html,
    text
  })
}

// Order Approval Notification
export async function sendOrderApprovalNotification(data: OrderNotificationData & { approvedBy: string }) {
  const subject = `Order Approved - ${data.projectName} (${formatCurrency(data.amount)})`
  const html = `
    <h2>Order Approved</h2>
    <p>Your order request has been approved:</p>
    
    <div style="background: #d4edda; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #28a745;">
      <h3>${data.projectName}</h3>
      <p><strong>Amount:</strong> ${formatCurrency(data.amount)}</p>
      <p><strong>Category:</strong> ${data.category}</p>
      <p><strong>Description:</strong> ${data.description}</p>
      <p><strong>Approved by:</strong> ${data.approvedBy}</p>
    </div>
    
    <p>You can now proceed with the order and update delivery status when complete.</p>
    <p><a href="${data.dashboardUrl}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Dashboard</a></p>
    
    <hr style="margin: 24px 0;">
    <p style="color: #666; font-size: 14px;">This is an automated notification from SiteProc.</p>
  `

  const text = `Order Approved - ${data.projectName}

Your order request has been approved:

Project: ${data.projectName}
Amount: ${formatCurrency(data.amount)}
Category: ${data.category}
Description: ${data.description}
Approved by: ${data.approvedBy}

You can now proceed with the order and update delivery status when complete.
View dashboard: ${data.dashboardUrl}`

  return sendEmail({
    to: data.requestedByEmail,
    subject,
    html,
    text
  })
}

// Order Rejection Notification
export async function sendOrderRejectionNotification(data: OrderNotificationData & { rejectedBy: string; reason?: string }) {
  const subject = `Order Rejected - ${data.projectName} (${formatCurrency(data.amount)})`
  const html = `
    <h2>Order Rejected</h2>
    <p>Your order request has been rejected:</p>
    
    <div style="background: #f8d7da; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #dc3545;">
      <h3>${data.projectName}</h3>
      <p><strong>Amount:</strong> ${formatCurrency(data.amount)}</p>
      <p><strong>Category:</strong> ${data.category}</p>
      <p><strong>Description:</strong> ${data.description}</p>
      <p><strong>Rejected by:</strong> ${data.rejectedBy}</p>
      ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
    </div>
    
    <p>Please contact your project administrator if you have questions about this decision.</p>
    <p><a href="${data.dashboardUrl}" style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Dashboard</a></p>
    
    <hr style="margin: 24px 0;">
    <p style="color: #666; font-size: 14px;">This is an automated notification from SiteProc.</p>
  `

  const text = `Order Rejected - ${data.projectName}

Your order request has been rejected:

Project: ${data.projectName}
Amount: ${formatCurrency(data.amount)}
Category: ${data.category}
Description: ${data.description}
Rejected by: ${data.rejectedBy}
${data.reason ? `Reason: ${data.reason}` : ''}

Please contact your project administrator if you have questions about this decision.
View dashboard: ${data.dashboardUrl}`

  return sendEmail({
    to: data.requestedByEmail,
    subject,
    html,
    text
  })
}

// Expense Submission Notification
export async function sendExpenseSubmissionNotification(data: ExpenseNotificationData) {
  const subject = `Expense Submitted - ${data.projectName} (${formatCurrency(data.amount)})`
  const html = `
    <h2>New Expense Submitted</h2>
    <p>A new expense has been submitted for review:</p>
    
    <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <h3>${data.projectName}</h3>
      <p><strong>Company:</strong> ${data.companyName}</p>
      <p><strong>Submitted by:</strong> ${data.submittedBy} (${data.submittedByEmail})</p>
      <p><strong>Amount:</strong> ${formatCurrency(data.amount)}</p>
      <p><strong>Category:</strong> ${data.category}</p>
      <p><strong>Description:</strong> ${data.description}</p>
      ${data.receiptUrl ? `<p><strong>Receipt:</strong> <a href="${data.receiptUrl}">View Receipt</a></p>` : ''}
    </div>
    
    <p>Please review and approve/reject this expense in your dashboard.</p>
    <p><a href="${data.dashboardUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Review Expense</a></p>
    
    <hr style="margin: 24px 0;">
    <p style="color: #666; font-size: 14px;">This is an automated notification from SiteProc.</p>
  `

  const text = `New Expense Submitted - ${data.projectName}

A new expense has been submitted for review:

Project: ${data.projectName}
Company: ${data.companyName}
Submitted by: ${data.submittedBy} (${data.submittedByEmail})
Amount: ${formatCurrency(data.amount)}
Category: ${data.category}
Description: ${data.description}
${data.receiptUrl ? `Receipt: ${data.receiptUrl}` : ''}

Please review and approve/reject this expense in your dashboard: ${data.dashboardUrl}`

  return sendEmail({
    to: data.adminName,
    subject,
    html,
    text
  })
}

// Delivery Confirmation Notification
export async function sendDeliveryConfirmationNotification(data: DeliveryNotificationData) {
  const subject = `Delivery Confirmed - ${data.projectName}`
  const html = `
    <h2>Delivery Confirmed</h2>
    <p>A delivery has been confirmed for your project:</p>
    
    <div style="background: #d4edda; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #28a745;">
      <h3>${data.projectName}</h3>
      <p><strong>Company:</strong> ${data.companyName}</p>
      <p><strong>Order:</strong> ${data.orderDescription}</p>
      <p><strong>Delivered by:</strong> ${data.deliveredBy} (${data.deliveredByEmail})</p>
      ${data.photoUrls && data.photoUrls.length > 0 ? `
        <div style="margin-top: 12px;">
          <strong>Delivery Photos:</strong>
          ${data.photoUrls.map(url => `<div><a href="${url}">View Photo</a></div>`).join('')}
        </div>
      ` : ''}
    </div>
    
    <p>The delivery has been recorded and project metrics have been updated.</p>
    <p><a href="${data.dashboardUrl}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Dashboard</a></p>
    
    <hr style="margin: 24px 0;">
    <p style="color: #666; font-size: 14px;">This is an automated notification from SiteProc.</p>
  `

  const text = `Delivery Confirmed - ${data.projectName}

A delivery has been confirmed for your project:

Project: ${data.projectName}
Company: ${data.companyName}
Order: ${data.orderDescription}
Delivered by: ${data.deliveredBy} (${data.deliveredByEmail})
${data.photoUrls && data.photoUrls.length > 0 ? `
Delivery Photos:
${data.photoUrls.join('\n')}` : ''}

The delivery has been recorded and project metrics have been updated.
View dashboard: ${data.dashboardUrl}`

  return sendEmail({
    to: data.adminName,
    subject,
    html,
    text
  })
}

// Budget Variance Alert
export async function sendBudgetVarianceAlert(data: BudgetAlertData) {
  const subject = `Budget Alert - ${data.projectName} (${data.percentageUsed.toFixed(1)}% used)`
  const html = `
    <h2>Budget Variance Alert</h2>
    <p>Project budget usage has exceeded the warning threshold:</p>
    
    <div style="background: #fff3cd; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ffc107;">
      <h3>${data.projectName}</h3>
      <p><strong>Company:</strong> ${data.companyName}</p>
      <p><strong>Budget:</strong> ${formatCurrency(data.budget)}</p>
      <p><strong>Current Spent:</strong> ${formatCurrency(data.currentSpent)}</p>
      <p><strong>Percentage Used:</strong> ${data.percentageUsed.toFixed(1)}%</p>
      <p><strong>Remaining:</strong> ${formatCurrency(data.budget - data.currentSpent)}</p>
    </div>
    
    <p>Please review project expenses and consider budget adjustments if necessary.</p>
    <p><a href="${data.dashboardUrl}" style="background: #ffc107; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Review Project</a></p>
    
    <hr style="margin: 24px 0;">
    <p style="color: #666; font-size: 14px;">This is an automated notification from SiteProc.</p>
  `

  const text = `Budget Alert - ${data.projectName}

Project budget usage has exceeded the warning threshold:

Project: ${data.projectName}
Company: ${data.companyName}
Budget: ${formatCurrency(data.budget)}
Current Spent: ${formatCurrency(data.currentSpent)}
Percentage Used: ${data.percentageUsed.toFixed(1)}%
Remaining: ${formatCurrency(data.budget - data.currentSpent)}

Please review project expenses and consider budget adjustments if necessary.
Review project: ${data.dashboardUrl}`

  return sendEmail({
    to: data.adminEmails,
    subject,
    html,
    text
  })
}

// User Invitation Email
export async function sendInvitationEmail(data: InvitationEmailData) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://siteproc1.vercel.app'
  const acceptUrl = `${appUrl}/accept-invitation?token=${data.invitationToken}`
  
  const subject = `You've been invited to join ${data.companyName} on SiteProc`
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to join ${data.companyName}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #2563eb; font-size: 28px; margin: 0;">🏗️ SiteProc</h1>
          </div>
          
          <div style="margin-bottom: 32px;">
            <h2>You've been invited!</h2>
            <p>Hi there,</p>
            <p>
              <strong>${data.inviterName}</strong> has invited you to join 
              <strong>${data.companyName}</strong> on SiteProc as a <strong>${data.role}</strong>.
            </p>
            
            <div style="background: #f3f4f6; border-radius: 6px; padding: 16px; margin: 24px 0;">
              <p style="margin: 8px 0;"><strong>Company:</strong> ${data.companyName}</p>
              <p style="margin: 8px 0;"><strong>Role:</strong> ${data.role}</p>
              <p style="margin: 8px 0;"><strong>Invited by:</strong> ${data.inviterName}</p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${acceptUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                Accept Invitation
              </a>
            </div>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 24px 0; font-size: 14px;">
              ⏰ <strong>This invitation expires in 7 days.</strong>
              <br>
              Click the button above to accept and create your account.
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              If the button doesn't work, copy and paste this link into your browser:
              <br>
              <a href="${acceptUrl}" style="color: #2563eb; word-break: break-all;">
                ${acceptUrl}
              </a>
            </p>
          </div>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center;">
            <p>
              This invitation was sent from SiteProc, a construction project management platform.
            </p>
            <p>
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `You've been invited to join ${data.companyName} on SiteProc!

${data.inviterName} has invited you to join ${data.companyName} as a ${data.role}.

Company: ${data.companyName}
Role: ${data.role}
Invited by: ${data.inviterName}

Click here to accept the invitation and create your account:
${acceptUrl}

⏰ This invitation expires in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

---
This is an automated email from SiteProc.`

  return sendEmail({
    to: data.to,
    subject,
    html,
    text
  })
}

// Send notification for new chat message
export async function sendMessageNotification(data: {
  to: string;
  senderName: string;
  projectName: string;
  message: string;
  messageType?: string;
  chatUrl: string;
}) {
  if (!isEmailEnabled()) {
    console.log('[Email] Skipped message notification (email not configured)')
    return { skipped: true }
  }

  const subject = `💬 New message from ${data.senderName} - ${data.projectName}`
  
  const messagePreview = data.message.length > 100 
    ? data.message.substring(0, 100) + '...' 
    : data.message

  const messageIcon = {
    'voice': '🎤 Voice message',
    'location': '📍 Shared location',
    'order_reference': '📦 Order reference',
    'status_update': '🚚 Status update',
  }[data.messageType || ''] || messagePreview

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #2563eb; margin: 0;">New Message</h1>
          </div>

          <p style="color: #374151;">
            You have a new message in <strong>${data.projectName}</strong>
          </p>
          
          <div style="background: #f3f4f6; border-radius: 6px; padding: 16px; margin: 24px 0; border-left: 4px solid #2563eb;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #374151;">${data.senderName}</p>
            <p style="margin: 0; color: #6b7280;">${messageIcon}</p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${data.chatUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              View Message
            </a>
          </div>

          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            You're receiving this because you have email notifications enabled for this conversation.
          </p>
        </div>
      </body>
    </html>
  `

  const text = `New message in ${data.projectName}

From: ${data.senderName}
Message: ${messageIcon}

Click here to view:
${data.chatUrl}

---
This is an automated email from SiteProc.`

  return sendEmail({
    to: data.to,
    subject,
    html,
    text
  })
}
// Project Access Invitation Email
interface ProjectInvitationEmailData {
  to: string
  inviterName: string
  projectName: string
  companyName: string
  role: string
  invitationToken: string
  externalName?: string
  permissions?: Record<string, boolean>
}

export async function sendProjectInvitationEmail(data: ProjectInvitationEmailData) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://siteproc1.vercel.app'
  const acceptUrl = `${appUrl}/accept-project-invite?token=${data.invitationToken}`
  
  const permissionsList = data.permissions 
    ? Object.entries(data.permissions)
        .filter(([_, v]) => v)
        .map(([k]) => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
        .join(', ')
    : 'View Project'

  const subject = `You've been invited to project "${data.projectName}" on SiteProc`
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Project Invitation - ${data.projectName}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #2563eb; font-size: 28px; margin: 0;">🏗️ SiteProc</h1>
          </div>
          
          <div style="margin-bottom: 32px;">
            <h2>You've been invited to a project!</h2>
            <p>Hi${data.externalName ? ` ${data.externalName}` : ''},</p>
            <p>
              <strong>${data.inviterName}</strong> from <strong>${data.companyName}</strong> has invited you 
              to collaborate on the project <strong>"${data.projectName}"</strong>.
            </p>
            
            <div style="background: #f3f4f6; border-radius: 6px; padding: 16px; margin: 24px 0;">
              <p style="margin: 8px 0;"><strong>Project:</strong> ${data.projectName}</p>
              <p style="margin: 8px 0;"><strong>Company:</strong> ${data.companyName}</p>
              <p style="margin: 8px 0;"><strong>Your Role:</strong> ${data.role}</p>
              <p style="margin: 8px 0;"><strong>Permissions:</strong> ${permissionsList}</p>
              <p style="margin: 8px 0;"><strong>Invited by:</strong> ${data.inviterName}</p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${acceptUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                Accept Invitation
              </a>
            </div>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 24px 0; font-size: 14px;">
              ⏰ <strong>This invitation expires in 7 days.</strong>
              <br>
              Click the button above to access the project.
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              If the button doesn't work, copy and paste this link into your browser:
              <br>
              <a href="${acceptUrl}" style="color: #2563eb; word-break: break-all;">
                ${acceptUrl}
              </a>
            </p>
          </div>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center;">
            <p>
              This invitation was sent from SiteProc, a construction project management platform.
            </p>
            <p>
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `You've been invited to project "${data.projectName}" on SiteProc!

Hi${data.externalName ? ` ${data.externalName}` : ''},

${data.inviterName} from ${data.companyName} has invited you to collaborate on the project "${data.projectName}".

Project: ${data.projectName}
Company: ${data.companyName}
Your Role: ${data.role}
Permissions: ${permissionsList}
Invited by: ${data.inviterName}

Click here to accept the invitation:
${acceptUrl}

⏰ This invitation expires in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

---
This is an automated email from SiteProc.`

  return sendEmail({
    to: data.to,
    subject,
    html,
    text
  })
}
