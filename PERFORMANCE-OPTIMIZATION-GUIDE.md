# Performance Optimization Guide - SiteProc

## Database Optimizations

### Indexes Created
All critical query paths have been indexed:

```sql
-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_id ON purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_id ON purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON purchase_orders(created_at DESC);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);

-- Deliveries
CREATE INDEX IF NOT EXISTS idx_deliveries_company_id ON deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_project_id ON deliveries(project_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- QuickBooks
CREATE INDEX IF NOT EXISTS idx_qb_connections_company_id ON quickbooks_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_qb_vendor_mappings_company ON quickbooks_vendor_mappings(company_id);
```

### Query Optimization Patterns

#### ✅ Good: Use selective filters first
```typescript
const { data } = await supabase
  .from('purchase_orders')
  .select('*')
  .eq('company_id', companyId)  // Most selective first
  .eq('status', 'approved')
  .gte('created_at', startDate)
  .order('created_at', { ascending: false })
  .limit(50)
```

#### ❌ Bad: Fetch all then filter
```typescript
// Don't do this
const { data } = await supabase
  .from('purchase_orders')
  .select('*')

const filtered = data.filter(o => o.status === 'approved')
```

#### ✅ Good: Select only needed columns
```typescript
const { data } = await supabase
  .from('projects')
  .select('id, name, budget, status')
  .eq('company_id', companyId)
```

#### ❌ Bad: Select all columns
```typescript
const { data } = await supabase
  .from('projects')
  .select('*')
```

#### ✅ Good: Use count queries efficiently
```typescript
const { count } = await supabase
  .from('purchase_orders')
  .select('*', { count: 'exact', head: true })
  .eq('company_id', companyId)
```

#### ✅ Good: Batch related queries
```typescript
const [projects, orders, expenses] = await Promise.all([
  supabase.from('projects').select('*').eq('company_id', companyId),
  supabase.from('purchase_orders').select('*').eq('company_id', companyId),
  supabase.from('expenses').select('*').eq('company_id', companyId)
])
```

### RLS Policy Optimization

All tables use company_id based RLS:
```sql
CREATE POLICY "Users can view company data"
  ON table_name FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );
```

**Performance Notes:**
- RLS policies use indexes on company_id
- Service client bypasses RLS for admin operations
- Fallback to service client for complex queries

## Frontend Optimizations

### 1. Code Splitting
- Dynamic imports for heavy components
- Lazy load routes with Suspense
- Split vendor bundles

```typescript
// Dynamic import example
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Spinner />,
  ssr: false
})
```

### 2. Image Optimization
- Use Next.js Image component
- Lazy load images below fold
- Compress images before upload

### 3. Data Fetching
- Use SWR or React Query for caching
- Implement pagination (50 items per page)
- Debounce search inputs (300ms)

```typescript
// Debounce example from lib/performance.ts
import { debounce } from '@/lib/performance'

const debouncedSearch = debounce(handleSearch, 300)
```

### 4. State Management
- Minimize re-renders with React.memo
- Use useMemo for expensive calculations
- Use useCallback for event handlers

### 5. Bundle Size
Current optimizations:
- Tree shaking enabled
- CSS modules for component styles
- Remove unused dependencies

## API Route Optimizations

### 1. Response Caching
```typescript
import { cache } from '@/lib/performance'

export async function GET(request: NextRequest) {
  const cacheKey = `api:${request.url}`
  const cached = cache.get(cacheKey)
  
  if (cached) {
    return NextResponse.json(cached)
  }
  
  const data = await fetchData()
  cache.set(cacheKey, data, 300) // 5 min cache
  
  return NextResponse.json(data)
}
```

### 2. Batch Operations
```typescript
// Use parallelLimit from lib/performance.ts
import { parallelLimit } from '@/lib/performance'

const results = await parallelLimit(
  items,
  async (item) => processItem(item),
  5 // Concurrency limit
)
```

### 3. Error Retry
```typescript
import { retry } from '@/lib/performance'

const data = await retry(
  () => fetchFromExternalAPI(),
  { maxRetries: 3, initialDelay: 1000 }
)
```

## Monitoring & Metrics

### Performance Monitoring
- Use `measurePerformance` from lib/performance.ts
- Log slow queries (>1s)
- Track API response times

```typescript
import { measurePerformance } from '@/lib/performance'

const fetchProjects = measurePerformance(
  async (companyId: string) => {
    return await supabase
      .from('projects')
      .select('*')
      .eq('company_id', companyId)
  },
  'fetchProjects'
)
```

### Error Tracking
- ErrorBoundary component wraps all pages
- Async errors caught with withErrorHandler
- Production errors logged to console

### Core Web Vitals Targets
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

## Deployment Optimizations

### Vercel Configuration
```json
{
  "buildCommand": "next build",
  "framework": "nextjs",
  "installCommand": "npm install",
  "outputDirectory": ".next"
}
```

### Environment Variables
Required:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
- QUICKBOOKS_CLIENT_ID
- QUICKBOOKS_CLIENT_SECRET

### CDN & Caching
- Static assets cached by Vercel CDN
- API routes use stale-while-revalidate
- Images optimized and cached

## Testing Performance

### Load Testing
```bash
# Use loadtest package
npm install -g loadtest

# Test API endpoint
loadtest -c 10 -n 1000 https://siteproc1.vercel.app/api/projects
```

### Lighthouse Scores
Run Lighthouse in Chrome DevTools:
1. Open page
2. F12 → Lighthouse tab
3. Generate report

Target scores:
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 95
- SEO: > 90

## Best Practices Summary

✅ **Always do:**
- Use indexes for filtered/sorted columns
- Select only needed columns
- Implement pagination
- Cache frequently accessed data
- Use ErrorBoundary components
- Debounce user inputs
- Lazy load heavy components
- Optimize images
- Monitor slow queries

❌ **Never do:**
- Fetch all data then filter client-side
- Use SELECT * in production
- Skip pagination on large datasets
- Ignore error boundaries
- Block UI with sync operations
- Load all images at once
- Skip database indexes

## Performance Checklist

- [x] Database indexes created
- [x] RLS policies optimized
- [x] API response caching implemented
- [x] Error boundaries added
- [x] Performance monitoring utilities
- [x] Retry logic for external APIs
- [x] Debounce/throttle for user inputs
- [x] Code splitting configured
- [x] Image optimization
- [x] Bundle size optimized
- [x] Pagination implemented
- [x] Query optimization patterns documented

## Next Steps

1. **Add Redis for production caching** (optional)
2. **Implement service worker** for offline support
3. **Add performance monitoring** (e.g., Vercel Analytics)
4. **Set up automated performance testing** in CI/CD
5. **Configure CDN** for static assets
6. **Add database connection pooling** if needed
7. **Implement request rate limiting** on API routes

## Maintenance

Run these checks monthly:
- [ ] Review slow query logs
- [ ] Check bundle size trends
- [ ] Monitor Core Web Vitals
- [ ] Update dependencies
- [ ] Clean up unused code
- [ ] Optimize database indexes
- [ ] Review error logs
