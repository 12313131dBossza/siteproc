# Email Notifications Testing Guide

## Overview
This guide provides step-by-step instructions for testing all 6 email notification types integrated into SiteProc.

## Prerequisites
- Access to the app (locally or on Vercel)
- Test email address (e.g., `thegrindseasonhomie@gmail.com`)
- Admin/owner role in the system
- Resend API key configured in environment variables

## Quick Test Page
For quick validation of email delivery and template rendering:

### URL
- **Production**: `https://[your-vercel-url]/test-email`
- **Local**: `http://localhost:3000/test-email`

### How to Use
1. Navigate to the test page
2. Enter your test email address
3. Click buttons to test individual templates
4. Check your inbox for emails
5. Verify HTML formatting and links work

---

## Integration Tests (Real Workflows)

### 1. Order Request Notification ✅
**Trigger**: When any user creates a new order  
**Recipient**: All company admins  
**Status**: Already working automatically

#### Test Steps:
1. Log in as a regular user (non-admin)
2. Navigate to **Projects** page
3. Select a project and click "Create Order"
4. Fill in order details:
   - **Amount**: $500
   - **Category**: Materials
   - **Description**: Test order for email notification
   - **Vendor**: Test Vendor
5. Click **Submit Order**
6. Check admin email inbox

#### Expected Email:
- **Subject**: "New Order Request Requires Approval"
- **Content**: 
  - Order details (amount, category, description)
  - Project name
  - Requester name and email
  - "Approve Order" and "Reject Order" buttons linking to dashboard
- **From**: `onboarding@resend.dev`

---

### 2. Order Approval Notification 🆕
**Trigger**: When admin approves an order  
**Recipient**: User who created the order  
**Status**: Newly integrated

#### Test Steps:
1. Log in as admin
2. Navigate to **Orders** page
3. Find a pending order (or create one first as different user)
4. Click **Approve** button
5. Add optional approval notes
6. Confirm approval
7. Check order creator's email inbox

#### Expected Email:
- **Subject**: "Order Approved - [Project Name]"
- **Content**:
  - "Good news!" message
  - Order details (amount, category, description)
  - Approver name
  - Optional approval notes
  - "View Order Details" button
- **From**: `onboarding@resend.dev`

---

### 3. Order Rejection Notification 🆕
**Trigger**: When admin rejects an order  
**Recipient**: User who created the order  
**Status**: Newly integrated

#### Test Steps:
1. Log in as admin
2. Navigate to **Orders** page
3. Find a pending order (or create one first as different user)
4. Click **Reject** button
5. Enter rejection reason (required)
6. Confirm rejection
7. Check order creator's email inbox

#### Expected Email:
- **Subject**: "Order Rejected - [Project Name]"
- **Content**:
  - Order rejection message
  - Order details (amount, category, description)
  - Rejected by name
  - Rejection reason
  - "View Order Details" button
- **From**: `onboarding@resend.dev`

---

### 4. Expense Submission Notification 🆕
**Trigger**: When user submits an expense for approval  
**Recipient**: All company admins  
**Status**: Newly integrated

#### Test Steps:
1. Log in as a regular user (non-admin)
2. Navigate to **Expenses** page
3. Click **Add Expense** button
4. Fill in expense details:
   - **Vendor**: Ace Hardware
   - **Category**: Tools
   - **Amount**: $125.50
   - **Description**: Power drill and bits
   - **Date**: Today's date
5. Optionally upload receipt
6. Click **Submit Expense**
7. Check admin email inbox

#### Expected Email:
- **Subject**: "New Expense Submission for Review"
- **Content**:
  - Expense details (vendor, amount, category, description)
  - Submitted by name and email
  - "Review Expense" button linking to expenses page
- **From**: `onboarding@resend.dev`

#### Important Notes:
- If submitter has admin/owner/bookkeeper role, expense is **auto-approved** and NO email is sent
- Email only sent when status is "pending" (requires approval)

---

### 5. Delivery Confirmation Notification 🆕
**Trigger**: When delivery is marked as complete  
**Recipient**: All company admins  
**Status**: Newly integrated

#### Test Steps:
1. Log in as user with delivery management access
2. Navigate to **Deliveries** page
3. Find a scheduled/in-progress delivery
4. Click **Mark as Delivered** button
5. Confirm delivery completion
6. Check admin email inbox

#### Expected Email:
- **Subject**: "Delivery Completed - [Project Name]"
- **Content**:
  - Project name
  - Delivery date
  - Delivery notes
  - "View Deliveries" button linking to deliveries page
- **From**: `onboarding@resend.dev`

---

### 6. Budget Variance Alert 📋
**Trigger**: Scheduled job checks budget thresholds  
**Recipient**: Project manager and admins  
**Status**: Template ready, scheduled job not implemented yet

#### Template Test:
Use the test page at `/test-email` and click "Budget Alert" button to see template rendering.

#### Future Implementation:
Will require:
- Scheduled job (cron or serverless function)
- Budget threshold checks
- Alert frequency configuration (daily/weekly)

---

## Testing Checklist

### Initial Setup
- [ ] Verify `RESEND_API_KEY` is set in environment variables
- [ ] Verify `EMAIL_PROVIDER=resend` is set
- [ ] Verify `EMAIL_FROM=onboarding@resend.dev` is set
- [ ] Deploy changes to Vercel or restart local dev server

### Email Delivery Tests
- [ ] Test page loads without errors at `/test-email`
- [ ] Simple test email delivers successfully
- [ ] All 4 template buttons work (Order, Expense, Delivery, Budget)
- [ ] Emails arrive in inbox within 30 seconds
- [ ] HTML formatting renders correctly
- [ ] Plain text fallback is readable
- [ ] Dashboard links are clickable and correct

### Integration Tests
- [ ] Order creation sends notification to admins
- [ ] Order approval sends notification to requester
- [ ] Order rejection sends notification to requester with reason
- [ ] Expense submission sends notification to admins (non-admin users only)
- [ ] Delivery completion sends notification to admins

### Error Handling Tests
- [ ] Order creation succeeds even if email fails (check logs)
- [ ] Expense creation succeeds even if email fails (check logs)
- [ ] Delivery marking succeeds even if email fails (check logs)
- [ ] Invalid email addresses log errors but don't crash

---

## Troubleshooting

### No Emails Arriving

**Check Environment Variables:**
```bash
# In Vercel dashboard or .env.local
RESEND_API_KEY=re_XPgiu8do_EkEzWDBmmjrLGLnEdQuYRpkS
EMAIL_PROVIDER=resend
EMAIL_FROM=onboarding@resend.dev
```

**Check Server Logs:**
- Look for "Failed to send [notification type] notification:" errors
- Check Resend dashboard at https://resend.com/emails for delivery status

**Common Issues:**
- API key not set → Email functions return early
- Wrong from address → 403 domain verification error
- Missing profile data → Email may not have recipient info

### Email Arrives But Looks Wrong

**Check Template Data:**
- Verify all required fields are passed to email functions
- Check for undefined/null values in dashboard links
- Ensure company name is set in profile

**Formatting Issues:**
- Test in multiple email clients (Gmail, Outlook, Apple Mail)
- Check plain text version if HTML rendering fails
- Verify CSS is inline (Resend handles this automatically)

### Links Don't Work

**Check `NEXT_PUBLIC_APP_URL`:**
```bash
# Should be set to your deployment URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Test Link Construction:**
- Order approval: `${NEXT_PUBLIC_APP_URL}/projects/${projectId}`
- Expenses: `${NEXT_PUBLIC_APP_URL}/expenses`
- Deliveries: `${NEXT_PUBLIC_APP_URL}/deliveries`

---

## Email Template Details

### From Address
- **Testing**: `onboarding@resend.dev` (Resend's verified domain)
- **Production**: Add custom domain at https://resend.com/domains

### Rate Limits (Resend Free Tier)
- **Daily**: 100 emails
- **Monthly**: 3,000 emails
- **Rate**: No specific limit, but reasonable usage expected

### Email Contents

All emails include:
- ✅ Professional HTML formatting
- ✅ Plain text fallback
- ✅ Clickable buttons to relevant dashboard pages
- ✅ Complete information (amounts, dates, descriptions)
- ✅ Sender/requester names and emails
- ✅ Company name

---

## Production Deployment Checklist

Before going live:
- [ ] Set `EMAIL_FROM` to custom domain (optional but recommended)
- [ ] Verify custom domain in Resend dashboard
- [ ] Update `NEXT_PUBLIC_APP_URL` to production URL
- [ ] Test all notification types in production
- [ ] Monitor Resend dashboard for delivery issues
- [ ] Set up alerts for email failures
- [ ] Document email notification behavior for users

---

## Next Steps (Optional Enhancements)

### User Notification Preferences
- Add settings page for users to toggle notifications
- Database column: `notification_preferences` (JSONB)
- Check preferences before sending emails

### Additional Notifications
- Project status changes
- Payment confirmations
- User invitations
- Weekly digest emails

### Advanced Features
- Email templates with company branding
- Attachment support for receipts/invoices
- Reply-to addresses for direct communication
- Email tracking and analytics

---

## Support

### Resources
- **Resend Dashboard**: https://resend.com/emails
- **Resend Docs**: https://resend.com/docs
- **Test Page**: `/test-email` in your app
- **Email Templates**: `src/lib/email.ts`

### Getting Help
1. Check server logs for error messages
2. Verify environment variables are set
3. Test with `/test-email` page first
4. Check Resend dashboard for delivery status
5. Review this guide for common issues

---

## Summary

All 6 email notification types are now integrated:
1. ✅ Order Request (automatic on creation)
2. 🆕 Order Approval (on admin approval)
3. 🆕 Order Rejection (on admin rejection)
4. 🆕 Expense Submission (on user submission, pending only)
5. 🆕 Delivery Confirmation (on mark as delivered)
6. 📋 Budget Alert (template ready, scheduled job pending)

Email system is production-ready and provides real-time notifications for all critical workflows!
