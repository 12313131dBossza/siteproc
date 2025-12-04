# 🔧 Setup Guide: 3 Priority Features

This guide walks you through setting up and testing the 3 priority features before launch.

---

## ✅ Current Status

| Feature | Code Status | Setup Status |
|---------|-------------|--------------|
| QuickBooks Live Sync | ✅ Implemented | ✅ Keys in .env.local |
| Stripe Billing | ✅ Implemented | ⚠️ Need Stripe keys |
| Offline Sync | ✅ Implemented | ✅ Ready (PWA) |

---

## 🔴 P1: QuickBooks Live Sync

### Already Configured ✅
Your `.env.local` already has QuickBooks sandbox credentials:
```
QUICKBOOKS_CLIENT_ID=ABm1ulUYP6SqgUtoeA6LocYjL47APk7UMjYPVTJZkcEfo6fsvP
QUICKBOOKS_CLIENT_SECRET=4oP2oTV85ab6wHlTPa3HwvNZ76G2wFuIxQjgbCH6
```

### Test Steps:
1. **Start dev server:**
   ```powershell
   npm run dev
   ```

2. **Connect QuickBooks:**
   - Go to http://localhost:3000/settings
   - Click "Integrations" → "QuickBooks"
   - Click "Connect to QuickBooks"
   - Sign in to QuickBooks sandbox (developer.intuit.com credentials)

3. **Test the sync:**
   - Go to `/expenses` → Create a new expense ($50, "Test QB Sync")
   - Go to `/deliveries` → Create a new delivery
   - Open QuickBooks sandbox: https://developer.intuit.com → Sandbox
   - **Expected:** Both should appear in QuickBooks within 60 seconds

### Troubleshooting:
- If OAuth fails, check redirect URI matches: `http://localhost:3000/api/quickbooks/callback`
- For production, update `QUICKBOOKS_REDIRECT_URI` to `https://siteproc1.vercel.app/api/quickbooks/callback`

---

## 🔴 P2: Stripe Billing E2E

### Step 1: Get Stripe Keys (5 min)

1. **Go to Stripe Dashboard:**
   https://dashboard.stripe.com/test/apikeys

2. **Copy your test keys:**
   - Secret key: `sk_test_...`
   - Publishable key: `pk_test_...`

3. **Update `.env.local`:**
   ```
   STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY
   STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY
   ```

### Step 2: Create Products in Stripe (5 min)

1. **Go to:** https://dashboard.stripe.com/test/products

2. **Create 3 products:**

   | Product | Price | Billing |
   |---------|-------|---------|
   | SiteProc Starter | $29/month | Recurring |
   | SiteProc Pro | $99/month | Recurring |
   | SiteProc Enterprise | $299/month | Recurring |

3. **Copy each Price ID** (starts with `price_...`)

4. **Update `.env.local`:**
   ```
   STRIPE_STARTER_PRICE_ID=price_xxxxx
   STRIPE_PRO_PRICE_ID=price_xxxxx
   STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx
   ```

### Step 3: Set Up Webhook (5 min)

1. **Go to:** https://dashboard.stripe.com/test/webhooks

2. **Click "Add endpoint":**
   - URL: `https://siteproc1.vercel.app/api/billing/webhook`
   - Events to send:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`

3. **Copy the webhook signing secret** (starts with `whsec_...`)

4. **Update `.env.local`:**
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

### Step 4: Run Database Migration

Run this SQL in **Supabase SQL Editor** (https://supabase.com/dashboard):

```sql
-- Add billing columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS billing_cycle_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS billing_cycle_end TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer 
ON companies(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
```

### Step 5: Add Keys to Vercel

1. Go to: https://vercel.com/your-project/settings/environment-variables

2. Add these variables:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_STARTER_PRICE_ID`
   - `STRIPE_PRO_PRICE_ID`
   - `STRIPE_ENTERPRISE_PRICE_ID`

### Step 6: Test It!

1. **Start dev server:** `npm run dev`

2. **Go to:** http://localhost:3000/settings/billing

3. **Click "Upgrade to Pro"**

4. **Enter test card:**
   - Number: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

5. **Complete checkout**

6. **Verify in Stripe Dashboard:**
   - https://dashboard.stripe.com/test/payments
   - Should show $99 payment

---

## 🔴 P3: Offline → Sync Magic

### No Setup Required ✅
The PWA and offline sync are already configured!

### Test Steps:

#### On Desktop (Quick Test):
1. Open http://localhost:3000 in Chrome
2. Open DevTools → Network tab → Check "Offline"
3. You should see the orange "Offline" indicator in bottom-right
4. Try to update a delivery status
5. Uncheck "Offline"
6. Changes should sync automatically

#### On Mobile (Full Test):
1. **Install PWA:**
   - iPhone: Safari → Share → "Add to Home Screen"
   - Android: Chrome → Menu (⋮) → "Install app"

2. **Open the installed app**

3. **Turn on Airplane Mode**
   - Should show "Offline" indicator

4. **Make changes offline:**
   - Go to a delivery
   - Upload a POD photo
   - Mark as "Delivered"

5. **Turn off Airplane Mode**
   - Watch for sync indicator

6. **Verify on desktop:**
   - Open https://siteproc1.vercel.app on your computer
   - Check the delivery - photo and status should be there

---

## 🚀 Quick Commands

```powershell
# Install dependencies (if needed)
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

---

## 📋 Checklist Before Testing

- [ ] `.env.local` has Stripe keys
- [ ] Stripe products created with price IDs
- [ ] Webhook configured in Stripe Dashboard
- [ ] SQL migration run in Supabase
- [ ] Vercel environment variables updated
- [ ] Dev server running (`npm run dev`)

---

## 🆘 Common Issues

### Stripe: "Missing API key"
→ Check `STRIPE_SECRET_KEY` is set in `.env.local`

### Stripe: "No such price"
→ Create products in Stripe Dashboard and copy the price IDs

### QuickBooks: "OAuth error"
→ Redirect URI must match exactly (localhost vs production)

### Offline: "Changes not syncing"
→ Check browser console for errors, ensure service worker is registered

---

## 📞 Quick Links

| Service | Dashboard |
|---------|-----------|
| Stripe | https://dashboard.stripe.com/test |
| Supabase | https://supabase.com/dashboard |
| QuickBooks | https://developer.intuit.com |
| Vercel | https://vercel.com |

---

*Last updated: December 4, 2025*
