# 🔍 Phase 15: Advanced Search & Filtering System

**Status:** 🚀 READY TO START  
**Estimated Time:** 3-4 hours  
**Priority:** HIGH (User Experience & Productivity)

---

## 📋 Overview

Implement comprehensive search and filtering across all major modules (Orders, Projects, Deliveries, Expenses, Payments, Products) to help users find data quickly and efficiently.

---

## 🎯 Objectives

1. **Global Search** - Search across all entities from navbar
2. **Module-Specific Filters** - Advanced filters on each list page
3. **Saved Filters** - Save frequently used filter combinations
4. **Quick Filters** - Common presets (This Week, This Month, Pending, etc.)
5. **Sort Options** - Multiple sort criteria for each module
6. **Export Filtered Results** - CSV/PDF export of filtered data

---

## ✅ Features to Implement

### 1. **Global Search Bar** (30 min)
- [ ] Search input in navbar (next to notifications bell)
- [ ] Search across orders, projects, deliveries, expenses, payments
- [ ] Show results grouped by type
- [ ] Click result to navigate to detail page
- [ ] Recent searches dropdown
- [ ] Keyboard shortcut (Cmd/Ctrl + K)

**Technical:**
- Component: `src/components/GlobalSearch.tsx`
- API: `src/app/api/search/route.ts`
- Database: Full-text search across multiple tables
- UI: Modal with search results, grouped by entity type

---

### 2. **Orders Advanced Filters** (45 min)
- [ ] Filter by status (pending, approved, rejected, completed)
- [ ] Filter by date range (created_at, approved_at)
- [ ] Filter by project
- [ ] Filter by vendor
- [ ] Filter by amount range ($min - $max)
- [ ] Filter by created_by user
- [ ] Search by order_number or description

**UI Components:**
- Filter panel (collapsible sidebar or top bar)
- Clear all filters button
- Active filter chips (removable)
- Filter count badge

---

### 3. **Projects Advanced Filters** (30 min)
- [ ] Filter by status (active, completed, on-hold, cancelled)
- [ ] Filter by date range (start_date, end_date)
- [ ] Filter by client
- [ ] Filter by budget range
- [ ] Filter by actual_cost range
- [ ] Search by project name, address, or description
- [ ] Filter by over/under budget

**Special Filters:**
- "Budget Alert" - Projects over 90% budget
- "Overdue" - Projects past end_date
- "Active This Month" - Projects with activity this month

---

### 4. **Deliveries Advanced Filters** (30 min)
- [ ] Filter by status (pending, in-transit, delivered)
- [ ] Filter by date range (delivery_date, delivered_at)
- [ ] Filter by project
- [ ] Filter by order
- [ ] Filter by has POD (yes/no)
- [ ] Search by delivery_number or notes

**Quick Filters:**
- "Pending Deliveries"
- "Delivered Today"
- "Missing POD"
- "Overdue"

---

### 5. **Expenses Advanced Filters** (30 min)
- [ ] Filter by status (pending, approved, rejected)
- [ ] Filter by date range (expense_date, submitted_at)
- [ ] Filter by project
- [ ] Filter by category (labor, materials, equipment, etc.)
- [ ] Filter by amount range
- [ ] Filter by submitted_by user
- [ ] Filter by has receipt (yes/no)
- [ ] Search by vendor or description

**Quick Filters:**
- "Pending Approval"
- "This Month"
- "My Expenses"
- "High Value" ($1000+)

---

### 6. **Payments Advanced Filters** (30 min)
- [ ] Filter by status (pending, paid, failed, cancelled)
- [ ] Filter by date range (payment_date, paid_at)
- [ ] Filter by project
- [ ] Filter by payment_method (check, ACH, credit card, cash)
- [ ] Filter by amount range
- [ ] Search by reference_number or vendor

**Quick Filters:**
- "Pending Payments"
- "Paid This Week"
- "Large Payments" ($5000+)

---

### 7. **Products/Inventory Advanced Filters** (20 min)
- [ ] Filter by category
- [ ] Filter by low stock (quantity < reorder_point)
- [ ] Filter by in stock / out of stock
- [ ] Filter by price range
- [ ] Search by SKU, name, or description

**Quick Filters:**
- "Low Stock Alert"
- "Out of Stock"
- "High Value Items"

---

### 8. **Saved Filters** (45 min)
- [ ] Save current filter combination
- [ ] Name saved filters
- [ ] Quick access to saved filters dropdown
- [ ] Edit/delete saved filters
- [ ] Default filter (auto-applied on page load)
- [ ] Share filters with team (optional)

**Storage:**
- Database table: `saved_filters`
- Columns: id, user_id, company_id, module, name, filters (JSONB), is_default

---

### 9. **Sort Options** (30 min)
- [ ] Sort by multiple fields
- [ ] Ascending/descending toggle
- [ ] Remember last sort preference (localStorage)
- [ ] Sort indicators in table headers

**Sort Fields by Module:**
- **Orders:** date, amount, status, vendor, project
- **Projects:** name, start_date, budget, status
- **Deliveries:** delivery_date, status, project
- **Expenses:** date, amount, status, category
- **Payments:** date, amount, status, method

---

### 10. **Export Filtered Results** (30 min)
- [ ] CSV export of filtered data
- [ ] PDF export with filter summary
- [ ] Email export results (optional)
- [ ] Include only visible columns

**API Endpoints:**
- `/api/orders/export?format=csv&filters={...}`
- `/api/projects/export?format=pdf&filters={...}`

---

## 🏗️ Technical Architecture

### Database Changes

```sql
-- Saved filters table
CREATE TABLE IF NOT EXISTS saved_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    module TEXT NOT NULL CHECK (module IN ('orders', 'projects', 'deliveries', 'expenses', 'payments', 'products')),
    name TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_saved_filters_user ON saved_filters(user_id);
CREATE INDEX idx_saved_filters_module ON saved_filters(module);
```

### API Endpoints

1. **GET /api/search** - Global search
2. **GET /api/[module]?filters={...}** - Enhanced list endpoints with filter support
3. **POST /api/saved-filters** - Save filter
4. **GET /api/saved-filters** - List saved filters
5. **PATCH /api/saved-filters/[id]** - Update filter
6. **DELETE /api/saved-filters/[id]** - Delete filter
7. **GET /api/[module]/export** - Export filtered data

### React Components

```
src/components/
├── GlobalSearch.tsx          # Global search modal
├── FilterPanel.tsx           # Reusable filter sidebar/panel
├── FilterChip.tsx            # Individual filter tag
├── QuickFilters.tsx          # Preset filter buttons
├── SavedFiltersDropdown.tsx  # Saved filters menu
├── SortHeader.tsx            # Sortable table header
└── ExportButton.tsx          # Export dropdown button
```

### Hooks

```typescript
// src/hooks/useFilters.ts
export function useFilters(module: string) {
  const [filters, setFilters] = useState({})
  const [savedFilters, setSavedFilters] = useState([])
  
  const applyFilter = (key, value) => { ... }
  const removeFilter = (key) => { ... }
  const clearFilters = () => { ... }
  const saveFilter = (name) => { ... }
  const loadFilter = (id) => { ... }
  
  return { filters, applyFilter, removeFilter, clearFilters, savedFilters, saveFilter, loadFilter }
}

// src/hooks/useSort.ts
export function useSort(defaultSort: string) {
  const [sortBy, setSortBy] = useState(defaultSort)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  const toggleSort = (field) => { ... }
  
  return { sortBy, sortOrder, toggleSort }
}
```

---

## 📊 Implementation Plan

### **Step 1: Database Setup** (15 min)
- [ ] Create `saved_filters` table
- [ ] Add RLS policies
- [ ] Create indexes

### **Step 2: Global Search** (1 hour)
- [ ] Create GlobalSearch component
- [ ] Build search API endpoint
- [ ] Add to navbar
- [ ] Implement keyboard shortcut

### **Step 3: Filter Infrastructure** (30 min)
- [ ] Create FilterPanel component
- [ ] Create useFilters hook
- [ ] Create FilterChip component
- [ ] Create QuickFilters component

### **Step 4: Module-Specific Filters** (1.5 hours)
- [ ] Orders filters
- [ ] Projects filters
- [ ] Deliveries filters
- [ ] Expenses filters
- [ ] Payments filters
- [ ] Products filters

### **Step 5: Saved Filters** (45 min)
- [ ] Create saved_filters API
- [ ] SavedFiltersDropdown component
- [ ] Save/load functionality
- [ ] Default filter support

### **Step 6: Sort & Export** (45 min)
- [ ] SortHeader component
- [ ] useSort hook
- [ ] Export API endpoints
- [ ] ExportButton component

---

## 🧪 Testing Checklist

- [ ] Global search finds results across modules
- [ ] Filters update URL query params (shareable links)
- [ ] Filter chips can be removed individually
- [ ] Clear all filters works
- [ ] Saved filters persist after page refresh
- [ ] Default filter auto-applies
- [ ] Sort toggles between asc/desc
- [ ] Export CSV contains correct filtered data
- [ ] Export PDF includes filter summary
- [ ] Mobile responsive (filters in drawer/modal)
- [ ] Fast performance with 1000+ records
- [ ] RLS policies enforce company isolation

---

## 📝 Success Criteria

✅ **Phase 15 Complete When:**
1. Global search working from navbar
2. All 6 modules have advanced filters
3. Saved filters functional
4. Quick filters implemented for common use cases
5. Sort works on all list views
6. CSV export of filtered data works
7. Filter state persists in URL (shareable)
8. Mobile-responsive filter UI
9. Performance: <500ms for filtered queries
10. Documentation updated

---

## 🎨 UI/UX Design Notes

### Filter Panel Layout
```
┌─────────────────────────────────────┐
│ 🔍 Filters                    [×]   │
├─────────────────────────────────────┤
│ 📅 Date Range                       │
│ [Start Date] to [End Date]          │
│                                     │
│ 📊 Status                          │
│ ☐ Pending  ☐ Approved              │
│ ☐ Rejected ☐ Completed             │
│                                     │
│ 💰 Amount Range                    │
│ $[Min] to $[Max]                    │
│                                     │
│ 🏗️ Project                         │
│ [Select Project ▼]                  │
│                                     │
│ [Clear All]  [Apply Filters]        │
└─────────────────────────────────────┘
```

### Active Filters Display
```
Showing 23 orders:
[Status: Pending ×] [Project: Building A ×] [Amount: $100-$500 ×]  [Clear All]
```

### Quick Filters Bar
```
[All] [Pending] [This Week] [This Month] [High Value] [My Orders]
```

---

## 🚀 Phase 15 Benefits

**For Users:**
- ⚡ Find data 10x faster
- 📊 Better insights with filtered views
- 💾 Save time with saved filters
- 📤 Export exactly what they need

**For Business:**
- 📈 Increased productivity
- 🎯 Better decision making
- 📊 Data-driven insights
- 💼 Professional reporting

**Technical:**
- 🏗️ Reusable filter components
- 📚 Consistent UX across modules
- ⚡ Optimized database queries
- 🔒 Security with RLS

---

## 📚 Documentation

Files to create:
1. `FILTERS-USER-GUIDE.md` - How to use filters and search
2. `FILTERS-API-DOCS.md` - API documentation for developers
3. `SAVED-FILTERS-GUIDE.md` - How to save and manage filters

---

## 🎯 Ready to Start?

**Phase 15: Advanced Search & Filtering**  
This will dramatically improve user experience and productivity!

**Estimated Time:** 3-4 hours  
**Impact:** 🔥 HIGH - Users will love this!

**Let's begin with Step 1: Database Setup!** 🚀
