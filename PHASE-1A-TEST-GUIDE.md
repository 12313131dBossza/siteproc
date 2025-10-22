# Phase 1A Step 5: End-to-End Testing Guide

## Test Environment
- **URL:** https://siteproc1.vercel.app
- **User:** yaibondisieiei@gmail.com
- **Date:** October 22, 2025

## Test Cases

### Test 1: Authentication
- [ ] Navigate to login page
- [ ] Enter email and send magic link
- [ ] Click link in email
- [ ] Verify redirected to deliveries page (NOT back to login)
- [ ] Verify cookies are set (check session-debug page: https://siteproc1.vercel.app/debug/session-check)

**Expected:** Stay on deliveries page, no redirect

---

### Test 2: Create Test Delivery
- [ ] Click "New Delivery" button
- [ ] Fill form:
  - Order ID: TEST-001
  - Delivery Date: Today
  - Item 1: Cement - Qty: 5 - Unit: bags - Price: $50
  - Item 2: Sand - Qty: 3 - Unit: cubic meters - Price: $100
- [ ] Click Create
- [ ] Verify delivery appears in list with status "Pending"

**Expected:** Delivery created and visible in pending tab

---

### Test 3: Status Transition - Pending to Partial
- [ ] Click "Change Status" on the pending delivery
- [ ] Modal opens with status transition form
- [ ] Fill:
  - Driver Name: John Doe
  - Vehicle Number: ABC-123
- [ ] Click "Mark as In Transit"
- [ ] Verify delivery moves to "In Transit" (partial) tab
- [ ] Check activity log for entry

**Expected:** 
- Delivery status changes to partial
- Driver and vehicle info saved
- Activity log updated

---

### Test 4: Status Transition - Partial to Delivered
- [ ] Click "Complete" on the in-transit delivery
- [ ] Modal opens with delivery completion form
- [ ] Fill:
  - Signer Name: Jane Smith
  - Signature: (draw/upload)
  - Notes: Delivery completed successfully
- [ ] Click "Mark as Delivered"
- [ ] Verify delivery moves to "Delivered" tab
- [ ] Verify lock icon appears
- [ ] Check activity log for entry

**Expected:**
- Delivery status changes to delivered
- Record shows lock icon
- Cannot edit delivered record
- Activity log updated

---

### Test 5: Upload Proof of Delivery (POD)
- [ ] On delivered delivery, click "Upload POD"
- [ ] Select an image file (PNG, JPG, PDF)
- [ ] Modal shows upload progress
- [ ] Verify upload succeeds
- [ ] Check activity log for upload entry

**Expected:**
- POD file uploaded to Supabase Storage
- Signed URL generated (7-day expiry)
- Activity log entry created
- No errors in browser console

---

### Test 6: Verify Order Auto-Update
- [ ] Go to /orders page
- [ ] Find order TEST-001 (or create if doesn't exist)
- [ ] Check order details:
  - Delivered Quantity should show items delivered
  - Delivered Value calculated
  - Order status should reflect delivery progress
  - Remaining Quantity/Value shown

**Expected:**
- Order shows delivery progress
- Calculations correct (5 bags cement + 3 m³ sand delivered)
- Status reflects partial/full completion

---

### Test 7: Verify Project Auto-Update
- [ ] Go to /projects page
- [ ] Find project associated with order
- [ ] Check project actuals:
  - Delivered values updated
  - Progress percentage calculated
  - Order sync reflected

**Expected:**
- Project actuals updated with delivery values
- Progress calculations correct

---

### Test 8: Activity Log Verification
- [ ] Go to /activity-log
- [ ] Verify all entries present:
  - Delivery created
  - Status → partial
  - Status → delivered
  - POD uploaded
  - Order synced
  - Project synced

**Expected:**
- Complete audit trail of delivery workflow
- Timestamps accurate
- All mutations logged

---

### Test 9: Real-time Updates
- [ ] Open two browser tabs/windows, both at /deliveries
- [ ] In tab 1, create new delivery
- [ ] Verify tab 2 updates automatically (no refresh needed)
- [ ] In tab 1, change status
- [ ] Verify tab 2 shows updated status

**Expected:**
- Real-time broadcast working
- No manual refresh needed
- Both tabs sync automatically

---

### Test 10: Data Integrity Check
- [ ] Verify no duplicate deliveries
- [ ] Verify all calculations are correct
- [ ] Verify dates/times are accurate
- [ ] Verify user attribution correct

**Expected:**
- Clean data in database
- No orphaned records
- Referential integrity maintained

---

## Results Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Authentication | ☐ | |
| 2. Create Delivery | ☐ | |
| 3. Pending→Partial | ☐ | |
| 4. Partial→Delivered | ☐ | |
| 5. Upload POD | ☐ | |
| 6. Order Auto-Update | ☐ | |
| 7. Project Auto-Update | ☐ | |
| 8. Activity Log | ☐ | |
| 9. Real-time Updates | ☐ | |
| 10. Data Integrity | ☐ | |

## Issues Found
(Document any bugs or unexpected behavior)

---

## Sign-off
- **Tested by:** [Your Name]
- **Date:** October 22, 2025
- **Build:** [Latest commit hash]
- **All tests passed:** ☐ Yes ☐ No

