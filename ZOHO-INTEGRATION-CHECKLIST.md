# Zoho Books Integration Checklist

## 🔍 Issue Found
**Problem:** Expenses created in SiteProc were NOT syncing to Zoho Books.

**Root Cause:** The `createZohoExpense` function existed in `src/lib/zoho.ts` but was **never called** from the expenses API. There was no auto-sync mechanism for Zoho (unlike QuickBooks which had auto-sync).

---

## ✅ Fix Applied

### 1. Created Zoho Auto-Sync Module
**File:** `src/lib/zoho-autosync.ts`
- `autoSyncExpenseToZoho()` - Syncs approved expenses to Zoho Books
- `autoSyncInvoiceToZoho()` - Syncs invoices to Zoho Books  
- `syncAllExpensesToZoho()` - Bulk sync all unsynced expenses
- `isZohoAutoSyncEnabled()` - Check if auto-sync is enabled
- Handles token refresh automatically
- Non-blocking (errors don't break expense creation)

### 2. Updated Expense Creation API
**File:** `src/app/api/expenses/route.ts`
- Added import for `autoSyncExpenseToZoho`
- Auto-syncs to Zoho when expense is created with "approved" status

### 3. Updated Expense Approval API
**File:** `src/app/api/expenses/[id]/approve/route.ts`
- Added import for `autoSyncExpenseToZoho`
- Auto-syncs to Zoho when expense is approved

### 4. Fixed createZohoExpense Function
**File:** `src/lib/zoho.ts`
- Added `getZohoExpenseAccounts()` to fetch valid expense accounts
- Fixed `createZohoExpense()` to dynamically get a valid `account_id`
- Previously had empty `account_id` which caused API failures

### 5. Created Zoho Sync API Endpoint
**File:** `src/app/api/zoho/sync/expenses/route.ts`
- `POST` - Manually sync expenses to Zoho
- `GET` - Get sync status and stats

### 6. Database Migration
**File:** `ADD-ZOHO-SYNC-COLUMNS.sql`
- Adds `zoho_expense_id` column to track synced expenses
- Adds `zoho_synced_at` timestamp
- Adds `zoho_invoice_id` to invoices table

---

## 📋 Deployment Checklist

### Database
- [ ] Run `ADD-ZOHO-SYNC-COLUMNS.sql` in Supabase SQL editor

### Environment Variables (Vercel)
Verify these are set:
- [ ] `ZOHO_CLIENT_ID` - From Zoho API Console
- [ ] `ZOHO_CLIENT_SECRET` - From Zoho API Console
- [ ] `ZOHO_REDIRECT_URI` - Should be `https://siteproc1.vercel.app/api/zoho/callback`
- [ ] `ZOHO_ACCOUNTS_URL` - Optional (defaults to `https://accounts.zoho.com`)
- [ ] `ZOHO_BOOKS_API` - Optional (defaults to `https://www.zohoapis.com/books/v3`)

### Code Deployment
- [ ] Push changes to main branch
- [ ] Verify Vercel deployment successful

### Testing
1. [ ] Go to Settings → Integrations
2. [ ] Click "Connect" on Zoho Books
3. [ ] Authorize the connection
4. [ ] Create a new expense with status "approved"
5. [ ] Check Zoho Books → Purchases → Expenses
6. [ ] Verify expense appears in Zoho

---

## 🧪 Testing Commands

### Check Zoho Connection Status
```bash
curl https://siteproc1.vercel.app/api/zoho/status
```

### Check Sync Status
```bash
curl https://siteproc1.vercel.app/api/zoho/sync/expenses \
  -H "Authorization: Bearer <token>"
```

### Manually Sync All Expenses
```bash
curl -X POST https://siteproc1.vercel.app/api/zoho/sync/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"syncAll": true}'
```

### Sync Specific Expense
```bash
curl -X POST https://siteproc1.vercel.app/api/zoho/sync/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"expenseId": "expense-uuid-here"}'
```

---

## 🔧 Troubleshooting

### Expenses Not Syncing

1. **Check Zoho Connection**
   - Go to Settings → Integrations
   - Zoho should show "Connected to [Organization Name]"
   - If disconnected, reconnect

2. **Check Expense Status**
   - Only "approved" expenses sync to Zoho
   - Pending/rejected expenses don't sync

3. **Check Console Logs**
   - Look for `[Zoho]` or `[Zoho AutoSync]` logs
   - Common errors:
     - "No expense account found" - Zoho org needs expense accounts
     - "Failed to refresh token" - Need to reconnect Zoho
     - "Zoho not connected" - Integration not set up

4. **Check Database**
   - `zoho_expense_id` column should exist on expenses table
   - Run the migration if missing

5. **Manually Trigger Sync**
   - Use the sync API endpoint to force sync
   - Check response for errors

### Token Expired

The auto-sync handles token refresh automatically. If you see token errors:
1. Go to Settings → Integrations
2. Disconnect Zoho
3. Reconnect Zoho
4. This refreshes all tokens

---

## 📊 Sync Workflow

```
[User Creates Expense]
        ↓
[Expense Status = "approved"?]
        ↓ Yes
[Get Zoho Integration]
        ↓
[Token Valid?] → No → [Refresh Token]
        ↓ Yes
[Get Expense Account from Zoho]
        ↓
[Create Expense in Zoho Books]
        ↓
[Save zoho_expense_id to DB]
        ↓
[Done - Expense synced!]
```

---

## 📁 Files Modified

| File | Change |
|------|--------|
| `src/lib/zoho-autosync.ts` | **NEW** - Auto-sync module |
| `src/lib/zoho.ts` | Fixed `createZohoExpense`, added `getZohoExpenseAccounts` |
| `src/app/api/expenses/route.ts` | Added Zoho auto-sync on expense creation |
| `src/app/api/expenses/[id]/approve/route.ts` | Added Zoho auto-sync on approval |
| `src/app/api/zoho/sync/expenses/route.ts` | **NEW** - Manual sync endpoint |
| `ADD-ZOHO-SYNC-COLUMNS.sql` | **NEW** - Database migration |

---

## ✅ Status

- [x] Root cause identified
- [x] Auto-sync module created
- [x] Expense creation API updated
- [x] Expense approval API updated
- [x] Zoho API function fixed
- [x] Manual sync endpoint created
- [x] Database migration created
- [ ] Migration run in production
- [ ] Tested in production
