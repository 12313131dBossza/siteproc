# Email Invitation Setup - Complete Guide

## ✅ What's Been Implemented

### 1. Email Sending Library
- **Package**: Resend (`npm install resend` - already installed)
- **Alternative**: SendGrid (also supported)
- **File**: `src/lib/email.ts` - contains `sendInvitationEmail()` function

### 2. API Integration
- **File**: `src/app/api/users/route.ts`
- **Function**: POST endpoint now sends invitation emails
- **Features**: 
  - Fetches inviter's name and company name for personalized emails
  - Sends beautiful HTML email with invitation link
  - Gracefully handles email failures (invitation still created)

### 3. Invitation Acceptance Page
- **File**: `src/app/accept-invitation/page.tsx`
- **URL**: `/accept-invitation?token=<invitation_token>`
- **Features**:
  - Validates invitation token and expiry
  - Collects user's full name and password
  - Creates Supabase auth account
  - Creates user profile with company linkage
  - Marks invitation as accepted
  - Redirects to dashboard

### 4. Email Template
Beautiful, responsive HTML email includes:
- Company logo and branding
- Inviter's name and company name
- Role information
- "Accept Invitation" button
- 7-day expiry warning
- Plain text fallback

---

## 🚀 How to Enable Email Sending

### Step 1: Get Resend API Key

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day free tier)
3. Navigate to **API Keys**
4. Click **Create API Key**
5. Name it `siteproc-production` and copy the key

### Step 2: Add Environment Variables

Add these to your `.env.local` file (for development) and Vercel environment variables (for production):

```env
# Email Configuration
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_actual_api_key_here
EMAIL_FROM=onboarding@resend.dev

# Application URL
NEXT_PUBLIC_APP_URL=https://siteproc1.vercel.app
```

**Important Notes:**
- `onboarding@resend.dev` is pre-verified by Resend for testing
- Later, verify your own domain (e.g., `noreply@yourdomain.com`)
- `NEXT_PUBLIC_APP_URL` must match your production URL

### Step 3: Add to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`siteproc`)
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - Key: `RESEND_API_KEY`, Value: `re_your_api_key...`
   - Key: `EMAIL_FROM`, Value: `onboarding@resend.dev`
   - Key: `EMAIL_PROVIDER`, Value: `resend`
   - Key: `NEXT_PUBLIC_APP_URL`, Value: `https://siteproc1.vercel.app`
5. Click **Save**
6. **Redeploy** your app (Settings → Deployments → ••• → Redeploy)

---

## 📧 Testing the Invitation Flow

### As Admin (Sending Invitations):

1. Go to Settings → Users tab
2. Enter an email address
3. Select a role
4. Click "Send Invitation"
5. You'll see: "User invitation sent successfully"
6. Check the email inbox (might be in spam initially)

### As Invited User (Accepting):

1. Open the invitation email
2. Click "Accept Invitation" button
3. Fill in:
   - Full Name
   - Password (min 6 characters)
   - Confirm Password
4. Click "Accept & Create Account"
5. You'll be redirected to the dashboard
6. Your account is now linked to the company

---

## 🔍 Troubleshooting

### Emails Not Being Sent

**Check Console Logs:**
```bash
# In Vercel, go to Functions → View Logs
# Look for:
"Invitation email sent to user@email.com"
# or
"Error sending invitation email: <error message>"
```

**Common Issues:**
1. **API Key Not Set**: Check Vercel environment variables
2. **Invalid From Address**: Use `onboarding@resend.dev` for testing
3. **Rate Limiting**: Free tier = 100 emails/day
4. **Email in Spam**: Mark as "Not Spam" to train filters

### Invitation Link Not Working

**Check:**
- `NEXT_PUBLIC_APP_URL` matches your actual domain
- Token hasn't expired (7 days)
- Invitation status is still `pending` in database

**Verify in Supabase:**
```sql
SELECT 
  email,
  role,
  status,
  expires_at,
  created_at
FROM user_invitations
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### User Creation Fails

**Common Causes:**
- Email already registered in Supabase Auth
- Password too short (min 6 chars)
- Missing company_id or role

**Fix:**
Check Supabase Auth → Users to see if email already exists

---

## 🎨 Customizing the Email

Edit `src/lib/email.ts`, function `sendInvitationEmail()`:

**Change Colors:**
```typescript
// Blue button → Green button
background: #2563eb → background: #16a34a
```

**Add Logo:**
```html
<img src="https://yourdomain.com/logo.png" alt="Logo" width="120">
```

**Change Text:**
```typescript
subject: `You've been invited...` → subject: `Join our team...`
```

---

## 📊 Monitoring Invitations

### Check Invitation Status

```sql
-- All pending invitations
SELECT 
  email,
  role,
  created_at,
  expires_at,
  (expires_at > NOW()) as is_valid
FROM user_invitations
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Acceptance rate
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
FROM user_invitations
GROUP BY status;
```

### Resend Expired Invitations

Currently, users need to create a new invitation. To implement resend:

1. Add `PATCH /api/users/invitations/[id]` endpoint
2. Generate new token
3. Update expiry date
4. Resend email

---

## 🔐 Security Considerations

✅ **Implemented:**
- Unique random tokens (UUID v4)
- 7-day expiration
- One-time use (status changes to 'accepted')
- Company linkage validated
- RLS policies prevent cross-company access

⚠️ **Recommendations:**
- Monitor for abuse (rate limiting on invitations)
- Add CAPTCHA to acceptance page if needed
- Implement invitation revocation feature
- Log all invitation activities

---

## 📈 Next Steps

### Optional Enhancements:

1. **Bulk Invitations** - CSV upload
2. **Invitation Templates** - Role-specific email content
3. **Automatic Reminders** - Email after 3 days if not accepted
4. **Custom Domains** - Verify your domain with Resend
5. **Welcome Email** - Send after account creation
6. **Invitation Analytics** - Track open rates, click rates

### Custom Domain Setup:

1. Go to Resend → Domains
2. Add your domain (e.g., `yourdomain.com`)
3. Add DNS records provided by Resend
4. Wait for verification (5-30 minutes)
5. Update `EMAIL_FROM` to `noreply@yourdomain.com`

---

## ✅ Current Status

- [x] Email library installed (Resend)
- [x] Email template created
- [x] API integrated
- [x] Acceptance page built
- [x] Database schema ready
- [ ] **Environment variables needed** (Add RESEND_API_KEY to Vercel)
- [ ] **Test end-to-end** (Send invitation → Receive email → Accept → Login)

**Ready to deploy!** Just add the API key to Vercel and you're live.
