# Phase 2.3: QuickBooks OAuth Integration Setup

## Current Status: In Progress 🚧

**Goal**: Two-way sync between your app and QuickBooks Online for customers, invoices, and payments.

---

## 📋 Prerequisites

- [ ] QuickBooks Online account (or free developer sandbox)
- [ ] Intuit Developer account
- [ ] Production URL: https://siteproc-1.vercel.app

---

## 🔧 Step 1: Register QuickBooks App (DO THIS FIRST)

### 1.1 Create Developer Account
1. Go to https://developer.intuit.com/
2. Click **"Sign Up"** or **"Sign In"**
3. Use your Intuit account or create a new one

### 1.2 Create Your App
1. Go to **My Apps**: https://developer.intuit.com/app/developer/myapps
2. Click **"Create an app"**
3. Select **"QuickBooks Online and Payments"**
4. Fill in app details:
   - **App Name**: SiteProc Construction Management
   - **Description**: Construction project management with QuickBooks sync
   - **App Type**: Choose appropriate type

### 1.3 Get Your Credentials
After creating the app, you'll get:
- **Client ID**: (copy this - you'll need it)
- **Client Secret**: (copy this - keep it secure)

### 1.4 Configure Redirect URIs
In your app settings, add these Redirect URIs:

**For Local Development:**
```
http://localhost:3000/api/quickbooks/callback
```

**For Production:**
```
https://siteproc-1.vercel.app/api/quickbooks/callback
```

### 1.5 Set App Scopes
Enable these scopes (permissions):
- ✅ `com.intuit.quickbooks.accounting` - Access accounting data
- ✅ `openid` - User authentication
- ✅ `profile` - User profile info
- ✅ `email` - User email

---

## 🔐 Step 2: Environment Variables

Add these to your `.env.local` (local development):

```bash
# QuickBooks OAuth Configuration
QUICKBOOKS_CLIENT_ID=your_client_id_here
QUICKBOOKS_CLIENT_SECRET=your_client_secret_here
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=sandbox  # or 'production'

# QuickBooks API URLs
QUICKBOOKS_AUTHORIZATION_ENDPOINT=https://appcenter.intuit.com/connect/oauth2
QUICKBOOKS_TOKEN_ENDPOINT=https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
QUICKBOOKS_REVOKE_ENDPOINT=https://developer.api.intuit.com/v2/oauth2/tokens/revoke
QUICKBOOKS_API_BASE=https://sandbox-quickbooks.api.intuit.com  # or production URL
```

Add these to **Vercel Environment Variables** (production):

```bash
QUICKBOOKS_CLIENT_ID=your_client_id_here
QUICKBOOKS_CLIENT_SECRET=your_client_secret_here
QUICKBOOKS_REDIRECT_URI=https://siteproc-1.vercel.app/api/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=production
QUICKBOOKS_API_BASE=https://quickbooks.api.intuit.com
```

---

## 🏗️ Architecture Overview

### Database Schema (New Table)
We'll need to store QB tokens and company info:

```sql
-- quickbooks_connections table
CREATE TABLE quickbooks_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  realm_id TEXT NOT NULL,  -- QuickBooks Company ID
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id)
);

-- quickbooks_sync_log table (optional - for tracking)
CREATE TABLE quickbooks_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID REFERENCES quickbooks_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,  -- 'customers', 'invoices', 'payments'
  status TEXT NOT NULL,      -- 'success', 'failed', 'partial'
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### File Structure
```
src/
├── lib/
│   ├── quickbooks.ts          # QB OAuth & API client
│   └── quickbooks-sync.ts     # Data sync functions
├── app/
│   ├── api/
│   │   └── quickbooks/
│   │       ├── authorize/route.ts     # Start OAuth flow
│   │       ├── callback/route.ts      # Handle OAuth callback
│   │       ├── disconnect/route.ts    # Revoke connection
│   │       ├── sync/route.ts          # Manual sync trigger
│   │       └── status/route.ts        # Connection status
│   └── admin/
│       └── quickbooks/
│           └── page.tsx               # Settings & dashboard
```

---

## 🔄 OAuth Flow

```
1. User clicks "Connect to QuickBooks"
   ↓
2. Redirect to QuickBooks authorization page
   ↓
3. User grants permissions
   ↓
4. QuickBooks redirects to callback URL with auth code
   ↓
5. Exchange auth code for access token & refresh token
   ↓
6. Store tokens in database
   ↓
7. Redirect to success page
```

---

## 📊 Data Sync Strategy

### What We'll Sync:

**Projects → QB Customers**
- Map each project to a QB customer
- Sync customer name, email, phone
- Store QB customer ID in projects table

**Orders → QB Invoices**
- Create invoice for approved orders
- Line items from order details
- Link to QB customer

**Payments → QB Payments**
- Record payments against invoices
- Track payment methods
- Update invoice balance

### Sync Triggers:
1. **Manual**: User clicks "Sync Now" button
2. **Automatic**: After order approval (create invoice)
3. **Scheduled**: Nightly cron job (optional)

---

## 🧪 Testing with Sandbox

QuickBooks provides a free sandbox environment:

1. Go to https://developer.intuit.com/app/developer/sandbox
2. Create test company
3. Use sandbox credentials
4. Test OAuth flow
5. Test data sync
6. Verify in QB sandbox dashboard

---

## 🚀 Implementation Checklist

- [ ] Register QuickBooks app
- [ ] Get Client ID & Secret
- [ ] Configure redirect URIs
- [ ] Add environment variables
- [ ] Create database tables
- [ ] Build OAuth utilities
- [ ] Create API endpoints
- [ ] Build admin UI
- [ ] Implement data sync
- [ ] Test in sandbox
- [ ] Deploy to production
- [ ] Connect production account

---

## 📖 API Reference

### QuickBooks OAuth Endpoints

**Authorization URL:**
```
https://appcenter.intuit.com/connect/oauth2
?client_id={CLIENT_ID}
&scope=com.intuit.quickbooks.accounting openid profile email
&redirect_uri={REDIRECT_URI}
&response_type=code
&state={RANDOM_STATE}
```

**Token Exchange:**
```
POST https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {base64(CLIENT_ID:CLIENT_SECRET)}

grant_type=authorization_code
&code={AUTH_CODE}
&redirect_uri={REDIRECT_URI}
```

**Token Refresh:**
```
POST https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
Authorization: Basic {base64(CLIENT_ID:CLIENT_SECRET)}

grant_type=refresh_token
&refresh_token={REFRESH_TOKEN}
```

### QuickBooks API Endpoints

**Base URL (Sandbox):** `https://sandbox-quickbooks.api.intuit.com/v3/company/{REALM_ID}`

**Base URL (Production):** `https://quickbooks.api.intuit.com/v3/company/{REALM_ID}`

**Create Customer:**
```
POST /customer
{
  "DisplayName": "Project Name",
  "PrimaryEmailAddr": {"Address": "client@email.com"},
  "PrimaryPhone": {"FreeFormNumber": "(555) 123-4567"}
}
```

**Create Invoice:**
```
POST /invoice
{
  "CustomerRef": {"value": "123"},
  "Line": [{
    "Amount": 2500.00,
    "DetailType": "SalesItemLineDetail",
    "SalesItemLineDetail": {
      "ItemRef": {"value": "1"}
    }
  }]
}
```

---

## 🛠️ Troubleshooting

### Token Expiration
- Access tokens expire after 1 hour
- Refresh tokens expire after 100 days
- Implement automatic refresh before expiration

### Common Errors

**Error: `invalid_grant`**
- Refresh token expired
- User revoked access
- Solution: Prompt user to reconnect

**Error: `unauthorized_client`**
- Invalid Client ID/Secret
- Check environment variables

**Error: `invalid_redirect_uri`**
- Redirect URI doesn't match registered URIs
- Check app settings

---

## 📚 Resources

- [QuickBooks OAuth 2.0 Guide](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0)
- [QuickBooks API Explorer](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer)
- [QuickBooks Sandbox](https://developer.intuit.com/app/developer/sandbox)
- [Error Codes Reference](https://developer.intuit.com/app/developer/qbo/docs/develop/troubleshooting/error-codes)

---

## ⚠️ Security Notes

1. **Never commit** Client ID/Secret to git
2. Store tokens encrypted in database (consider using Supabase encryption)
3. Use HTTPS only (enforced in production)
4. Implement CSRF protection with state parameter
5. Log all sync operations for audit trail

---

## 🎯 Next Steps

After completing this phase, you'll have:
- ✅ Secure QuickBooks connection
- ✅ Two-way data sync
- ✅ Admin dashboard for monitoring
- ✅ Automatic invoice creation
- ✅ Payment tracking

This sets up perfectly for **Phase 3.1: AI Budget Alerts** which will use this data!
