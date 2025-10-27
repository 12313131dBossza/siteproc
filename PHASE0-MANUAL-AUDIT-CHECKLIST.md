# 🏗 PHASE 0 - MANUAL SYSTEM AUDIT CHECKLIST

**Date Started:** ${new Date().toLocaleDateString()}  
**Auditor:** SiteProc Team  
**Server:** http://localhost:3000

---

## 📋 PAGE AUDIT CHECKLIST

Visit each page and check for:
- ✅ Page loads successfully
- ✅ No console errors
- ✅ Data displays correctly
- ✅ All actions work (buttons, forms, etc.)
- ❌ Any errors or issues

### Core Pages

| # | Page | Route | Status | Data Loads | Errors Found | Notes |
|---|------|-------|--------|------------|--------------|-------|
| 1 | **Dashboard** | `/dashboard` | ⏳ | ⏳ | | Main stats, charts, recent activity |
| 2 | **Projects** | `/projects` | ⏳ | ⏳ | | List, create, edit projects |
| 3 | **Orders** | `/orders` | ⏳ | ⏳ | | Purchase orders management |
| 4 | **Deliveries** | `/deliveries` | ⏳ | ⏳ | | Delivery tracking and status |
| 5 | **Expenses** | `/expenses` | ⏳ | ⏳ | | Expense tracking and approval |
| 6 | **Payments** | `/payments` | ⏳ | ⏳ | | Payment records and invoices |
| 7 | **Products** | `/products` | ⏳ | ⏳ | | Product catalog management |
| 8 | **Reports** | `/reports` | ⏳ | ⏳ | | Financial and operational reports |
| 9 | **Activity Log** | `/activity` or `/activity-log` | ⏳ | ⏳ | | User activity tracking |
| 10 | **Clients** | `/clients` | ⏳ | ⏳ | | Client management |
| 11 | **Contractors** | `/contractors` | ⏳ | ⏳ | | Contractor management |
| 12 | **Bids** | `/bids` | ⏳ | ⏳ | | Bid submissions and approvals |
| 13 | **Companies** | `/co` or `/companies` | ⏳ | ⏳ | | Company management |
| 14 | **Change Orders** | `/change-orders` | ⏳ | ⏳ | | Project change orders |
| 15 | **Settings** | `/settings` | ⏳ | ⏳ | | User and system settings |
| 16 | **Notifications** | `/notifications` | ⏳ | ⏳ | | Notification center |

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Authentication Test
- [ ] Can log in successfully
- [ ] Can log out successfully  
- [ ] Session persists on page refresh
- [ ] Protected routes redirect to login when not authenticated
- [ ] Auth tokens are valid in Supabase

### Role-Based Access Control (RLS)
Test with different user roles:

**Admin Role:**
- [ ] Can access all pages
- [ ] Can view all projects/orders
- [ ] Can edit all data
- [ ] Can delete records

**Client Role:**
- [ ] Can view own projects
- [ ] Cannot see other clients' data
- [ ] Can submit orders
- [ ] Cannot access admin features

**Contractor Role:**
- [ ] Can view assigned jobs
- [ ] Can update delivery status
- [ ] Can submit bids
- [ ] Cannot see other contractors' data

**Accountant Role:**
- [ ] Can view financial reports
- [ ] Can access payments and expenses
- [ ] Cannot edit project data
- [ ] Can export to QuickBooks

---

## 🗄️ DATABASE CHECKS

### Supabase Connection
- [ ] NEXT_PUBLIC_SUPABASE_URL is set
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY is set
- [ ] SUPABASE_SERVICE_ROLE_KEY is set (for admin operations)
- [ ] Connection test successful

### Critical Tables Exist
Check in Supabase Dashboard → Table Editor:

- [ ] `profiles` - User profiles
- [ ] `companies` - Company records
- [ ] `projects` - Projects
- [ ] `orders` - Purchase orders
- [ ] `deliveries` - Delivery tracking
- [ ] `delivery_items` - Delivery line items
- [ ] `expenses` - Expense tracking
- [ ] `payments` - Payment records
- [ ] `products` - Product catalog
- [ ] `clients` - Client records
- [ ] `contractors` - Contractor records
- [ ] `bids` - Bid submissions
- [ ] `change_orders` - Project change orders
- [ ] `notifications` - Notification system
- [ ] `notification_preferences` - User notification settings
- [ ] `activity_logs` - Activity tracking (if exists)
- [ ] `quickbooks_sync` - QuickBooks integration (if exists)

### Row Level Security (RLS)
Check in Supabase Dashboard → Authentication → Policies:

- [ ] All tables have RLS enabled
- [ ] SELECT policies exist for each role
- [ ] INSERT policies prevent unauthorized creates
- [ ] UPDATE policies prevent unauthorized edits
- [ ] DELETE policies prevent unauthorized deletions

---

## 🌐 API & INTEGRATIONS

### Environment Variables
Check `.env.local` file:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=______________
NEXT_PUBLIC_SUPABASE_ANON_KEY=______________
SUPABASE_SERVICE_ROLE_KEY=______________

# Optional (for Phase 3+)
SENDGRID_API_KEY=______________
MESSAGEBIRD_API_KEY=______________
QUICKBOOKS_CLIENT_ID=______________
QUICKBOOKS_CLIENT_SECRET=______________
```

Status:
- [ ] Supabase URL configured
- [ ] Supabase Anon Key configured
- [ ] Supabase Service Role Key configured
- [ ] SendGrid API Key configured (optional)
- [ ] MessageBird API Key configured (optional)
- [ ] QuickBooks credentials configured (optional)

### Email Service
- [ ] SendGrid is configured (if available)
- [ ] Test email can be sent
- [ ] Email templates exist
- [ ] Notification emails trigger correctly

---

## 📱 MOBILE RESPONSIVENESS

Test on mobile device or browser DevTools (iPhone 12 Pro size):

- [ ] Dashboard displays correctly (2-column layout)
- [ ] Projects page displays correctly (2-column layout)
- [ ] Orders page displays correctly (2-column layout)
- [ ] Expenses page displays correctly
- [ ] Bottom navigation works
- [ ] "More" menu opens correctly
- [ ] All forms are usable on mobile
- [ ] Tables scroll horizontally if needed
- [ ] Touch targets are adequate (44x44px minimum)

---

## 🕐 TIMEZONE & DATE FORMAT

### Current Configuration
- [ ] Check what timezone is used in the app
- [ ] Check date format (should be MM/DD/YYYY for US)

### Required Changes
- [ ] Set timezone to US timezone (e.g., America/New_York)
- [ ] Standardize all dates to MM/DD/YYYY format
- [ ] Update date display components
- [ ] Update date picker components
- [ ] Ensure database timestamps use TIMESTAMPTZ

### Files to Check
- `src/lib/utils.ts` - Date formatting utilities
- `src/components/**/*` - All components that display dates
- Database queries with date filters

---

## 🐛 COMMON ERRORS TO LOOK FOR

### Browser Console Errors
- [ ] No React hydration errors
- [ ] No "Cannot read property of undefined" errors
- [ ] No Supabase auth errors
- [ ] No CORS errors
- [ ] No 404 errors for missing resources

### Network Tab Issues
- [ ] All API calls return 200 OK
- [ ] No 401 Unauthorized errors
- [ ] No 500 Internal Server errors
- [ ] Supabase queries complete successfully
- [ ] Image assets load correctly

### Data Fetching Issues
- [ ] Data loads on page mount
- [ ] Loading states display correctly
- [ ] Empty states display when no data
- [ ] Error messages display on failures
- [ ] Retry mechanisms work

---

## 📊 TESTING PROCEDURES

### 1. Fresh User Test
Create a new test user account:
- [ ] Sign up process works
- [ ] Email verification (if enabled)
- [ ] Default company/profile created
- [ ] User can access dashboard
- [ ] No data from other users visible

### 2. Data Flow Test
Test complete workflows:

**Project → Order → Delivery → Payment**
- [ ] Create new project
- [ ] Create order linked to project
- [ ] Create delivery for order
- [ ] Mark delivery as completed
- [ ] Record payment
- [ ] Verify all linked correctly

**Expense → Approval → Payment**
- [ ] Create expense
- [ ] Submit for approval
- [ ] Approve/reject expense
- [ ] Record payment (if approved)
- [ ] Verify status updates

### 3. Performance Test
- [ ] Dashboard loads in < 3 seconds
- [ ] List pages load in < 2 seconds
- [ ] Forms submit in < 1 second
- [ ] No memory leaks (check DevTools Performance)
- [ ] No infinite re-renders

---

## 🎯 CRITICAL ISSUES (Mark as you find them)

### High Priority (Must Fix Before Phase 1)
| # | Issue | Page/Component | Error Message | Fix Needed |
|---|-------|----------------|---------------|------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

### Medium Priority (Should Fix Soon)
| # | Issue | Page/Component | Error Message | Fix Needed |
|---|-------|----------------|---------------|------------|
| 1 | | | | |
| 2 | | | | |

### Low Priority (Can Fix Later)
| # | Issue | Page/Component | Error Message | Fix Needed |
|---|-------|----------------|---------------|------------|
| 1 | | | | |
| 2 | | | | |

---

## ✅ COMPLETION CRITERIA

Phase 0 is complete when:
- [ ] All 16 core pages load without errors
- [ ] All critical database tables exist with proper RLS
- [ ] Authentication and authorization work correctly
- [ ] Mobile responsiveness is functional
- [ ] Date format is standardized to MM/DD/YYYY (US)
- [ ] All high-priority issues are fixed
- [ ] Environment variables are properly configured
- [ ] No console errors on any page
- [ ] Data flows correctly between related entities

---

## 📝 NOTES & OBSERVATIONS

### Issues Found:
```
[Add issues here as you find them]
```

### Performance Observations:
```
[Add performance notes here]
```

### Recommendations:
```
[Add recommendations for Phase 1]
```

---

## 🚀 NEXT STEPS AFTER PHASE 0

Once Phase 0 is complete, proceed to:
1. **Phase 1** - Core Completion (Activity Log, Deliveries, Payments, Reports)
2. **Phase 2** - Client, Contractor & Bids System
3. **Phase 3** - PWA + Messaging Automation

---

**Audit Status:** ⏳ In Progress  
**Last Updated:** ${new Date().toLocaleString()}  
**Completed By:** ________________  
**Date Completed:** ________________
