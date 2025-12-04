# 🚀 SiteProc Pre-Launch Checklist

**Date:** December 4, 2025  
**Version:** 1.0  
**Tester:** _______________  

---

## Instructions
1. Go through each test item
2. Mark ✅ for PASS or ❌ for FAIL
3. Add notes for any issues found
4. All items must be ✅ before launch

---

## SECTION 1: Public Pages (No Login Required)

| # | Test | URL | Expected Result | Status | Notes |
|---|------|-----|-----------------|--------|-------|
| 1.1 | Landing page loads | https://siteproc1.vercel.app | Premium landing with "Request Private Demo" CTA | ⬜ | |
| 1.2 | Signup blocked | https://siteproc1.vercel.app/signup | Redirects to homepage (NOT signup form) | ⬜ | |
| 1.3 | Login page clean | https://siteproc1.vercel.app/login | No "Sign up" link visible | ⬜ | |
| 1.4 | Privacy Policy | https://siteproc1.vercel.app/privacy-policy | Shows privacy policy page | ⬜ | |
| 1.5 | Terms of Service | https://siteproc1.vercel.app/terms-of-service | Shows terms of service page | ⬜ | |
| 1.6 | Floating badge | Landing page (bottom-right) | "Personal onboarding only — no self-service" badge | ⬜ | |
| 1.7 | Dashboard preview | Landing page hero section | Blurred with "Live dashboard shown only in private demo" | ⬜ | |
| 1.8 | All CTAs work | Click "Request Private Demo" buttons | Opens Calendly booking page | ⬜ | |

**Section 1 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 2: Authentication

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 2.1 | Invalid email login | Enter fake email + any password | Shows "Username not found" or similar error | ⬜ | |
| 2.2 | Wrong password | Enter valid email + wrong password | Shows "Invalid credentials" error | ⬜ | |
| 2.3 | Valid login | Enter correct email + password | Redirects to /dashboard | ⬜ | |
| 2.4 | Session persists | Refresh page after login | Still logged in, no re-login required | ⬜ | |
| 2.5 | Logout works | Click profile → Logout | Returns to login page, session cleared | ⬜ | |
| 2.6 | Remember me | Check "Remember me", login, close browser, reopen | Still logged in | ⬜ | |

**Section 2 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 3: Dashboard & Navigation

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 3.1 | Dashboard loads | Navigate to /dashboard | Shows stats cards, recent activity, charts | ⬜ | |
| 3.2 | Stats accurate | Check dashboard numbers | Match actual data in system | ⬜ | |
| 3.3 | Sidebar works | Click each menu item | All pages load without error | ⬜ | |
| 3.4 | Mobile menu | Resize to < 768px width | Hamburger menu appears and works | ⬜ | |
| 3.5 | Breadcrumbs | Navigate to nested pages | Breadcrumbs show correct path | ⬜ | |

**Section 3 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 4: Projects Module

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 4.1 | View projects | Go to /projects | List of projects with status badges | ⬜ | |
| 4.2 | Search projects | Use search bar | Filters projects by name | ⬜ | |
| 4.3 | Filter by status | Use status filter dropdown | Shows only matching projects | ⬜ | |
| 4.4 | Create project | Click "New Project", fill form | Project created, appears in list | ⬜ | |
| 4.5 | Edit project | Click project → Edit | Can modify details and save | ⬜ | |
| 4.6 | Project details | Click a project | Shows budget, timeline, milestones, team | ⬜ | |
| 4.7 | Milestones | Add/edit/complete milestone | Milestone updates correctly | ⬜ | |

**Section 4 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 5: Orders Module

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 5.1 | View orders | Go to /orders | List with order numbers, status, amounts | ⬜ | |
| 5.2 | Create order | Click "New Order", fill form | Order created with PO number | ⬜ | |
| 5.3 | Edit order | Click order → Edit | Can modify and save | ⬜ | |
| 5.4 | Change status | Update order status | Status changes, history logged | ⬜ | |
| 5.5 | Filter orders | Filter by status/project/date | Filters work correctly | ⬜ | |
| 5.6 | Order items | Add line items to order | Items saved with quantities/prices | ⬜ | |

**Section 5 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 6: Deliveries Module

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 6.1 | View deliveries | Go to /deliveries | List with delivery status | ⬜ | |
| 6.2 | Create delivery | Click "New Delivery" | Delivery created, linked to order | ⬜ | |
| 6.3 | Update status | Change to In Transit → Delivered | Status updates correctly | ⬜ | |
| 6.4 | Order sync | Mark delivery as Delivered | Order's delivery_progress updates | ⬜ | |
| 6.5 | Upload POD | Upload proof of delivery photo | File uploads, shows in delivery | ⬜ | |
| 6.6 | Delivery notes | Add notes to delivery | Notes saved and visible | ⬜ | |

**Section 6 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 7: Financial (Expenses & Payments)

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 7.1 | View expenses | Go to /expenses | List with amounts, categories | ⬜ | |
| 7.2 | Create expense | Click "New Expense" | Expense created with amount | ⬜ | |
| 7.3 | Attach receipt | Upload receipt image | File attached to expense | ⬜ | |
| 7.4 | View payments | Go to /payments | Payment list with status | ⬜ | |
| 7.5 | Create payment | Click "New Payment" | Payment created | ⬜ | |
| 7.6 | Approve payment | Click approve on pending | Status changes to Approved | ⬜ | |
| 7.7 | Financial reports | Check dashboard totals | Numbers calculate correctly | ⬜ | |

**Section 7 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 8: User Roles & Permissions (CRITICAL)

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 8.1 | View team members | Go to Settings → Team | List of users with roles | ⬜ | |
| 8.2 | 6 roles available | Click to change user role | Shows: Viewer, Editor, Accountant, Manager, Admin, Owner | ⬜ | |
| 8.3 | **Viewer test** | Log in as Viewer role | Can VIEW but NOT create/edit/delete | ⬜ | |
| 8.4 | **Editor test** | Log in as Editor role | Can create/edit but NOT delete | ⬜ | |
| 8.5 | **Accountant test** | Log in as Accountant | Can manage expenses/payments | ⬜ | |
| 8.6 | **Manager test** | Log in as Manager | Can manage projects/orders | ⬜ | |
| 8.7 | **Admin test** | Log in as Admin | Can manage users/settings | ⬜ | |
| 8.8 | **Owner test** | Log in as Owner | Full access to everything | ⬜ | |

**Section 8 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 9: Data Isolation & Security (CRITICAL)

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 9.1 | Can't see other company | Log in as Company A, try Company B project URL | 404 or "Not found" (NOT the data) | ⬜ | |
| 9.2 | API requires auth | Call /api/projects without token | Returns 401 Unauthorized | ⬜ | |
| 9.3 | Dev routes blocked | Try /api/dev/seed in production | Returns 403 Forbidden | ⬜ | |
| 9.4 | Rate limiting | Make 50+ rapid requests | Eventually returns 429 Too Many Requests | ⬜ | |
| 9.5 | HTTPS only | Check URL bar | Shows lock icon, https:// | ⬜ | |

**Section 9 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 10: Activity Log & Audit Trail

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 10.1 | View activity | Go to /activity | Shows recent actions | ⬜ | |
| 10.2 | Create logged | Create an order | New entry in activity log | ⬜ | |
| 10.3 | Update logged | Edit a project | Update entry in activity log | ⬜ | |
| 10.4 | Delete logged | Delete an item | Delete entry in activity log | ⬜ | |
| 10.5 | Filter activity | Filter by type/user/date | Filters work correctly | ⬜ | |
| 10.6 | User attribution | Check activity entries | Shows correct user who performed action | ⬜ | |

**Section 10 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 11: Mobile & PWA

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 11.1 | Mobile responsive | Open on phone or resize browser to mobile | Layout adapts, no horizontal scroll | ⬜ | |
| 11.2 | Touch targets | Tap buttons on mobile | All buttons/links are tappable | ⬜ | |
| 11.3 | Mobile modals | Open any modal on mobile | Modal fits screen, scrollable | ⬜ | |
| 11.4 | PWA installable | Edge/Chrome: Menu → Install | App installs to home screen/desktop | ⬜ | |
| 11.5 | PWA opens | Open installed PWA | No browser bar, app-like experience | ⬜ | |
| 11.6 | Offline indicator | Turn off internet | Shows offline indicator | ⬜ | |

**Section 11 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 12: Supplier Portal

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 12.1 | Supplier login | Log in with supplier account | Redirects to /supplier-portal | ⬜ | |
| 12.2 | View assigned deliveries | Check supplier portal | Shows only their deliveries | ⬜ | |
| 12.3 | Update delivery status | Change delivery to Delivered | Status updates | ⬜ | |
| 12.4 | Upload POD photo | Upload proof of delivery | Photo uploads successfully | ⬜ | |
| 12.5 | Can't access dashboard | Try /dashboard as supplier | Blocked, redirects to supplier portal | ⬜ | |
| 12.6 | Can't see other data | Try /orders, /expenses | Blocked or empty | ⬜ | |

**Section 12 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 13: Client Portal (External Clients)

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 13.1 | Invite client to project | Project → Access → Invite External → Client | Client receives invite email | ⬜ | |
| 13.2 | Client login | Log in with client email | Sees only invited projects | ⬜ | |
| 13.3 | View project progress | Open project as client | Sees %, timeline, milestones | ⬜ | |
| 13.4 | View orders/deliveries | Check orders tab as client | Can view but NOT edit/create | ⬜ | |
| 13.5 | View financial summary | Check expenses as client | Sees totals only, NOT supplier costs | ⬜ | |
| 13.6 | Download documents | Try to download a PDF | Download works | ⬜ | |
| 13.7 | Chat with company | Open messages as client | Can chat in private client thread | ⬜ | |
| 13.8 | Can't edit anything | Try to create/edit/delete | All buttons hidden or blocked | ⬜ | |
| 13.9 | Can't see other projects | Try other project URLs | 404 or blocked | ⬜ | |

**Section 13 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 14: Contractor Portal

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 14.1 | Invite contractor | Project → Access → Invite External → Contractor | Contractor receives invite | ⬜ | |
| 14.2 | Contractor login | Log in with contractor email | Sees assigned deliveries only | ⬜ | |
| 14.3 | View assigned work | Check contractor view | Shows only their deliveries/orders | ⬜ | |
| 14.4 | Update delivery status | Mark item as delivered | Status updates correctly | ⬜ | |
| 14.5 | Upload proof photos | Upload POD for delivery | Photo uploads and visible | ⬜ | |
| 14.6 | Chat with company | Open messages | Can chat in private thread | ⬜ | |
| 14.7 | Can't see financials | Try to access expenses/payments | Blocked, no financial data visible | ⬜ | |
| 14.8 | Can't see other contractors | Check for other contractor data | Only sees their own assignments | ⬜ | |

**Section 14 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 15: Consultant View

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 15.1 | Invite consultant | Project → Access → Invite External → Consultant | Consultant receives invite | ⬜ | |
| 15.2 | Consultant login | Log in with consultant email | Sees project dashboard | ⬜ | |
| 15.3 | View & download docs | Access documents section | Can view/download plans, drawings | ⬜ | |
| 15.4 | Upload documents | Try to upload a file | Can upload reviews/comments | ⬜ | |
| 15.5 | View timeline | Check timeline | Can see project timeline | ⬜ | |
| 15.6 | Chat with company | Open messages | Can chat in private thread | ⬜ | |
| 15.7 | Can't see financials | Try expenses/payments | Blocked, no financial data | ⬜ | |

**Section 15 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 16: Integrations

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 16.1 | QuickBooks settings | Go to Settings → Integrations → QuickBooks | Shows Connect button | ⬜ | |
| 16.2 | QuickBooks connect | Click Connect (if credentials available) | OAuth flow works | ⬜ | |
| 16.3 | **QuickBooks Live Sync** | Create 1 expense + 1 delivery in SiteProc | Both appear in QuickBooks within 60 sec | ⬜ | |
| 16.4 | **QuickBooks Data Check** | Open QuickBooks sandbox | Expense & delivery match amounts/details | ⬜ | |
| 16.5 | Email notifications | Change order status | Email sent to relevant users | ⬜ | |
| 16.6 | Email received | Check inbox | Email arrives with correct content | ⬜ | |

**Section 16 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 17: Billing & Stripe (If Enabled)

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 17.1 | Stripe settings visible | Go to Settings → Billing | Shows current plan + upgrade options | ⬜ | |
| 17.2 | Test card payment | Enter test card 4242 4242 4242 4242 | Payment processes successfully | ⬜ | |
| 17.3 | Upgrade flow | Starter → Pro upgrade | Plan changes, new features unlock | ⬜ | |
| 17.4 | Stripe dashboard check | Open Stripe dashboard | Shows $99/user subscription | ⬜ | |
| 17.5 | Cancel subscription | Cancel plan | Shows downgrade confirmation | ⬜ | |

**Section 17 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 18: Error Handling & Edge Cases

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 18.1 | 404 page | Go to /this-page-does-not-exist | Shows custom 404 page with navigation | ⬜ | |
| 18.2 | Form validation | Submit empty required fields | Shows validation errors, no crash | ⬜ | |
| 18.3 | Invalid data | Submit invalid email format | Shows error message | ⬜ | |
| 18.4 | Large file upload | Try uploading 50MB+ file | Shows file size error | ⬜ | |
| 18.5 | Network error | Disconnect mid-request | Shows error, doesn't crash | ⬜ | |
| 18.6 | Concurrent edits | Edit same item in 2 tabs | Handles gracefully | ⬜ | |

**Section 18 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 19: Performance

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 19.1 | Page load time | Open dashboard, check network tab | < 3 seconds initial load | ⬜ | |
| 19.2 | Large list | View 100+ items | No significant lag | ⬜ | |
| 19.3 | Image loading | View pages with images | Images load progressively | ⬜ | |
| 19.4 | No console errors | Open browser console | No red errors | ⬜ | |

**Section 19 Result:** ⬜ PASS / ⬜ FAIL

---

## SECTION 20: Offline → Sync Magic (PWA Critical)

| # | Test | How to Test | Expected Result | Status | Notes |
|---|------|-------------|-----------------|--------|-------|
| 20.1 | Install PWA on phone | iPhone/Android: Add to Home Screen | App installs successfully | ⬜ | |
| 20.2 | Enable Airplane Mode | Turn on airplane mode on phone | Shows offline indicator | ⬜ | |
| 20.3 | Upload POD photo offline | As supplier, upload proof of delivery photo | Photo queued locally | ⬜ | |
| 20.4 | Mark delivery offline | Change delivery status to Delivered | Change saved locally | ⬜ | |
| 20.5 | Turn Wi-Fi back on | Disable airplane mode | Auto-sync starts | ⬜ | |
| 20.6 | **Confirm sync in web** | Open web dashboard on desktop | Photo + status visible in web dashboard | ⬜ | |
| 20.7 | No data loss | Check all offline changes | Everything synced correctly | ⬜ | |

**Section 20 Result:** ⬜ PASS / ⬜ FAIL

---

## FINAL SUMMARY

| Section | Result |
|---------|--------|
| 1. Public Pages | ⬜ |
| 2. Authentication | ⬜ |
| 3. Dashboard & Navigation | ⬜ |
| 4. Projects | ⬜ |
| 5. Orders | ⬜ |
| 6. Deliveries | ⬜ |
| 7. Financial | ⬜ |
| 8. User Roles (6 internal) | ⬜ |
| 9. Security | ⬜ |
| 10. Activity Log | ⬜ |
| 11. Mobile & PWA | ⬜ |
| 12. Supplier Portal | ⬜ |
| 13. Client Portal | ⬜ |
| 14. Contractor Portal | ⬜ |
| 15. Consultant View | ⬜ |
| 16. Integrations (QuickBooks) | ⬜ |
| 17. Billing (Stripe) | ⬜ |
| 18. Error Handling | ⬜ |
| 19. Performance | ⬜ |
| 20. Offline Sync Magic | ⬜ |

---

## 🏆 PRIORITY TESTS (Your 3 Must-Pass Before Launch)

| Priority | Test | Time | Status |
|----------|------|------|--------|
| 🔴 P1 | **QuickBooks Live Sync** (16.3-16.4): Create expense + delivery → Confirm in QB within 60 sec | 20 min | ⬜ |
| 🔴 P2 | **Stripe Billing E2E** (17.1-17.4): Test card → Upgrade Starter→Pro → Confirm $99/user in Stripe | 15 min | ⬜ |
| 🔴 P3 | **Offline→Sync Magic** (20.1-20.7): Phone offline → Upload POD → Wi-Fi on → Confirm in web | 10 min | ⬜ |

---

## LAUNCH DECISION

**All sections PASS:** ⬜ YES → ✅ **READY TO LAUNCH**

**Any section FAIL:** ⬜ YES → ❌ **FIX ISSUES FIRST**

---

## Issues Found (If Any)

| Issue # | Section | Description | Severity | Fixed? |
|---------|---------|-------------|----------|--------|
| 1 | | | ⬜ Critical / ⬜ Major / ⬜ Minor | ⬜ |
| 2 | | | ⬜ Critical / ⬜ Major / ⬜ Minor | ⬜ |
| 3 | | | ⬜ Critical / ⬜ Major / ⬜ Minor | ⬜ |
| 4 | | | ⬜ Critical / ⬜ Major / ⬜ Minor | ⬜ |
| 5 | | | ⬜ Critical / ⬜ Major / ⬜ Minor | ⬜ |

---

## Sign-Off

**Tested by:** _______________  
**Date:** _______________  
**Approved for Launch:** ⬜ YES / ⬜ NO  

---

## Quick Reference URLs

```
Production App:     https://siteproc1.vercel.app
Landing Page:       https://siteproc1.vercel.app
Login:              https://siteproc1.vercel.app/login
Dashboard:          https://siteproc1.vercel.app/dashboard
Projects:           https://siteproc1.vercel.app/projects
Orders:             https://siteproc1.vercel.app/orders
Deliveries:         https://siteproc1.vercel.app/deliveries
Expenses:           https://siteproc1.vercel.app/expenses
Payments:           https://siteproc1.vercel.app/payments
Contractors:        https://siteproc1.vercel.app/contractors
Activity:           https://siteproc1.vercel.app/activity
Settings:           https://siteproc1.vercel.app/settings
Supplier Portal:    https://siteproc1.vercel.app/supplier-portal
Privacy Policy:     https://siteproc1.vercel.app/privacy-policy
Terms of Service:   https://siteproc1.vercel.app/terms-of-service
```

## External User Types (Access via Project Invite)

| Type | How to Access | What They See |
|------|--------------|---------------|
| **Client** | Invited to project → Viewer permissions | Progress, timeline, documents, summary financials |
| **Supplier** | Invited to project → Delivery-only | Their assigned deliveries, can upload POD |
| **Contractor** | Invited to project → Delivery-only | Their assigned work, can update status |
| **Consultant** | Invited to project → Document-focused | Plans, drawings, can upload comments |

---

*Generated: December 4, 2025*  
*SiteProc v1.0 Launch Checklist - 20 Sections, 100+ Tests*
