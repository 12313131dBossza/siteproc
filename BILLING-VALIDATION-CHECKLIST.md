# Billing System Validation Checklist

## ✅ System Overview

The billing system charges **per internal user per month**. When you add billable users, the subscription quantity increases. When you remove them, it decreases.

### Billable Roles (Charged)
- Owner, Admin, Manager, Accountant, Bookkeeper, Member

### Free Roles (Never Charged)
- Client, Supplier, Contractor, Consultant, Subcontractor, Viewer

---

## ✅ Billing Flow Validation

### 1. Initial Subscription
- [ ] Go to **Settings → Billing**
- [ ] Click **Upgrade** on Starter ($49/user), Pro ($99/user), or Enterprise ($149+/user)
- [ ] Complete Stripe checkout
- [ ] Verify plan shows as active in billing page
- [ ] Verify billable user count is correct

### 2. Adding Users (Charges More)
- [ ] Go to **Users & Roles**
- [ ] Click **Invite User**
- [ ] Select a **billable role** (Admin, Manager, Accountant, Member)
- [ ] Send invitation
- [ ] When user accepts invitation, `syncSubscriptionQuantity()` is called
- [ ] Stripe subscription quantity increases
- [ ] Prorated charges apply immediately

### 3. Removing Users (Prorated Credit)
- [ ] Go to **Users & Roles**
- [ ] Click the **trash icon** on a user (Owner only)
- [ ] Confirm removal
- [ ] User status set to "inactive"
- [ ] `syncSubscriptionQuantity()` is called
- [ ] Stripe subscription quantity decreases
- [ ] Prorated credit applies

### 4. Free Users (No Charge)
- [ ] Add a Client, Supplier, Contractor, or Consultant
- [ ] Verify they don't increase billable count
- [ ] Verify subscription quantity stays the same

---

## ✅ Key Files

| File | Purpose |
|------|---------|
| `src/lib/plans.ts` | BILLABLE_ROLES and FREE_ROLES definitions |
| `src/lib/billing-utils.ts` | `countBillableUsers()`, `syncSubscriptionQuantity()` |
| `src/lib/stripe.ts` | Stripe API integration |
| `src/app/api/billing/route.ts` | Checkout and portal sessions |
| `src/app/api/billing/webhook/route.ts` | Stripe webhook handler |
| `src/app/api/accept-invitation/register/route.ts` | Syncs billing on user creation |
| `src/app/api/users/[id]/route.ts` | Syncs billing on user removal |
| `src/app/settings/billing/page.tsx` | Billing UI |

---

## ✅ Trigger Points for Billing Sync

1. **User accepts invitation** → `accept-invitation/register/route.ts`
2. **User joins via onboarding** → `onboarding/join/route.ts`
3. **User removed** → `users/[id]/route.ts` DELETE
4. **User role changed** → `users/[id]/route.ts` PUT
5. **Manual sync** → `billing/sync-users/route.ts`

---

## ✅ Environment Variables Required

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_live_xxx...
STRIPE_WEBHOOK_SECRET=whsec_xxx...

# Plan Price IDs (can be price_xxx or prod_xxx)
STRIPE_STARTER_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx  
STRIPE_ENTERPRISE_PRICE_ID=price_xxx
```

---

## ✅ Stripe Dashboard Verification

After adding/removing users:
1. Go to Stripe Dashboard → Subscriptions
2. Find the company's subscription
3. Verify quantity matches billable user count
4. Check invoice history for prorated charges/credits

---

## Pricing Summary

| Plan | Price/User | Max Users | Max Projects |
|------|------------|-----------|--------------|
| Free | $0 | 2 | 3 |
| Starter | $49/mo | 5 | 10 |
| Pro | $99/mo | Unlimited | Unlimited |
| Enterprise | $149+/mo | Unlimited | Unlimited |

**Volume Discounts (Enterprise)**:
- 1-15 users: $149/user
- 16-30 users: $129/user
- 31-75 users: $99/user
- 76+ users: $79/user
