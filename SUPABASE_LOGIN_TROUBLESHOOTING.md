# 🚨 Supabase Login Troubleshooting Guide

## Issue
Getting "Error: Failed to fetch" on login page with `getaddrinfo ENOTFOUND vrkgtygzcokqoeeutvxd.supabase.co`

## Root Cause
The Supabase domain is not resolving. This usually means:
1. ✗ **Supabase project is suspended/deleted** (most likely)
2. ✗ **Project URL is incorrect**
3. ✗ **Database is not enabled**

## Fix Steps

### Step 1: Check Your Supabase Project
1. Go to https://app.supabase.com
2. Log in to your account
3. Look for project: `vrkgtygzcokqoeeutvxd`
4. If it's **suspended** or **missing**, you need to create a new project or restore it

### Step 2: Get Correct Credentials
If the project exists:
1. Click on your project
2. Go to **Settings** → **API**
3. Copy:
   - **Project URL** (should look like `https://xxxxx.supabase.co`)
   - **Anon Key** (public key)
   - **Service Role Key** (private key)

### Step 3: Update `.env.local`
Replace the URLs in `.env.local`:

```bash
# OLD (not working):
NEXT_PUBLIC_SUPABASE_URL=https://vrkgtygzcokqoeeutvxd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# NEW (your correct credentials):
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE=your-service-role-key-here
```

### Step 4: Deploy to Vercel
1. Update `.env.local` locally
2. Run `npm run build` to test locally
3. Push to GitHub: `git add -A && git commit -m "Fix: Update Supabase credentials"`
4. Push: `git push origin main`
5. Vercel will auto-deploy
6. **Important**: Also update Vercel env vars:
   - Go to https://vercel.com
   - Select `siteproc` project
   - Settings → Environment Variables
   - Update: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`

### Step 5: Test Connection
1. After deploy, run: `curl -X POST https://siteproc1.vercel.app/api/auth/test-login -d '{"email":"test@gmail.com"}' -H "Content-Type: application/json"`
2. Should return: `{"ok": true, "message": "Supabase connection is working"}`

### Step 6: Test Login
1. Go to https://siteproc1.vercel.app/login
2. Enter your email
3. Click "Send magic link"
4. Check your email for login link

## Still Not Working?

Run this diagnostic:
```bash
# From repo root:
node test-supabase-connection.js
```

Should show all ✅ if Supabase is configured correctly.

## Quick Reference: Supabase URL Formats

**Valid**: `https://abcdefghijk.supabase.co`  
**Invalid**: `https://vrkgtygzcokqoeeutvxd.supabase.co` ← This one doesn't exist!

## Need Help?

1. Check Supabase dashboard for active projects
2. Verify project is not in "Paused" state
3. Confirm you have a valid Supabase account subscription
4. Check Vercel deployment logs for error messages

---

**Summary**: Your current Supabase project URL does not exist. You need to:
1. Create a new Supabase project OR
2. Use correct credentials for an existing project
3. Update `.env.local` and Vercel env vars
4. Redeploy
