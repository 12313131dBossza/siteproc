# SiteProc Per-User Billing Rules

## Pricing Model

**Only INTERNAL users are charged. External users are 100% FREE.**

### Billable Roles (PAID)
These roles count toward your monthly bill:
- `owner`
- `admin`
- `manager`
- `bookkeeper`
- `member`

### Free Roles (NEVER CHARGED)
These roles never affect billing - unlimited free:
- `client`
- `supplier`
- `contractor`
- `consultant`
- `subcontractor`
- `viewer`

---

## Pricing by Plan

| Plan | Price Per User | User Limit |
|------|----------------|------------|
| **Free** | $0 | 2 users |
| **Starter** | $49/user/month | 5 users |
| **Pro** | $99/user/month | Unlimited |
| **Enterprise** | Volume pricing | Unlimited |

### Enterprise Volume Discounts
| Users | Price Per User |
|-------|----------------|
| 1-15 | $149/user |
| 16-30 | $129/user |
| 31-75 | $99/user |
| 76+ | $79/user |

---

## When Billing is Updated

Stripe subscription quantity is automatically updated (with proration):

| Trigger | Action | Billing Effect |
|---------|--------|----------------|
| User accepts invitation (billable role) | +1 seat | Prorated charge immediately |
| User joins company via onboarding | +1 seat | Prorated charge immediately |
| User role changed TO billable | +1 seat | Prorated charge immediately |
| User role changed FROM billable | -1 seat | Prorated credit immediately |
| User removed/deactivated | -1 seat | Prorated credit immediately |

---

## Code Locations

### Core Logic
- `src/lib/plans.ts` - `BILLABLE_ROLES` and `FREE_ROLES` arrays
- `src/lib/billing-utils.ts` - `countBillableUsers()`, `syncSubscriptionQuantity()`

### Trigger Points
1. `src/app/api/accept-invitation/route.ts` - User accepts team invitation
2. `src/app/api/onboarding/join/route.ts` - User joins company
3. `src/app/api/users/[id]/route.ts` PUT - Role change
4. `src/app/api/users/[id]/route.ts` DELETE - User removal
5. `src/app/api/billing/sync-users/route.ts` - Manual sync API

### NO Billing Sync Needed
- `src/app/api/accept-project-invite/` - Creates FREE roles (supplier, client, etc.)
- `src/app/api/accept-project-invite/register/` - Creates `viewer` role (FREE)

---

## Testing Checklist

Before going live, test with Stripe TEST cards:

| Test | Expected | Card |
|------|----------|------|
| Upgrade to Pro | Checkout shows quantity = billable users | 4242 4242 4242 4242 |
| Add internal user | Invoice shows +1 prorated charge | - |
| Remove internal user | Invoice shows prorated credit | - |
| Add client/supplier | NO billing change | - |
| Remove client/supplier | NO billing change | - |
| Change member → client | -1 seat, prorated credit | - |
| Change client → manager | +1 seat, prorated charge | - |

---

## Stripe Configuration

Required environment variables:
```
STRIPE_SECRET_KEY=sk_test_... (use sk_live_... in production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

Webhook events to listen for:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.paid`
