# White-Label Implementation Guide

## Overview
Full white-label branding support has been implemented for Enterprise customers ($149+ plan). This allows companies to replace all SiteProc branding with their own company name and logo.

## Features Implemented

### 1. Browser Tab / PWA Title
- **Component**: `src/components/DynamicTitle.tsx`
- Shows company name instead of "SiteProc" in browser tab
- Updates dynamically when white-label config changes

### 2. Sidebar Logo & Name
- **Component**: `src/components/sidebar-nav.tsx`
- Top-left corner shows company logo when enabled
- Company name appears below the logo
- Falls back to SiteProc branding when disabled

### 3. Mobile Header
- **Component**: `src/components/app-layout.tsx`
- Mobile header shows white-label logo

### 4. Dashboard Header
- **Page**: `src/app/(app)/dashboard/page.tsx`
- Shows "[Company Name] Dashboard" instead of "SiteProc Dashboard"

### 5. Login Screen
- **Page**: `src/app/(auth)/login/page.tsx`
- Displays company logo at login
- Shows "Welcome back to [Company Name]"
- Loads branding from localStorage cache (for returning users)

### 6. PDF Invoices
- **Files**: `src/lib/pdf-invoice.ts`, `src/components/InvoiceGenerator.tsx`
- Company name appears at top of all invoices
- Company logo support (async image loading)
- Uses white-label context for automatic branding

### 7. Email Notifications
- **File**: `src/lib/notifications.ts`
- Email "From" field shows: `Company Name <notifications@siteproc.app>`
- Applied to expense, order, and delivery notifications

## Database Setup

Run this SQL migration in your Supabase dashboard:

```sql
-- Add white-label columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS white_label_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS white_label_logo_url text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS white_label_company_name text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS white_label_email_name boolean DEFAULT false;
```

## Settings Page UI

The white-label section appears in Settings → Company Settings (only visible for Enterprise plan):

1. **Enable White-Label Branding** - Master toggle
2. **Company Logo** - Upload button (stored in Supabase 'company-logos' bucket)
3. **Company Name** - Text input for custom branding name
4. **Use in Email Notifications** - Optional toggle for email From field

## How It Works

### WhiteLabelContext (`src/lib/WhiteLabelContext.tsx`)
- React context that provides white-label config globally
- Caches config in localStorage for performance
- Auto-fetches on login and settings save

### Flow:
1. User enables white-label in Settings
2. Uploads logo and enters company name
3. Context updates and caches to localStorage
4. All components read from context and apply branding
5. On logout/disable, branding reverts to SiteProc

## Plan Restrictions

- **Enterprise ($149/month)**: Full white-label support
- **Pro ($49/month)**: White-label section hidden
- **Starter (Free)**: White-label section hidden

## Testing Checklist

- [ ] Enable white-label for Enterprise company
- [ ] Upload company logo
- [ ] Enter custom company name
- [ ] Verify browser tab shows company name
- [ ] Verify sidebar shows custom logo and name
- [ ] Verify dashboard header shows company name
- [ ] Log out and back in - verify login screen shows branding
- [ ] Generate PDF invoice - verify company name at top
- [ ] Trigger email notification - verify From name
- [ ] Disable white-label - verify SiteProc branding returns
- [ ] Test on Pro/Starter plan - verify section is hidden

## Files Modified

### New Files:
- `ADD-WHITE-LABEL-COLUMNS.sql`
- `src/lib/WhiteLabelContext.tsx`
- `src/components/DynamicTitle.tsx`

### Updated Files:
- `src/app/layout.tsx` - Added providers
- `src/app/settings/page.tsx` - White-label UI section
- `src/app/api/companies/route.ts` - Handle white-label fields
- `src/components/sidebar-nav.tsx` - Custom logo/name
- `src/components/app-layout.tsx` - Mobile header logo
- `src/app/(app)/dashboard/page.tsx` - Dynamic title
- `src/app/(auth)/login/page.tsx` - Login branding
- `src/lib/pdf-invoice.ts` - Logo in PDFs
- `src/components/InvoiceGenerator.tsx` - White-label context
- `src/lib/notifications.ts` - Email From name
