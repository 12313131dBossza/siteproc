# SiteProc - Construction Management Platform

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

**🚀 Latest Update (January 11, 2025):** Added project selection to all creation forms for better project management and item assignment.

## Authentication System

SiteProc uses Supabase Magic Link authentication with comprehensive user profile management and session persistence.

### Features
- ✅ Magic link email authentication
- ✅ User profile creation with RLS (Row Level Security)
- ✅ Session persistence across page reloads
- ✅ Automatic redirectTo preservation
- ✅ Secure logout with session cleanup
- ✅ Protected route middleware
- ✅ User greeting with profile data

### Database Setup

Run the following SQL migration in your Supabase SQL editor to set up user profiles:

```sql
-- Apply the profiles migration
-- Location: supabase/migrations/20250830_profiles_and_rls.sql

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile trigger (see full migration file for details)
```

### Authentication Flow

1. **Login**: User enters email at `/login`
2. **Magic Link**: Supabase sends email with authentication link
3. **Callback**: `/auth/callback` processes the magic link and creates user session
4. **Profile Creation**: System automatically creates user profile in `profiles` table
5. **Dashboard Redirect**: User lands on `/dashboard` with personalized greeting
6. **Session Persistence**: Middleware ensures authenticated state across requests

### RedirectTo Functionality

The system preserves the original destination when redirecting unauthenticated users:

```
User tries to access: /dashboard
↓
Middleware redirects to: /login?redirectTo=%2Fdashboard
↓
After successful auth: User lands back on /dashboard
```

### Logout Process

1. Call `supabase.auth.signOut()` to clear server-side session
2. Clear any client-side state/cache
3. Redirect to `/login` page
4. Session cookies are invalidated

### Protected Routes

The following routes require authentication (configured in `src/middleware.ts`):
- `/dashboard`
- `/jobs`
- `/suppliers` 
- `/settings`
- `/admin`

Unauthenticated users are automatically redirected to `/login` with `redirectTo` parameter.

### Development vs Production

**Development Mode:**
- Auto-login button available for quick testing
- Environment: `NODE_ENV=development`

**Production Mode:**
- Full magic link flow required
- Auto-login disabled
- Environment: `NODE_ENV=production`

## Testing

### Playwright Authentication Tests

Run the authentication smoke tests:

```bash
# Run all auth tests
npm run e2e -- auth.smoke.spec.ts

# Run with browser visible (dev mode)
npm run e2e:headed -- auth.smoke.spec.ts

# Run specific test
npx playwright test auth.smoke.spec.ts --grep "complete auth flow"
```

**Test Coverage:**
- ✅ Login → Dashboard → Logout flow
- ✅ RedirectTo parameter preservation
- ✅ Session persistence across page reloads
- ✅ Protected route access control
- ✅ User greeting display

**Test File:** `e2e/auth.smoke.spec.ts`

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run e2e

# E2E with browser visible
npm run e2e:headed

# Specific test file
npm run e2e -- auth.smoke.spec.ts
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Dev Utility Endpoints

Local-only helper endpoints live under `/api/dev/*` (seed, demo-po, setup-storage). They are disabled by default and return 404 unless explicitly enabled.

Enable them by adding to `.env.local`:

```
DEV_TOOLS_ENABLED=true
```

Never enable this in production.

## Realtime Events
Broadcast events use a short-lived channel pattern. Server code calls helpers in `src/lib/realtime.ts` which:
1. Create a channel `channel(name)`
2. Subscribe, then send a broadcast event
3. Unsubscribe immediately

Client hooks (`usePoRealtime`, `useJobRealtime`) subscribe to `po:{id}` or `job:{jobId}` and react to events defined in `src/lib/constants.ts`.

### Realtime Architecture & Channel Migration

We are migrating from legacy table channels of the form:

```
table-<table>-company-<company_id>
```

to a normalized colon format:

```
table:<table>:company:<company_id>
```

During the transition, the pagination realtime hook subscribes to BOTH patterns to maintain backward compatibility (`src/lib/paginationRealtime.ts`). Once all producers emit only the new form we can remove the legacy subscription.

Dashboard aggregate channel currently emits only:
```
dashboard:company-<company_id>
```
Planned new form:
```
dashboard:company:<company_id>
```
Emission helpers live in `src/lib/realtime.ts` (see `broadcastDashboardUpdated`). Future dual-emission will be added before dropping the old pattern.

### Paginated Realtime Lists

`usePaginatedRealtime` (introduced during migration) combines cursor pagination + realtime merges. Pattern:

1. Initial fetch via REST list endpoint (e.g. `/api/jobs/list?limit=25`).
2. Hook subscribes to table channel(s) for inserts/updates within the company scope.
3. Incoming rows are merged if id exists, or prepended when newer than current head.
4. `loadMore()` appends the next page using opaque base64 cursor `created_at|id` (descending order ensures stable window).

Server list endpoints encode a cursor as:
```
Buffer.from(`${created_at}|${id}`).toString('base64')
```
and decode by splitting on the pipe. Each endpoint returns:
```
{ items: T[]; nextCursor: string | null }
```

### Single Record Endpoints
Added canonical `/api/<entity>/:id` endpoints for jobs, bids(quotes), deliveries (expanded with items & photos), purchase orders, and change orders. These power detail views and allow deterministic cache hydration.

### Broadcast Coverage
See `docs/broadcast-coverage.md` for a matrix of mutation routes and their realtime invalidations. Missing broadcasts (jobs create, clients, payments) are tracked there with TODO items.

### Supabase Types Placeholder
`src/types/supabase.ts` holds minimal row interfaces until generated types are wired in. Once available, replace casts in new list/single endpoints and remove the placeholder.

### Next Steps (Realtime)
1. Dual-emission for dashboard channel (`dashboard:company:<id>` + legacy).
2. Implement job creation endpoint + dashboard broadcast if KPI needs it.
3. Add clients/payments schema + broadcasts.
4. Drop legacy table channel subscriptions after monitoring period.
5. Replace placeholder Supabase types with generated definitions.

## Testing
 Discriminated realtime job events with payload.kind: 'expense' | 'delivery' | 'cost_code'
 Persistent nonce + rate limit storage (tables: nonce_replay, rate_limits, token_attempts)
 Resend endpoints: POST /api/rfqs/:id/resend, POST /api/po/:id/resend
 KPIs: RFQ cycle time (avg/median hours), On-time delivery %, exposed via /api/jobs/:id/report?format=json and Job Report PDF
Includes schema/helper tests plus API route + realtime helper mocks. Add new tests under `tests/`.
 Client hooks (`usePoRealtime`, `useJobRealtime`) subscribe to `po:{id}` or `job:{jobId}` and react to events defined in `src/lib/constants.ts`.

## PWA Icons
The files `public/icons/icon-192.png` and `public/icons/icon-512.png` are placeholders. Replace with production PNG assets (monochrome background recommended) to enable proper install banners.
Run `node scripts/mock-icons.js` to regenerate lightweight 1x1 placeholder PNGs during development. An `icons/icon.svg` scalable logo (maskable) is included as a starter and can be replaced with branded artwork.

 Job channel payloads now include a discriminant `kind` field so consumers can narrow types:
 ```
 { kind: 'expense', job_id, expense_id, at }
 { kind: 'delivery', job_id, delivery_id, at, status? }
 { kind: 'cost_code', job_id, cost_code_id, at }
 ```
## Cost Code Breakdown & Filters
 HMAC secret set with `PUBLIC_HMAC_SECRET`. Optionally enforce timestamp & nonce replay prevention.
 Nonce persistence table: `nonce_replay` (create via schema.sql). If table insert fails, falls back to memory.
 Rate limiting persists counters in `rate_limits`; brute-force token attempts tracked in `token_attempts` with lockout.

 POST /api/rfqs/:id/resend (admin) – resend RFQ invitations
 POST /api/po/:id/resend (admin) – resend PO to supplier
 GET /api/jobs/:id/report?format=json – returns `{ job_id, kpis }`
## Performance & Indexes
 Computed on demand:
 * rfq_cycles – count of selected quotes
 * rfq_cycle_time_hours_avg / median – from RFQ creation to selected quote creation
 * on_time_delivery_pct – deliveries with delivered_at date <= needed_date (from originating RFQ)
 * deliveries_considered – denominator for on-time percentage

 Included in Job Report PDF and JSON endpoint.
Key composite/partial indexes (see `sql/schema.sql`):
 One synthetic delivery (notes starts with `Backorder`) is maintained until cumulative delivered qty >= ordered qty; then it is marked delivered and PO status auto-updates to `complete`. A unique partial index (`deliveries_single_backorder_per_po`) enforces at most one placeholder per PO.
- deliveries(company_id, job_id, status)
- deliveries partial where status='delivered'
- photos(company_id, entity, entity_id)
- events(company_id, entity, created_at desc)
These support dashboard filters, delivered % KPI, and recent activity lookups.

## Security & Compliance
- Public endpoints (`/api/quotes/public/:token`, `/api/change-orders/public/:token/approve`) now support optional HMAC signatures.
  - Set `PUBLIC_HMAC_SECRET` and `PUBLIC_HMAC_REQUIRE=true` to enforce.
  - Client sends JSON body + header `x-signature` = HMAC_SHA256(JSON).
- Content-Type + size guards added (payloads capped; 10KB quote submit, 4KB change order approve metadata).
- Rate limiting via middleware (configurable: `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`).
- Dev utilities gated by `DEV_TOOLS_ENABLED`.
- Add environment variables to `.env.local` as needed:
```
PUBLIC_HMAC_SECRET=replace_me
PUBLIC_HMAC_REQUIRE=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=20
DEV_TOOLS_ENABLED=true
```

## Production Finalization Checklist
Before first real deployment, complete these items:

1. Branding & Assets
  - Replace placeholder PNG icons (`public/icons/icon-192.png`, `icon-512.png`) and `icon.svg` with final branded artwork.
  - Verify manifest name / theme colors match brand palette.
2. Database
  - Apply `sql/schema.sql` then `sql/rls.sql` to production database (confirm all RLS policies active).
  - Create required indexes if any migrations were added after initial schema.
3. Environment
  - Copy `.env.example` to environment / secrets store; fill Supabase keys, email SMTP credentials, monitoring tokens.
  - Set `PUBLIC_CORS_ORIGINS` to exact production domain(s); no wildcard.
  - Decide on rate limit values appropriate for expected traffic (update `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`).
4. Security
  - Generate strong `PUBLIC_HMAC_SECRET` (32+ random bytes base64) if enforcing signed public submissions.
  - Enable `PUBLIC_HMAC_REQUIRE=true` once clients updated.
  - Consider enabling `CSP_ENFORCE=true` and expanding `CSP_SCRIPT_SRC` to needed CDNs only.
  - Verify no dev endpoints (`DEV_TOOLS_ENABLED`) enabled in prod.
5. Monitoring & Logging
  - Add Sentry (set `SENTRY_DSN`, install dependencies). Client & server configs: `sentry.client.config.ts`, `sentry.server.config.ts`.
  - Run periodic uptime check (Pingdom/Healthchecks) for `/` and `/api/quotes/public/<sample>`.
  - Ship structured logs to aggregation (e.g. Loki / CloudWatch) if scaling.
  - Set up uptime + latency monitoring (Pingdom / Healthchecks) for `/` and a public API endpoint.
6. Email
  - Verify sending domain (SPF, DKIM) & test RFQ send + resend flows.
7. Performance
  - Run load test script: `node scripts/loadtest-public-quote.js <public_token> 200 20` and review RPS, 429 distribution.
  - Confirm cold start behavior acceptable; consider edge caching for marketing pages.
8. Accessibility & PWA
  - Lighthouse audit (>= 90 scores) & add ARIA labels where flagged.
  - Test installability and offline queue page in Chrome & iOS Safari.
9. Backup & Recovery
  - Enable automated daily database backups & test restore procedure.
10. Keys Rotation Policy
  - Document procedure to rotate Supabase service key & HMAC secret (invalidate caches, redeploy).
11. Secret Hygiene
  - Run `npm run scan:secrets` (trufflehog) locally & in CI; investigate any verified matches.
  - Ensure no secrets live in client bundle (inspect `.next/static` output for patterns like `SUPABASE_SERVICE_KEY`).

After completing all above, tag release (e.g. `v1.0.0`) and deploy.
