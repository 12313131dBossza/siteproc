# 🔍 Database Connection Test Instructions

## Wait for Deployment
Wait **2 minutes** for Vercel to deploy the test endpoint.

## Test the Connection

Open this URL in your browser:
```
https://siteproc1.vercel.app/api/test-db-connection
```

## What to Look For

The response will show:

### ✅ **Good Signs:**
```json
{
  "ok": true,
  "env": {
    "hasUrl": true,
    "hasKey": true
  },
  "results": {
    "profiles": {
      "count": 1,
      "found": "✅ Profile exists"
    },
    "companies": {
      "count": 1
    },
    "purchase_orders": {
      "count": 9
    }
  }
}
```

### ❌ **Bad Signs:**

**Missing Environment Variables:**
```json
{
  "ok": false,
  "error": "Missing Supabase environment variables",
  "env": {
    "hasUrl": false,
    "hasKey": false
  }
}
```
👉 **Fix:** Set environment variables in Vercel dashboard

**Profile Not Found:**
```json
{
  "results": {
    "profiles": {
      "count": 0,
      "found": "❌ Profile not found"
    }
  }
}
```
👉 **Fix:** Run FIX-PROFILE-NOT-FOUND.sql in Supabase

**Connection Error:**
```json
{
  "ok": false,
  "error": "Failed to connect to Supabase",
  "details": "..."
}
```
👉 **Fix:** Check Supabase project is unpaused, check URL/keys

## Next Steps

**After you get the test results**, share them with me and we'll know exactly what's wrong!

This test bypasses all authentication and middleware - it tests the raw database connection.
