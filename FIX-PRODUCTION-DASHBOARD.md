# STEP-BY-STEP: Fix Production Dashboard

## Current Situation
- ✅ Local database (vrkgtygzcokqoeeutvxd) has TestCo with 3 projects, $2.65M budget
- ❌ Production Vercel is pointing to a DIFFERENT empty database (gjstirrsnkqxsbolsufn)
- ❌ Dashboard shows $0 and 0 projects because production database is empty

## Solution: Point Vercel to the Correct Database

### Step 1: Open Vercel Project Settings
1. Go to: https://vercel.com/dashboard
2. Click on your **siteproc** project
3. Click **Settings** (top menu)
4. Click **Environment Variables** (left sidebar)

### Step 2: Update Environment Variables
You need to UPDATE (not add) these 3 variables:

#### Variable 1: NEXT_PUBLIC_SUPABASE_URL
- **Current value**: https://gjstirrsnkqxsbolsufn.supabase.co (WRONG - empty DB)
- **New value**: https://vrkgtygzcokqoeeutvxd.supabase.co (CORRECT - has data)
- Click **Edit** → Paste new value → **Save**

#### Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY  
- **Current value**: (points to gjstirrsnkqxsbolsufn)
- **New value**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4Njc2NjIsImV4cCI6MjA3MTQ0MzY2Mn0.rBYMsJmz0hGNDpfSa2zd6U8KeBpNSgzCwF8H_2P9LYQ
- Click **Edit** → Paste new value → **Save**

#### Variable 3: SUPABASE_SERVICE_ROLE
- **Current value**: (points to gjstirrsnkqxsbolsufn)
- **New value**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI
- Click **Edit** → Paste new value → **Save**

### Step 3: Redeploy
1. Go to **Deployments** tab (top menu)
2. Find the latest deployment
3. Click the **...** (three dots) button
4. Click **Redeploy**
5. Wait for "Building..." → "Ready" (1-2 minutes)

### Step 4: Verify the Fix
1. Visit: `https://your-site.vercel.app/api/debug/env-check`
2. Check that `supabaseUrl` now shows `vrkgtygzcokqoeeutvxd`
3. Go to the dashboard
4. Hard refresh (Ctrl+Shift+R)
5. You should now see:
   - **Total Projects: 3**
   - **Total Budget: $2,650,000**
   - Charts populated with data

## Why This Fixes It
- You accidentally had TWO Supabase projects
- Local development was using the one WITH data
- Production was using the one WITHOUT data
- By updating Vercel to use the same database as local, everything will work

## Need Help?
If you can't find the Edit button in Vercel, you can DELETE the old variables and ADD new ones with the same names and values above.
