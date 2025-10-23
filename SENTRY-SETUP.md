# Sentry Error Tracking Setup Guide

## Overview

Sentry is integrated into SiteProc to provide comprehensive error tracking, performance monitoring, and session replay capabilities. This guide will help you set up and configure Sentry for your deployment.

## Features Enabled

- ✅ **Client-side error tracking** - Captures React component errors and browser issues
- ✅ **Server-side error tracking** - Monitors API routes and server components
- ✅ **Edge runtime monitoring** - Tracks errors in Edge Functions and Middleware
- ✅ **Performance monitoring** - Transaction tracing and performance metrics
- ✅ **Session replay** - Record and replay user sessions for debugging (10% sample rate)
- ✅ **Source maps** - Automatic upload for readable stack traces
- ✅ **Error filtering** - Ignores browser extensions, localhost in dev, and common noise
- ✅ **Sensitive data redaction** - Removes tokens, passwords, and auth headers
- ✅ **Error boundaries** - Integrated into Next.js error pages with context tags

## Quick Start

### 1. Create Sentry Account and Project

1. Go to [sentry.io](https://sentry.io) and sign up for a free account
2. Create a new project and select **Next.js** as the platform
3. Note down your **DSN** (Data Source Name) - it looks like:
   ```
   https://abc123def456@o123456.ingest.sentry.io/789012
   ```

### 2. Get Required Credentials

You'll need three pieces of information:

#### A. Public DSN (from project settings)
- Go to **Settings > Projects > [Your Project] > Client Keys (DSN)**
- Copy the DSN URL

#### B. Organization Slug (from organization settings)
- Go to **Settings > General Settings**
- Find your organization slug (e.g., `my-company`)

#### C. Project Slug (from project settings)
- Go to **Settings > Projects**
- Your project slug is in the URL (e.g., `siteproc-production`)

#### D. Auth Token (for source map uploads)
1. Go to **Settings > Account > API > Auth Tokens**
2. Click **Create New Token**
3. Set scopes: `project:releases` and `project:write`
4. Save the token securely

### 3. Configure Environment Variables

Add these variables to your `.env.local` file (for local development) and your deployment platform (Vercel, etc.):

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/your-project-id
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token-here
```

**Important Notes:**
- `NEXT_PUBLIC_SENTRY_DSN` is safe to expose publicly (it's client-side)
- `SENTRY_AUTH_TOKEN` should be kept secret (only for builds)
- Never commit `.env.local` to version control

### 4. Deploy and Verify

#### Local Testing (Development)

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Visit the test error page:
   ```
   http://localhost:3000/test-error
   ```

3. Click the error buttons to trigger test errors

4. Check Sentry dashboard for captured errors (may take 1-2 minutes)

**Note:** In development, Sentry is configured to:
- Ignore errors from `localhost` origins
- Log to console in addition to sending to Sentry
- Disable session replay to reduce noise

#### Production Deployment

1. Add environment variables to your deployment platform:
   - **Vercel**: Project Settings > Environment Variables
   - **AWS**: Environment configuration
   - **Other platforms**: Follow their env var documentation

2. Deploy your application:
   ```bash
   git push origin main
   # or
   vercel --prod
   ```

3. During build, Sentry will:
   - Upload source maps for readable stack traces
   - Create a new release in Sentry
   - Associate errors with the deployment

4. Visit your production site and trigger an error (or use `/test-error` if in dev mode)

5. Check Sentry dashboard to confirm errors are being captured

## Configuration Details

### Error Boundaries

Two error boundaries are configured:

#### 1. Page-Level Error Boundary (`src/app/error.tsx`)
- Catches errors in specific pages/routes
- Provides "Try Again" and "Go to Dashboard" options
- Tags errors with `component: error-boundary`
- Includes error digest and component stack

#### 2. Global Error Boundary (`src/app/global-error.tsx`)
- Catches critical application-wide errors
- Provides "Reload Application" option
- Tags errors with `level: fatal`
- Includes full HTML fallback UI

### What Gets Captured

Sentry will automatically capture:

✅ **JavaScript Errors**
- Unhandled exceptions
- Promise rejections
- React component errors
- API call failures

✅ **Performance Data**
- Page load times
- API response times
- Database query performance
- Component render times

✅ **User Context**
- User ID (if logged in)
- Session information
- Browser and OS
- IP address (anonymized)

❌ **What's Filtered Out**
- Browser extension errors
- Localhost errors in development
- Network errors (offline scenarios)
- Common browser noise (ResizeObserver, etc.)

### Sensitive Data Protection

Sentry is configured to automatically redact:

- **Authorization headers** - Replaced with `[Filtered]`
- **Cookies** - Replaced with `[Filtered]`
- **API keys** (x-api-key header) - Replaced with `[Filtered]`
- **Tokens in URLs** - Removed from breadcrumbs
- **Passwords in forms** - Never captured

## Sentry Dashboard Guide

### Key Areas to Monitor

1. **Issues**
   - View all captured errors
   - Sort by frequency, impact, or recency
   - Assign to team members
   - Mark as resolved or ignored

2. **Performance**
   - View transaction traces
   - Identify slow database queries
   - Analyze API endpoint performance
   - Track web vitals (LCP, FID, CLS)

3. **Releases**
   - Track errors by deployment version
   - Compare error rates between releases
   - See which commit introduced issues

4. **Alerts**
   - Set up notifications for error spikes
   - Get alerted for critical errors
   - Configure Slack/email integrations

### Recommended Alert Rules

Set up these alerts in Sentry:

1. **Critical Error Alert**
   - Condition: Error level = fatal
   - Action: Email and Slack notification immediately

2. **Error Spike Alert**
   - Condition: Error count > 50 in 5 minutes
   - Action: Email notification

3. **New Issue Alert**
   - Condition: First time seeing error
   - Action: Email notification for P0/P1 errors

## Troubleshooting

### Errors Not Appearing in Sentry

1. **Check DSN configuration**
   ```bash
   # Verify env var is set
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```

2. **Check browser console**
   - Should see "Sentry initialized" in dev mode
   - Look for Sentry network requests in DevTools > Network tab

3. **Verify Sentry is initialized**
   - Open browser console
   - Type: `window.Sentry`
   - Should return Sentry object (not undefined)

4. **Check project quota**
   - Free tier: 5,000 errors/month
   - Errors beyond quota are dropped
   - Upgrade plan if needed

### Source Maps Not Working

1. **Verify auth token has correct permissions**
   - Needs: `project:releases` and `project:write`

2. **Check build logs**
   - Should see "Uploading source maps to Sentry..."
   - If missing, check `SENTRY_AUTH_TOKEN` is set

3. **Verify organization and project slugs**
   ```bash
   echo $SENTRY_ORG
   echo $SENTRY_PROJECT
   ```

### Too Many Errors / Noise

1. **Add to ignored errors list**
   - Edit `sentry.client.config.ts`
   - Add pattern to `ignoreErrors` array

2. **Filter specific error types**
   - Use `beforeSend` hook
   - Return `null` to drop event

3. **Adjust sample rate**
   - Edit `sentry.*.config.ts`
   - Lower `tracesSampleRate` (e.g., 0.1 for 10%)

## Cost Management

### Free Tier Limits
- 5,000 errors per month
- 10,000 performance transactions/month
- 50 session replays/month
- 1 GB file storage

### Optimizing Usage

1. **Reduce session replay sampling**
   ```typescript
   // In sentry.client.config.ts
   replaysSessionSampleRate: 0.05, // 5% of sessions
   ```

2. **Reduce performance monitoring**
   ```typescript
   // In sentry.*.config.ts
   tracesSampleRate: 0.1, // 10% of transactions
   ```

3. **Set up better error filtering**
   - Filter out known issues
   - Ignore errors from specific URLs
   - Drop low-priority errors

4. **Use alerts wisely**
   - Only alert on critical issues
   - Use daily digests for minor issues
   - Set up proper on-call rotation

## Best Practices

### 1. Add Context to Errors

```typescript
import * as Sentry from '@sentry/nextjs'

try {
  await riskyOperation()
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'checkout',
      operation: 'payment-processing'
    },
    contexts: {
      payment: {
        orderId: '12345',
        amount: 99.99,
        currency: 'USD'
      }
    }
  })
}
```

### 2. Use Breadcrumbs

```typescript
Sentry.addBreadcrumb({
  category: 'user-action',
  message: 'User clicked submit button',
  level: 'info'
})
```

### 3. Set User Context

```typescript
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name
})
```

### 4. Tag Releases Properly

Use semantic versioning in your releases:
```bash
# In package.json
{
  "version": "1.2.3"
}
```

Sentry will automatically tag errors with this version.

## Next Steps

Once Sentry is fully configured and tested:

1. ✅ **Monitor for one week** - Establish baseline error rates
2. ✅ **Set up alert rules** - Configure notifications
3. ✅ **Train team** - Show team how to use Sentry dashboard
4. ✅ **Establish workflow** - Define error triage process
5. ✅ **Move to Phase 2.2** - Email notifications system

## Resources

- 📖 [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- 📖 [Sentry Best Practices](https://docs.sentry.io/product/best-practices/)
- 📖 [Error Tracking Guide](https://docs.sentry.io/product/issues/)
- 📖 [Performance Monitoring](https://docs.sentry.io/product/performance/)
- 💬 [Sentry Discord Community](https://discord.gg/sentry)

## Support

If you encounter issues:

1. Check [Sentry Status Page](https://status.sentry.io)
2. Search [Sentry Documentation](https://docs.sentry.io)
3. Ask in [Sentry Discord](https://discord.gg/sentry)
4. Contact [Sentry Support](https://sentry.io/support/) (paid plans)

---

**✅ Phase 2.1 Complete**: Sentry error tracking is now fully integrated!

**Next Phase**: [Phase 2.2 - Email Notifications System](OPTION-B-ROADMAP.md#phase-22-email-notifications-system-8-12-hours)
