# Database Diagnostics Guide

## Quick Start

### 1. **Health Check Endpoint** (JSON API)
```
GET /api/health
```

Returns comprehensive diagnostic data including:
- Environment configuration (Supabase URL, keys)
- Authentication status
- Database table accessibility (profiles, orders, projects, deliveries)
- API endpoint query tests
- Response latency metrics

**Direct test command:**
```bash
curl https://siteproc1.vercel.app/api/health | jq '.'
```

### 2. **Health Diagnostics UI Page**
```
https://siteproc1.vercel.app/diagnostics/health
```

Interactive page showing:
- Overall system status (OK/ERROR)
- Environment variables status
- Supabase auth connection
- Individual table accessibility with row counts
- API endpoint functionality

**Features:**
- Refresh button to re-run diagnostics
- Color-coded status (✓ green for OK, ✗ red for errors)
- Error messages for each table/endpoint
- Current user display (if authenticated)
- Response time tracking

### 3. **Session Check Page** (Link from Health page)
```
https://siteproc1.vercel.app/debug/session-check
```

Shows:
- Current user authentication status
- Email of logged-in user
- All cookies present
- Session validity

---

## Troubleshooting Database Connectivity Issues

### Symptom: "Orders dropdown won't load" / "Projects won't load"

**Step 1: Check Health Status**
1. Go to: `https://siteproc1.vercel.app/diagnostics/health`
2. Look at the **Database Tables** section
3. Check if `orders`, `projects`, `deliveries` are marked as "✓ Accessible"

**Step 2: Examine Error Messages**
- If a table shows red "✗ Error", read the error message:
  - `PGRST???`: RLS policy blocking access
  - `connection timeout`: Database not responding
  - `permission denied`: Insufficient role permissions

**Step 3: Check API Endpoints Section**
- `/api/orders` - Should show "✓ OK"
- `/api/projects` - Should show "✓ OK"
- If red, read error message for specific failure

**Step 4: Verify Authentication**
- Click "Session Check" link to verify you're logged in
- Should show your email and at least 3-4 cookies

---

## Common Issues After Project Pause/Unpause

### Issue: All queries timeout or fail

**Possible causes:**
1. Database connection pool exhausted
2. RLS policies need refresh
3. Session credentials stale

**Fix:**
1. Refresh the page: `Ctrl+F5`
2. If still failing, logout and login again
3. Try /api/health endpoint directly in new tab

### Issue: Specific table shows error

**For orders/projects/deliveries tables:**
- Check the specific error in Health page
- If RLS error: Contact Supabase support or check RLS policies
- If connection error: Database may need restart (contact Supabase)

### Issue: Authenticated but orders still don't load

**Diagnostics:**
1. Verify in Session Check page that user IS authenticated
2. Check Health page "Supabase Auth" section - should show:
   - Connected: ✓ Yes
   - User Exists: ✓ Yes
   - Logged in as: [your email]
3. If auth looks good but orders fail:
   - RLS policies may be blocking table access for authenticated users
   - Check Supabase dashboard > Authentication > Row Level Security policies

---

## Real-time Monitoring

After initial diagnostics, visit the Health page periodically to monitor:
- Latency trends (should be < 1000ms)
- Table accessibility stability
- API endpoint performance

---

## API Response Format

### Success Response
```json
{
  "status": "ok",
  "message": "Health check complete",
  "latency_ms": 245,
  "diagnostics": {
    "environment": {
      "url_set": true,
      "anon_key_set": true,
      "service_role_set": true,
      "node_env": "production"
    },
    "supabase": {
      "auth": {
        "connected": true,
        "user_exists": true,
        "user_email": "your@email.com"
      }
    },
    "database": {
      "tables": {
        "profiles": {
          "accessible": true,
          "count": 42,
          "error": null
        },
        "orders": {
          "accessible": true,
          "count": 156,
          "error": null
        }
      }
    },
    "endpoints": {
      "orders": {
        "success": true,
        "count": 156,
        "sample_count": 5,
        "error": null
      }
    }
  }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Health check failed",
  "latency_ms": 5234,
  "diagnostics": {
    "database": {
      "tables": {
        "orders": {
          "accessible": false,
          "error": "relation \"orders\" does not exist"
        }
      }
    }
  }
}
```

---

## Next Steps If Issues Found

1. **All tables failing**: Check environment variables in Vercel settings
2. **Some tables failing**: Check RLS policies for those specific tables
3. **Connection timeouts**: Check Supabase dashboard for database status
4. **Auth issues**: Check Session Check page and verify cookies are being set

If you see errors after project pause/unpause, take a screenshot of the Health page and review the specific error messages to identify the root cause.
