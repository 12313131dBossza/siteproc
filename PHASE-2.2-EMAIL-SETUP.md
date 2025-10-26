# Phase 2.2: Email Notifications System - COMPLETE ✅

## Overview

The email notification system is fully set up and ready to use! It supports **Resend** (recommended) and **SendGrid** as email providers.

## Current Status

✅ **Email infrastructure**: Complete  
✅ **Email templates**: 6 notification types implemented  
✅ **API routes**: Test endpoint available  
✅ **Test page**: `/test-email` ready for testing

## Configuration

### Environment Variables

```bash
# Resend (Recommended - Free tier: 3,000 emails/month)
RESEND_API_KEY=re_your_api_key_here
EMAIL_PROVIDER=resend
RESEND_FROM=onboarding@resend.dev  # For testing
EMAIL_FROM=noreply@yourdomain.com  # For production

# Alternative: SendGrid
# EMAIL_PROVIDER=sendgrid
# SENDGRID_API_KEY=your_sendgrid_api_key
# SENDGRID_FROM=noreply@yourdomain.com
```

### Get Resend API Key

1. Go to https://resend.com
2. Sign up for free account (3,000 emails/month)
3. Verify your email
4. Go to **API Keys** in dashboard
5. Create new API key
6. Copy and add to `.env.local` and Vercel

## Email Templates Available

### 1. Order Request Notification
Sent when a new order is requested and needs approval.

```typescript
sendOrderRequestNotification({
  orderId: 'ORDER-123',
  projectName: 'Downtown Office',
  companyName: 'ABC Construction',
  requestedBy: 'John Doe',
  requestedByEmail: 'john@example.com',
  amount: 2500.00,
  description: 'Concrete delivery',
  category: 'Materials',
  approverName: 'manager@example.com',
  dashboardUrl: 'https://app.com/orders/123',
})
```

### 2. Order Approval Notification
Sent to requester when order is approved.

```typescript
sendOrderApprovalNotification({
  ...orderData,
  approvedBy: 'Jane Manager',
})
```

### 3. Order Rejection Notification
Sent to requester when order is rejected.

```typescript
sendOrderRejectionNotification({
  ...orderData,
  rejectedBy: 'Jane Manager',
  reason: 'Budget exceeded',
})
```

### 4. Expense Submission Notification
Sent to admin when expense is submitted.

```typescript
sendExpenseSubmissionNotification({
  expenseId: 'EXP-456',
  projectName: 'Downtown Office',
  companyName: 'ABC Construction',
  submittedBy: 'John Doe',
  submittedByEmail: 'john@example.com',
  amount: 150.00,
  description: 'Office supplies',
  category: 'Supplies',
  adminName: 'admin@example.com',
  dashboardUrl: 'https://app.com/expenses/456',
  receiptUrl: 'https://app.com/receipts/456.pdf',
})
```

### 5. Delivery Confirmation Notification
Sent when delivery is confirmed.

```typescript
sendDeliveryConfirmationNotification({
  deliveryId: 'DEL-789',
  projectName: 'Downtown Office',
  companyName: 'ABC Construction',
  orderId: 'ORDER-123',
  orderDescription: 'Concrete delivery',
  deliveredBy: 'John Doe',
  deliveredByEmail: 'john@example.com',
  adminName: 'admin@example.com',
  dashboardUrl: 'https://app.com/deliveries/789',
  photoUrls: ['https://app.com/photos/1.jpg'],
})
```

### 6. Budget Variance Alert
Sent when project budget exceeds threshold.

```typescript
sendBudgetVarianceAlert({
  projectId: 'PROJ-001',
  projectName: 'Downtown Office',
  companyName: 'ABC Construction',
  currentSpent: 85000,
  budget: 100000,
  percentageUsed: 85,
  adminEmails: ['admin@example.com', 'manager@example.com'],
  dashboardUrl: 'https://app.com/projects/001',
})
```

## Testing

### 1. Test via Web Interface

Visit: `http://localhost:3000/test-email`

1. Enter your email address
2. Click "Send Test Email"
3. Check your inbox for test order notification

### 2. Test via API

```bash
curl -X POST http://localhost:3000/api/emails/test-order-notification \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'
```

### 3. Test in Production

After deploying to Vercel:
```bash
curl -X POST https://your-app.vercel.app/api/emails/test-order-notification \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'
```

## Integration Examples

### In API Routes

```typescript
// src/app/api/orders/[id]/approve/route.ts
import { sendOrderApprovalNotification } from '@/lib/email'

export async function POST(request: Request) {
  // ... approve order logic ...
  
  await sendOrderApprovalNotification({
    orderId: order.id,
    projectName: order.project_name,
    // ... other fields
    approvedBy: user.name,
  })
  
  return Response.json({ success: true })
}
```

### In Server Actions

```typescript
'use server'
import { sendExpenseSubmissionNotification } from '@/lib/email'

export async function submitExpense(data: ExpenseData) {
  // ... save expense to database ...
  
  await sendExpenseSubmissionNotification({
    expenseId: expense.id,
    projectName: project.name,
    // ... other fields
  })
  
  return { success: true }
}
```

## Email Provider Comparison

| Feature | Resend | SendGrid |
|---------|--------|----------|
| Free Tier | 3,000/month | 100/day |
| Setup | Easy | Moderate |
| Verification | Domain (optional) | Domain required |
| API | Simple | Complex |
| React Email | Native support | Manual setup |
| **Recommendation** | ✅ Recommended | Alternative |

## Production Setup

### 1. Domain Verification (Optional but Recommended)

To send from your own domain:

1. Go to Resend dashboard
2. Add domain: `yourdomain.com`
3. Add DNS records provided by Resend
4. Wait for verification (usually < 1 hour)
5. Update `RESEND_FROM=noreply@yourdomain.com`

### 2. Vercel Environment Variables

Add to Vercel:
```
RESEND_API_KEY=re_your_production_key
EMAIL_PROVIDER=resend
RESEND_FROM=noreply@yourdomain.com
EMAIL_FROM=noreply@yourdomain.com
```

### 3. Test in Production

1. Deploy to Vercel
2. Visit `/test-email` on your production domain
3. Send test email to verify

## Troubleshooting

### Email not sending

1. Check environment variables are set
2. Verify Resend API key is valid
3. Check console logs for errors
4. Verify email provider is set: `EMAIL_PROVIDER=resend`

### Email in spam folder

1. Verify domain with Resend
2. Add SPF, DKIM records
3. Avoid spam trigger words
4. Include unsubscribe link (future improvement)

### Rate limits

- **Resend Free**: 3,000/month, 100/hour
- **Solution**: Upgrade plan or batch emails

## Next Steps (Optional Improvements)

1. **Email Templates with React Email**
   - Create beautiful components with `@react-email/components`
   - Better styling and branding

2. **User Notification Preferences**
   - Let users choose which emails to receive
   - Add user_preferences table
   - Build settings UI

3. **Email Queue**
   - Implement job queue (Inngest, BullMQ)
   - Retry failed emails
   - Better scalability

4. **Analytics**
   - Track open rates
   - Track click rates
   - A/B test subject lines

5. **Unsubscribe System**
   - Add unsubscribe links
   - Honor unsubscribe requests
   - CAN-SPAM compliance

## Resources

- [Resend Documentation](https://resend.com/docs)
- [React Email](https://react.email)
- [Email Best Practices](https://resend.com/docs/knowledge-base/best-practices)

---

**Status**: ✅ Phase 2.2 Complete!  
**Next**: Phase 2.3 - QuickBooks OAuth Integration
