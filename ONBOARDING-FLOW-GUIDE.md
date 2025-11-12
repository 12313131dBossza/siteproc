# ONBOARDING FLOW - COMPLETE GUIDE

## Overview
Users can either **create a new company** or **join an existing company** through invite links. This ensures every user has a company before accessing the app.

---

## User Flows

### Flow 1: New User Signs Up & Creates Company

1. **Sign Up** → User creates account at `/signup`
2. **Auto-redirect** → Middleware detects no `company_id`, redirects to `/onboarding`
3. **Create Company** → User enters company name (e.g., "ABC Construction")
4. **Profile Updated** → User gets `company_id` + `role: 'admin'`
5. **Dashboard Access** → Redirected to `/dashboard` with full access

### Flow 2: New User Joins Existing Company (Invite Link)

1. **Receive Invite** → Admin shares link: `https://siteproc1.vercel.app/onboarding?c=COMPANY_ID`
2. **Sign Up/Login** → User creates account or logs in
3. **Auto-fill** → Onboarding page auto-fills company ID from URL `?c=` parameter
4. **Join Company** → User clicks "Accept Invitation & Join"
5. **Profile Updated** → User gets `company_id` + `role: 'member'`
6. **Dashboard Access** → Redirected to `/dashboard` as team member

### Flow 3: Existing User Joins Manually

1. **No Invite Link** → User goes to `/onboarding`
2. **Manual Entry** → User pastes company ID from admin
3. **Join Company** → Clicks "Join Company"
4. **Profile Updated** → Assigned to company as `role: 'member'`
5. **Dashboard Access** → Redirected to `/dashboard`

---

## Key Components

### 1. **Onboarding Page** (`/src/app/onboarding`)

**Location:** `src/app/onboarding/ui.tsx`

**Features:**
- ✅ Auto-detects invite links (URL parameter `?c=COMPANY_ID`)
- ✅ Two options: Create Company OR Join Company
- ✅ Modern, responsive UI with gradients and icons
- ✅ Clear error messages
- ✅ Loading states during API calls

**URL Parameters:**
- `?c=<COMPANY_ID>` - Pre-fills company ID for joining

### 2. **Middleware Protection** (`/src/middleware.ts`)

**Auto-redirects:**
```typescript
Logged out user → /login
Logged in user without company → /onboarding
Logged in user with company → Allowed through
```

**Protected Routes:**
- `/dashboard`
- `/projects`
- `/orders`
- `/deliveries`
- `/suppliers`
- `/settings`
- `/admin`

### 3. **Invite Link Component** (`/src/components/settings/InviteLink.tsx`)

**Features:**
- ✅ Shows full URL: `https://siteproc1.vercel.app/onboarding?c=COMPANY_ID`
- ✅ One-click copy to clipboard
- ✅ Visual feedback on copy
- ✅ Shows company name
- ✅ Help text explaining member role assignment

**Access:** Admins and Managers only
**Location:** Settings → Invite Teammates

### 4. **API Endpoints**

#### Create Company
```
POST /api/onboarding/create-company
Body: { name: "ABC Construction" }
Response: { ok: true, companyId: "..." }
```

- Creates new company
- Assigns user as `admin`
- Sets `company_id` on user profile

#### Join Company
```
POST /api/onboarding/join
Body: { companyId: "uuid-here" }
Response: { ok: true }
```

- Validates company exists
- Assigns user as `member`
- Updates `company_id` on user profile

---

## Database Schema

### profiles table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,              -- matches auth.users.id
  email TEXT,
  company_id UUID REFERENCES companies(id),  -- NULL if not onboarded
  role TEXT,                        -- 'admin', 'manager', 'member', 'viewer'
  username TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### companies table
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Admin Workflow: Inviting Team Members

### Step 1: Generate Invite Link
1. Go to **Settings** → **Invite Teammates**
2. Copy the invite link (includes your company ID)
3. Share via email, Slack, Teams, etc.

### Step 2: Team Member Receives Link
Example: `https://siteproc1.vercel.app/onboarding?c=abc-123-uuid`

### Step 3: Team Member Joins
1. Clicks link → Taken to onboarding page
2. Company ID is auto-filled
3. Clicks "Accept Invitation & Join"
4. Gets access immediately

### Step 4: Manage Team Member (Optional)
1. Go to **Settings** → **Team Members**
2. Change their role (member → manager → admin)
3. Remove access if needed

---

## Data Isolation Guarantees

### How It Works
Every database query filters by `company_id`:

```sql
SELECT * FROM expenses 
WHERE company_id = '[USER_COMPANY_ID]'
```

### RLS (Row Level Security)
Policies ensure users only see data from their company:

```sql
CREATE POLICY expenses_select_company 
ON expenses FOR SELECT 
USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
```

### Middleware Check
```typescript
// In middleware.ts
if (!profile?.company_id) {
  return redirect('/onboarding')  // Force onboarding
}
```

---

## Testing the Flow

### Test 1: New User Creates Company
```bash
1. Sign up at /signup
2. Should auto-redirect to /onboarding
3. Create company "Test Company"
4. Should redirect to /dashboard
5. Check Settings → Invite to see invite link
```

### Test 2: Invite Link Join
```bash
1. Admin copies invite link from Settings → Invite
2. Send link to new user
3. New user signs up
4. Should see pre-filled company ID
5. Clicks "Accept Invitation"
6. Should join company as member
```

### Test 3: Manual Join
```bash
1. New user signs up
2. Goes to /onboarding
3. Manually enters company ID
4. Clicks "Join Company"
5. Should join successfully
```

---

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

---

## Security Considerations

### ✅ Protected
- All routes require authentication (middleware)
- Users without company cannot access app features
- RLS policies prevent cross-company data access
- Service role key used server-side only

### ✅ Validation
- Company ID validated before join
- Duplicate company assignments prevented
- Profile creation on signup (trigger)
- Company existence checked

### ⚠️ Future Enhancements
1. **Email invitations** - Send invite via email instead of manual link sharing
2. **Invite expiration** - Time-limited invite tokens
3. **Approval workflow** - Admin approves join requests
4. **Domain-based auto-join** - Users with `@company.com` auto-join
5. **SSO integration** - Single Sign-On for enterprise

---

## Deployment Checklist

- [x] Onboarding UI updated with modern design
- [x] Middleware checks for company_id
- [x] Invite link component improved
- [x] URL parameter parsing (?c=COMPANY_ID)
- [x] API endpoints working
- [x] Database triggers for profile creation
- [x] RLS policies enabled
- [x] Data isolation verified
- [ ] Deploy to Vercel
- [ ] Test complete flow in production
- [ ] Share invite link with team

---

## Support

If users have issues:
1. Check they completed onboarding
2. Verify `company_id` is set in database
3. Check RLS policies are enabled
4. Review middleware logs
5. Contact: support@siteproc.com

---

## Quick Reference

| Action | URL | Who Can Access |
|--------|-----|----------------|
| Create Company | `/onboarding` | Any authenticated user without company |
| Join Company | `/onboarding?c=COMPANY_ID` | Any authenticated user |
| Generate Invite | `/settings/invite` | Admin, Manager only |
| Dashboard | `/dashboard` | Users with company only |

---

**Last Updated:** November 12, 2025
**Status:** ✅ Ready for Production
