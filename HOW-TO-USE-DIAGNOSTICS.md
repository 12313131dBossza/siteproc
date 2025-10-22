# 🔧 How to Use Diagnostics to Fix Database Issues

## Quick Action Plan

Your project was paused and unpaused, which may have caused database connectivity issues. Follow this guide to diagnose what's wrong.

---

## Step 1: Access the Health Diagnostics Page

**Go to:** https://siteproc1.vercel.app/diagnostics/health

You'll see a dashboard showing:
- ✓ **Overall Status** (OK or ERROR)
- ✓ **Environment Configuration** (Supabase URL, API keys)
- ✓ **Supabase Auth** (connection status, current user)
- ✓ **Database Tables** (profiles, purchase_orders, projects, deliveries)
- ✓ **API Endpoints** (query tests for each table)

---

## Step 2: Identify the Problem

### Symptom: "Loading orders..." stays forever

**Check the Health page for:**

1. **Are you authenticated?**
   - Look at "Supabase Auth" section
   - Should show: `Connected ✓`, `User Exists ✓`, `Logged in as: your@email.com`
   - If NOT authenticated: Logout and login again

2. **Can the database be accessed?**
   - Look at "Database Tables" section
   - Check `purchase_orders` status:
     - ✓ Accessible = Good
     - ✗ Error = Database problem

3. **What's the specific error?**
   - If `purchase_orders` shows red with error message:
     - `PGRST116` = Table missing (shouldn't happen)
     - `permission denied` = RLS policy blocking access
     - `connection timeout` = Database not responding
     - `relation does not exist` = Schema corrupted

4. **Test the API directly**
   - Look at "API Endpoints" section
   - `purchase_orders` should show `✓ OK`
   - If red, read error message

---

## Step 3: Common Fixes by Error Type

### Issue: "Error: PGRST code: '42703', message: 'column not found'"

**Fix:**
Database schema corrupted or PostgREST cache is stale.
1. Try hard refresh: `Ctrl+Shift+Delete` to clear cache
2. Logout and login again
3. If still fails: Contact Supabase support

### Issue: "Error: row level security violation"

**Fix:**
RLS policies blocking your access.
1. Verify you're in the right company (check Session page)
2. Check your user role (should be 'admin', 'owner', or 'member')
3. May need to re-apply RLS policies - contact your admin

### Issue: "Error: connection timeout"

**Fix:**
Database not responding (likely from pause/unpause cycle).
1. Check Supabase dashboard for database status
2. Try refreshing the page (may auto-recover)
3. If persists > 5 minutes: Contact Supabase support

### Issue: All tables show errors

**Fix:**
Environment variables missing or incorrect.
1. Check "Environment" section on Health page
2. If any show `✗ Missing`:
   - Go to Vercel dashboard
   - Project > Settings > Environment Variables
   - Add/verify:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE`
   - Re-deploy project

---

## Step 4: Test Recovery

After applying fixes:

1. **Refresh Health page** (button at top right)
2. **Wait for response** (may take 5-10 seconds)
3. **Check all tables are now green**
4. **Try creating a delivery** - orders dropdown should load

---

## Step 5: If Still Not Working

**Gather this information and contact support:**

1. Screenshot of Health page (all sections)
2. Your email address / user ID
3. Screenshot of Session Check page (click link from Health)
4. What URL you're accessing (local vs vercel)
5. What error message appears in browser console (F12 > Console tab)

---

## Reference: All Diagnostic Endpoints

### Health Check JSON API
```
GET /api/health
```
Returns JSON with all diagnostic data (useful for monitoring/automation)

### Health Check UI Page
```
GET /diagnostics/health
```
Interactive dashboard with color-coded status

### Session Check Page
```
GET /debug/session-check
```
Shows your current authentication status and cookies

---

## What Each Database Table Status Means

| Status | Meaning | Action |
|--------|---------|--------|
| ✓ Accessible (count: 42) | Table works, 42 records exist | Normal - all good |
| ✗ Error: permission denied | RLS policy blocking access | Check user permissions |
| ✗ Error: connection timeout | Database not responding | Refresh page or contact Supabase |
| ✗ Error: relation doesn't exist | Table is missing | Run schema migration |
| ✗ No error but count: 0 | Table is empty but accessible | Normal if new table |

---

## Page Loading Stuck on "Loading orders..."?

This means `/api/orders` endpoint is hanging. Here's the debugging path:

1. **Check Health page** → `purchase_orders` table status
2. **If table is inaccessible**:
   - RLS policy likely blocking access
   - Authentication likely failed
3. **If table is accessible**:
   - Issue might be with API route itself
   - Try redeploying project (git push)
4. **If both look good**:
   - Check your browser console for errors (F12)
   - Look for 500 or timeout errors
   - Screenshot error and contact support

---

## Performance Expectations

**Healthy responses:**
- Health check: 200-500ms
- Single table query: 100-300ms
- Page load: < 2 seconds

**Slow responses (warning signs):**
- Health check: > 2000ms = Connection issues
- Table query: > 5000ms = Database overwhelmed
- Page stuck on "Loading..." > 10 seconds = Something broken

---

## Next Steps

**If diagnostics show everything is green:**
1. Orders dropdown should now load in "New Delivery" form
2. Try creating a test delivery
3. If it works, proceed with Phase 1A Step 5 testing

**If diagnostics shows issues:**
1. Apply appropriate fix from "Step 3: Common Fixes"
2. Refresh Health page to verify fix worked
3. Then try creating delivery again

---

**Need help?** Check the diagnostic error message - it usually tells you exactly what's wrong!
