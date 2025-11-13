# CRITICAL: Missing Vercel Environment Variable

## Problem Identified
The dashboard is showing 0 projects because the **SUPABASE_SERVICE_ROLE** environment variable is likely NOT set in Vercel production.

Without this key, the API cannot bypass RLS (Row Level Security) policies and will see 0 data.

## Solution: Add Environment Variable to Vercel

### Step 1: Get your Service Role Key
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Find **service_role** key (NOT the anon key)
5. Click to reveal and copy it (starts with `eyJ...`)

### Step 2: Add to Vercel
1. Go to https://vercel.com/dashboard
2. Select your **siteproc** project
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name**: `SUPABASE_SERVICE_ROLE`
   - **Value**: (paste the service_role key from Step 1)
   - **Environments**: Select all (Production, Preview, Development)
5. Click **Save**

### Step 3: Redeploy
1. Go to **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

### Step 4: Verify
1. Visit your production site: https://your-site.vercel.app/api/debug/env-check
2. Check that `supabaseServiceRoleSet` is `true`
3. If true, go to the dashboard and hard refresh (Ctrl+Shift+R)
4. You should now see 3 projects and $2,650,000 budget

## Why This Happens
- RLS (Row Level Security) is enabled on the database tables
- Without authentication or service role, the database returns 0 rows
- The service role key bypasses RLS and can see all company data
- Local development works because .env.local has the key
- Production fails because Vercel doesn't have the key

## Quick Check
Visit your production site at: https://your-site.vercel.app/api/debug/env-check

If you see `"supabaseServiceRoleSet": false`, then the fix above will solve it!
