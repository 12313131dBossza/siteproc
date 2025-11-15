# Email Invitation Setup Guide

## Current Status
✅ **User Invitations Working** - Invitation records are being created in the database
❌ **Email Not Sent** - Email sending functionality is not yet implemented

## What Happens Now
When you send an invitation:
1. ✅ A record is created in the `user_invitations` table
2. ✅ The invitation includes: email, role, company_id, invitation_token
3. ❌ No email is sent to the invited user (not implemented yet)

## To Implement Email Sending

You need to integrate an email service. Here are the options:

### Option 1: SendGrid (Recommended)
```bash
npm install @sendgrid/mail
```

### Option 2: Resend (Modern, Simple)
```bash
npm install resend
```

### Option 3: Nodemailer (Free, Self-hosted)
```bash
npm install nodemailer
```

## Implementation Steps

1. **Choose and install email service** (see above)

2. **Add environment variable** in `.env.local`:
   ```
   SENDGRID_API_KEY=your_api_key_here
   # OR
   RESEND_API_KEY=your_api_key_here
   ```

3. **Update `/api/users` route** - Find this comment in `src/app/api/users/route.ts`:
   ```typescript
   // TODO: Send invitation email (integrate with email service)
   ```

4. **Add email sending code**:
   ```typescript
   // Example with SendGrid:
   import sgMail from '@sendgrid/mail';
   sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

   const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?token=${invitationToken}`;
   
   await sgMail.send({
     to: email,
     from: 'noreply@yourcompany.com',
     subject: 'You have been invited to join SiteProc',
     html: `
       <p>You have been invited to join as a ${role}.</p>
       <p><a href="${invitationUrl}">Click here to accept the invitation</a></p>
       <p>This link expires in 7 days.</p>
     `
   });
   ```

5. **Create acceptance page** at `src/app/accept-invitation/page.tsx`:
   - Read token from URL
   - Verify token is valid and not expired
   - Allow user to set password
   - Create auth user account
   - Link to company via company_id from invitation
   - Mark invitation as 'accepted'

## For Now (Manual Process)
Until email is set up, you can:
1. Create invitations in Settings → Users
2. Manually check the `user_invitations` table in Supabase
3. Share the invitation token with users manually
4. Or manually create user accounts in Supabase Authentication

## Database Query to Check Invitations
```sql
SELECT 
  email,
  role,
  status,
  invitation_token,
  expires_at,
  created_at
FROM user_invitations
WHERE status = 'pending'
ORDER BY created_at DESC;
```
