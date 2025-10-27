# 🏗 SITEPROC MASTER PLAN v2.0 (Complete Integration)

---

## ⚙️ Phase 0 — Pre-flight (System Audit & Setup)
**Goal:** Launch and verify system core readiness before new features.

### ✅ Tasks
- Run full app; log all build/runtime errors and failing data fetches for:
  - Deliveries, Orders, Projects, Expenses, Payments, Products, Reports, Activity Log
- Output to table:
  | Page | Query/Endpoint | Result | Error | Fix Proposal |
- Verify Supabase connections, RLS, and email (SendGrid)
- Set timezone: US (MM/DD/YYYY)
- Confirm Supabase API keys, env vars, and auth roles:
  - Admin / Client / Contractor / Accountant

---

## 🚚 Phase 1 — Core Completion (Modules Finalization)
**Goal:** Finalize all main modules for business operations.

### ✅ Modules
- **Deliveries**
  - Flow: Pending → In Transit → Delivered
  - Date/time stamps per status (US format)
  - Auto-log updates in Activity Log
- **Orders & Products**
  - Product management + cost tracking
  - Link orders to projects/deliveries
- **Expenses**
  - Supplier, category, notes
  - Link to project summaries
- **Payments**
  - Replace Stripe with Manual/Counter Payment
  - Auto PDF invoice + accountant-ready report
  - Sync with Reports
- **Reports**
  - Export to PDF / CSV
  - Daily, weekly, monthly summaries
- **Activity Log**
  - Record user actions (who/what/when)
  - Timestamp (Asia/Bangkok or US mode)

---

## 💼 Phase 2 — Client, Contractor & Bids System
**Goal:** Build full operational ecosystem between all roles.

### ✅ Modules
- **Bids Page**
  - Contractor → submit bid (linked to project)
  - Client → approve/reject/view
  - Auto-updates Project + Payment
- **Contractor Management**
  - Dashboard: jobs, earnings, delivery progress
  - Linked profiles
- **Client Management**
  - Project, payments, and reports view
  - Feedback form per completed project
- **Role-Based Access (CRM Base)**
  - Roles: Admin / Contractor / Client / Accountant
  - Route-level access via Supabase policies

---

## 📱 Phase 3 — PWA + Messaging Automation
**Goal:** Make SiteProc installable, mobile-friendly, and connected in real time.

### ✅ Features
- **PWA Integration**
  - Service workers for offline access
  - Add-to-Home-Screen support
  - Splash screen + app icon
  - Cache key pages (Projects, Orders, Reports)
- **Push Notifications**
  - Triggered by: delivery update, bid status, payment receipt
  - Admin panel for logs
- **WhatsApp Automation (MessageBird API)**
  - Auto-send messages to clients/contractors:
    - New bids, invoices, or delivery updates
  - User-configurable notification settings

---

## 💰 Phase 4 — Accounting & Cloud Integration
**Goal:** Connect SiteProc to external accounting and storage systems.

### ✅ Features
- **QuickBooks Online Integration**
  - Sync invoices, expenses, payments
  - Map clients to customers, contractors to vendors
  - Export CSV/QBO for accountants
  - Real-time webhook updates
- **Cloud File Storage**
  - Upload PDFs, images, contracts per project
  - Store in Supabase Storage or Google Drive
  - In-app document viewer
- **Payout Automation**
  - (Optional) Payoneer/PayPal API integration
  - Track payout: Pending / Paid / Reconciled
  - Auto-sync with Reports + QuickBooks

---

## 📊 Phase 5 — Analytics, AI & Insights
**Goal:** Transform SiteProc into a smart, data-driven platform.

### ✅ Features
- **Analytics Dashboard**
  - Monthly revenue, expenses, profits
  - Contractor performance charts
  - Active vs. completed project metrics
  - Export to PDF
- **Smart AI Reporting (Future Add-On)**
  - Generate summaries:
    - "Show last month's material spend per project."
  - Predictive cost analysis via Supabase Edge Functions + AI
- **Voice Command Access (Optional)**
  - "Hey SiteProc" mode for mobile PWA

---

## 🧠 Final Deliverables Overview
| Category | Description |
|-----------|--------------|
| Frontend | Next.js 14 + Tailwind + PWA |
| Backend | Supabase (Postgres + RLS) |
| APIs | MessageBird, QuickBooks, Payoneer (optional) |
| Integrations | SendGrid, Google Drive, PDF/CSV Export |
| Reports | Accountant-ready auto summaries |
| Notifications | Push + WhatsApp + Email |
| User Roles | Admin / Contractor / Client / Accountant |
| Deployment | Vercel (Main), US + Asia regions |

---

## ✅ Master Plan v2.0 Summary
| Phase | Focus | Add-ons Included |
|--------|--------|------------------|
| 0 | Pre-flight setup & error fixes | US/Asia format, environment check |
| 1 | Core completion | Manual pay, accountant reports |
| 2 | CRM & bids | Contractor/client roles |
| 3 | PWA + automation | Offline, push, WhatsApp |
| 4 | Accounting & cloud | QuickBooks, Drive, payouts |
| 5 | AI & analytics | Dashboard, predictive reports |

---

## 📋 Current Progress Tracker

### ✅ Completed (Latest Session)
- [x] Phase 1: Core Stability (17 bug fixes)
- [x] Notification System (database schema + UI components + real-time)
- [x] Mobile Responsiveness (bottom nav + "More" menu + 2-column layouts)
- [x] Dashboard mobile optimization
- [x] Projects page mobile optimization
- [x] Orders page mobile optimization
- [x] UPDATE-NOTIFICATIONS-SAFE.sql script created and executed

### 🚧 In Progress
- [ ] Phase 0: Pre-flight System Audit (recommended next)
- [ ] Phase 1: Core Completion modules
- [ ] Phase 2: Client, Contractor & Bids System

### ⏳ Pending
- [ ] Phase 3: PWA + Messaging Automation
- [ ] Phase 4: Accounting & Cloud Integration (QuickBooks 40% complete)
- [ ] Phase 5: Analytics, AI & Insights

---

## 🎯 Recommended Next Steps

### Option 1: Phase 0 - System Audit (Recommended)
**Why:** Identify and fix all existing issues before building new features
**Time:** 1-2 hours
**Tasks:**
1. Run full app audit across all pages
2. Document all errors in structured table
3. Fix critical issues (RLS, data fetching, auth)
4. Verify environment setup (Supabase, SendGrid)
5. Standardize timezone and date formats (US: MM/DD/YYYY)

### Option 2: Phase 1 - Core Completion
**Why:** Finalize essential business modules
**Time:** 3-5 hours
**Priority Modules:**
1. Activity Log (auto-tracking system)
2. Deliveries (status flow + timestamps)
3. Payments (manual payment system + PDF invoices)
4. Reports (PDF/CSV export)

### Option 3: Phase 3 - PWA Setup
**Why:** Make app installable and mobile-friendly
**Time:** 2-3 hours
**Tasks:**
1. Configure PWA manifest and service workers
2. Set up push notifications
3. Add offline caching for key pages
4. Test add-to-home-screen functionality

---

## 📞 Integration APIs Required

### Immediate Setup Needed
- [ ] **SendGrid** - Email notifications (API key needed)
- [ ] **MessageBird** - WhatsApp automation (Phase 3)
- [ ] **QuickBooks Online** - Accounting sync (Phase 4)

### Optional Integrations
- [ ] **Payoneer/PayPal** - Payout automation (Phase 4)
- [ ] **Google Drive** - Cloud file storage (Phase 4)
- [ ] **AI Service** - Smart reporting (Phase 5)

---

## 🔧 Technical Requirements

### Current Stack
- **Framework:** Next.js 15.5.0 (App Router)
- **Database:** Supabase PostgreSQL
- **Styling:** Tailwind CSS
- **Deployment:** Vercel
- **Auth:** Supabase Auth

### Additional Dependencies Needed
```bash
# Phase 3 - PWA
npm install next-pwa workbox-webpack-plugin

# Phase 4 - QuickBooks
npm install node-quickbooks

# Phase 4 - PDF Generation
npm install jspdf jspdf-autotable react-to-pdf

# Phase 3 - WhatsApp
npm install messagebird
```

---

## 🎨 Design System Notes

### Mobile-First Approach
- Bottom navigation for primary pages (✅ Implemented)
- "More" menu for additional features (✅ Implemented)
- 2-column grid layouts on mobile (✅ Implemented for Dashboard, Projects, Orders)
- Responsive padding and typography
- Safe area support for notched devices

### Role-Based UI
- **Admin:** Full access to all features
- **Contractor:** Jobs, earnings, deliveries
- **Client:** Projects, payments, reports
- **Accountant:** Financial reports, exports, QuickBooks sync

---

## 📝 Notes & Decisions

### Recent Changes
- ✅ Removed analytics charts (May 2025) - Will revisit after data structure finalized
- ✅ Notification system database ready - Email integration pending
- ✅ Mobile UI complete with bottom nav - Expenses page still needs optimization

### Architecture Decisions
- Using Supabase RLS for security (no custom middleware)
- Manual payment system instead of Stripe (client requirement)
- US date format (MM/DD/YYYY) as default
- Activity log auto-tracks all major user actions

### Future Considerations
- Voice command access (Phase 5 - Optional)
- AI-powered cost predictions (Phase 5)
- Multi-region deployment (US + Asia)
- Offline-first PWA architecture

---

**Last Updated:** January 2025  
**Version:** 2.0  
**Status:** Active Development
