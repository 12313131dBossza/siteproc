# 🔧 IMMEDIATE FIX - Schema Cache Issue

## What's Wrong

Your diagnostics show:
- ✅ **Database tables are accessible** (all green)
- ❌ **API endpoints are failing** (all red)

**Root cause:** Supabase's PostgREST API has a **stale schema cache**. The database tables exist, but the API doesn't know about them or recent schema changes.

## Error Messages You're Seeing

1. `/api/purchase_orders`: `Could not find the table 'public.purchase_orders' in the schema cache`
2. `/api/projects`: `column projects.code does not exist`
3. `/api/deliveries`: `column deliveries.total_amount does not exist`

## 🚀 Quick Fix (5 minutes)

### Option 1: Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Left sidebar → SQL Editor
   - Click "New Query"

3. **Copy and paste this SQL script:**
   ```sql
   -- Reload PostgREST schema cache
   NOTIFY pgrst, 'reload schema';
   
   -- Add missing columns if needed
   ALTER TABLE projects ADD COLUMN IF NOT EXISTS code TEXT;
   ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) DEFAULT 0;
   
   -- Reload again after changes
   NOTIFY pgrst, 'reload schema';
   
   SELECT '✅ Schema cache refreshed!' as status;
   ```

4. **Click "Run"**

5. **Wait 30 seconds** for cache to fully reload

6. **Refresh your Health page**
   - Go to: https://siteproc1.vercel.app/diagnostics/health
   - Click "Refresh" button
   - Check if API Endpoints are now green ✓

### Option 2: Run Complete Refresh Script

1. **Open Supabase SQL Editor**

2. **Copy entire file:** `REFRESH-SCHEMA-CACHE.sql` (in your workspace)

3. **Paste and Run**
   - This does comprehensive verification
   - Shows you exactly what columns exist
   - Adds missing columns automatically
   - Forces cache reload

4. **Wait 30 seconds**

5. **Test again**

### Option 3: Restart Supabase Instance (Nuclear option)

If schema cache won't reload:

1. Go to Supabase Dashboard → Settings → Database
2. Click "Pause project"
3. Wait 10 seconds
4. Click "Resume project"
5. Wait 1-2 minutes for full startup
6. Test Health page again

## 📊 How to Verify Fix Worked

After running the fix:

1. **Refresh Health page** → https://siteproc1.vercel.app/diagnostics/health

2. **Check "API Endpoints" section:**
   - `/api/purchase_orders` should be ✓ green
   - `/api/projects` should be ✓ green
   - `/api/deliveries` should be ✓ green

3. **Try the form:**
   - Go to "New Delivery" page
   - Orders dropdown should load
   - Projects dropdown should load

## 🔍 Why This Happened

When you paused/unpaused your project:
- Database tables remained intact ✅
- PostgREST API service restarted with old cached schema ❌
- Schema changes from previous sessions weren't recognized
- API thinks tables are missing or have wrong columns

The `NOTIFY pgrst, 'reload schema'` command forces PostgREST to re-scan the database and update its internal cache.

## ⚠️ If Still Not Working

**After running the SQL and waiting 30 seconds:**

1. **Check if columns were actually added:**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'projects' AND column_name = 'code';
   
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'deliveries' AND column_name = 'total_amount';
   ```

2. **Manually restart PostgREST:**
   - Supabase Dashboard → Settings → API
   - Toggle "Enable Realtime" off and on
   - This forces full restart

3. **Check Supabase logs:**
   - Dashboard → Logs → Postgres Logs
   - Look for errors during schema reload

## 📋 Next Steps After Fix

Once Health page shows all green:

1. ✅ Test "New Delivery" form - orders dropdown should load
2. ✅ Test projects dropdown
3. ✅ Create a test delivery
4. ✅ Continue with Phase 1A Step 5 end-to-end testing

---

## Quick Summary

**Problem:** Schema cache stale after pause/unpause  
**Solution:** `NOTIFY pgrst, 'reload schema';` + add missing columns  
**Time:** 5 minutes  
**File to run:** `REFRESH-SCHEMA-CACHE.sql`  
**Verify:** Health page API endpoints turn green  

🚀 **Run the SQL script now and wait 30 seconds!**
