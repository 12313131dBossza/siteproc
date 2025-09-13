import sgMail from '@sendgrid/mail'

type Provider = 'sendgrid' | 'resend' | 'log'

function provider(): Provider {
  const p = (process.env.EMAIL_PROVIDER || 'sendgrid').toLowerCase()
  return (['sendgrid', 'resend', 'log'] as Provider[]).includes(p as Provider) ? (p as Provider) : 'sendgrid'
}

function getFromEnv() {
  // Generic first, then provider-specific, then fallback
  return (
    process.env.EMAIL_FROM ||
    (provider() === 'sendgrid' ? process.env.SENDGRID_FROM : undefined) ||
    (provider() === 'resend' ? process.env.RESEND_FROM : undefined) ||
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
  // Send one by one to keep it simple and avoid batching constraints
  for (const m of messages) {
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
      throw new Error(`Resend error ${res.status}: ${text}`)
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
