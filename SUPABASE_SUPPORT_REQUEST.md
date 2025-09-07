# SUPABASE DATABASE SCHEMA - FOR SUPPORT REQUEST

## Project Information
- **Project Reference**: vrkgtygzcokqoeeutvxd
- **Project URL**: https://vrkgtygzcokqoeeutvxd.supabase.co
- **Application**: SiteProc (Construction Management Platform)
- **Framework**: Next.js 15 with App Router

## Issue Description
We need to efficiently query user email addresses by user ID. Currently using `auth.admin.getUserById()` but wondering about best practices and alternatives.

## Current Users in System
```
Total Users: 8

1. testmysuperbase@gmail.com (ID: 73f7a36d-bcc1-4e44-8e55-6ee783dca6a9)
2. ismelllikepook@gmail.com (ID: b21a0c0d-742e-4d5d-92a4-fc5ad6646583)
3. kuyraikub55501@gmail.com (ID: d41f74af-4453-4e23-aa39-9967581ec111)
4. chayaponyaibandit@gmail.com (ID: 8f4fd2d0-15dc-47c5-bf2b-d9aff4636b1d)
5. thegrindseasonhomie@gmail.com (ID: a32fc527-389d-4ca2-8f87-a58add9ab2e6)
6. yaibondisieie@gmail.com (ID: 0b1b5636-fea8-461a-a88f-3a92edbcbb31)
7. yaibondiseiei@gmail.com (ID: f34e5416-505a-42b3-a9af-74330c91e05b)
8. bossbcz@gmail.com (ID: 35a57302-cfec-48ef-b964-b28448ee68c4)
```

## Database Schema

### auth.users Table (Built-in Supabase)
This is where user emails are primarily stored:
```sql
-- Example user record
{
  "id": "35a57302-cfec-48ef-b964-b28448ee68c4",
  "email": "bossbcz@gmail.com",
  "created_at": "2025-08-26T03:30:51.496002Z",
  "email_confirmed_at": "2025-08-26T03:30:51.518489Z",
  "last_sign_in_at": "2025-09-07T10:45:23.123456Z"
}
```

### public.profiles Table
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,                    -- Sometimes duplicated here
  full_name TEXT,
  role TEXT DEFAULT 'member',    -- viewer|member|bookkeeper|manager|admin|owner
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies Applied
-- Users can view/edit their own profiles
-- Admin users can view all profiles
```

### public.companies Table
```sql
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Current Methods We're Using

### Method 1: Auth Admin API ✅ WORKS
```javascript
const { data: user, error } = await supabase.auth.admin.getUserById(userId);
const email = user?.user?.email;
```

**Pros**: Direct access to auth system, always has email
**Cons**: Requires service role key, unsure about performance/rate limits

### Method 2: Profiles Table ⚠️ INCONSISTENT
```javascript
const { data: profile, error } = await supabase
  .from('profiles')
  .select('email')
  .eq('id', userId)
  .single();
```

**Pros**: Can use with RLS, joins easily with other tables
**Cons**: Email not always synced/stored in profiles

### Method 3: Combined Approach ✅ COMPREHENSIVE
```javascript
// Get auth data
const { data: authUser } = await supabase.auth.admin.getUserById(userId);

// Get profile data  
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name, role, company_id')
  .eq('id', userId)
  .single();

// Combine results
const result = {
  id: authUser.user.id,
  email: authUser.user.email,  // From auth system
  full_name: profile?.full_name, // From profiles
  role: profile?.role
};
```

## Questions for Supabase Support

### 1. Performance & Rate Limits
- What are the rate limits for `auth.admin.getUserById()`?
- Is it efficient to call this method frequently (e.g., for each delivery record display)?
- Should we cache auth user data in our application?

### 2. Best Practices
- Should we duplicate email in the `profiles` table for easier queries?
- Is there a recommended pattern for joining auth.users with public tables?
- Can we create a database view that combines auth.users + profiles?

### 3. Alternative Approaches
- Is there a way to query auth.users directly with SQL (not through Admin API)?
- Can we create a stored procedure/RPC function for this?
- Would Edge Functions be better for user lookups?

### 4. Bulk Operations
- How do we efficiently get emails for multiple user IDs at once?
- Example: Display 20 deliveries, each created by different users

### 5. Security Considerations
- Is it safe to use service role key in our API routes?
- Should we implement additional access controls for user lookups?

## Use Cases in Our Application

### Notification System
```javascript
// We need emails to send notifications
export async function sendDeliveryNotifications(deliveryId: string) {
  const delivery = await getDelivery(deliveryId);
  
  // Need email for delivery creator
  const creatorEmail = await getUserEmail(delivery.created_by);
  
  // Need emails for managers/admins
  const managers = await getManagerUsers();
  for (const manager of managers) {
    const managerEmail = await getUserEmail(manager.id);
    await sendEmail(managerEmail, 'New delivery created...');
  }
}
```

### Audit Trails
```javascript
// Display who created/modified records
const deliveries = await getDeliveries();
for (const delivery of deliveries) {
  delivery.created_by_email = await getUserEmail(delivery.created_by);
  delivery.updated_by_email = await getUserEmail(delivery.updated_by);
}
```

### User Management
```javascript
// Admin panel - show user list with emails
const profiles = await getProfiles();
for (const profile of profiles) {
  profile.email = await getUserEmail(profile.id);
}
```

## Expected Response Volume
- **Users**: ~8-50 users per company
- **API calls**: ~100-500 user lookups per day
- **Concurrent requests**: ~5-10 during peak usage
- **Bulk lookups**: Occasionally need 10-20 emails at once

## Technical Environment
- **Framework**: Next.js 15 (App Router)
- **Deployment**: Vercel
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth with Magic Links
- **Client Types**: SSR client, Anonymous client, Service role client

## Code Examples Provided
1. `supabase-support-code.js` - Comprehensive testing script
2. `nextjs-supabase-demo.ts` - Next.js API route examples  
3. `test-user-lookup.js` - Command-line testing tool

## Expected Supabase Support Response
Please advise on:
1. **Recommended approach** for user email lookups
2. **Performance considerations** for our use case
3. **Alternative patterns** we should consider
4. **Best practices** for auth data + profile data combination
5. **Rate limiting** information for auth.admin methods

Thank you for your support!
