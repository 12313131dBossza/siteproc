# Phase 1C: Project Auto-Calc Triggers - Installation Guide

## 🎯 What This Does

Automatically syncs project budgets with approved expenses in real-time:

- ✅ **Auto-calculate actual_expenses**: When an expense is approved, `projects.actual_expenses` updates automatically
- ✅ **Auto-calculate variance**: Always in sync: `variance = budget - actual_expenses`
- ✅ **Handle all changes**: Expense approved/unapproved, amount changed, project changed, budget changed
- ✅ **Real-time sync**: No manual intervention needed

## 📦 Installation Instructions

### Method 1: Supabase Dashboard (RECOMMENDED)

1. **Open SQL Editor**:
   - Go to: https://supabase.com/dashboard/project/kylhdwtcgqzbkiyqxqfo/sql/new
   - Or: Supabase Dashboard → SQL Editor → New Query

2. **Copy SQL**:
   - Open file: `create-project-auto-calc-triggers.sql`
   - Copy entire contents (Ctrl+A, Ctrl+C)

3. **Execute**:
   - Paste into SQL Editor
   - Click "Run" or press Ctrl+Enter
   - Wait for success messages

4. **Verify**:
   - Should see green checkmarks ✅
   - Should see "AUTO-CALC TRIGGERS INSTALLED SUCCESSFULLY!"
   - Should see sample calculations at the bottom

### Method 2: Command Line (if psql installed)

```powershell
# Set password
$env:PGPASSWORD='Yaiboi@123'

# Execute SQL
psql -h aws-0-ap-southeast-1.pooler.supabase.com `
     -p 6543 `
     -U postgres.kylhdwtcgqzbkiyqxqfo `
     -d postgres `
     -f create-project-auto-calc-triggers.sql
```

## 🔍 What Gets Installed

### 1. New Columns (if not exist)
- `projects.actual_expenses` (NUMERIC) - Sum of approved expenses
- `projects.variance` (NUMERIC) - Budget minus actual expenses

### 2. Database Function
- `recalculate_project_totals(project_id)` - Recalculates totals for a project

### 3. Trigger #1: Expense Changes
- **Name**: `expenses_update_project_trigger`
- **Fires**: AFTER INSERT, UPDATE, DELETE on `expenses`
- **Actions**:
  - Expense approved → Add to project total
  - Expense unapproved → Subtract from project total
  - Amount changed (while approved) → Recalculate
  - Project changed → Update both old and new projects
  - Expense deleted → Subtract from project total

### 4. Trigger #2: Budget Changes
- **Name**: `projects_budget_change_trigger`
- **Fires**: BEFORE UPDATE on `projects` (when budget changes)
- **Actions**:
  - Budget changed → Recalculate variance automatically

### 5. Initial Data Sync
- Runs `recalculate_project_totals()` for ALL existing projects
- Ensures all current data is accurate from the start

## 🧪 Testing the Installation

### Test 1: Approve an Expense

```sql
-- Find a project and an expense
SELECT id, name, budget, actual_expenses, variance FROM projects LIMIT 1;
SELECT id, amount, status, project_id FROM expenses WHERE status != 'approved' LIMIT 1;

-- Approve the expense
UPDATE expenses SET status = 'approved' WHERE id = '<expense_id>';

-- Check project updated automatically
SELECT id, name, budget, actual_expenses, variance FROM projects WHERE id = '<project_id>';
-- actual_expenses should have increased!
```

### Test 2: Change Expense Amount

```sql
-- Change an approved expense amount
UPDATE expenses 
SET amount = amount + 100 
WHERE status = 'approved' 
LIMIT 1
RETURNING project_id;

-- Check project updated
SELECT budget, actual_expenses, variance FROM projects WHERE id = '<returned_project_id>';
-- actual_expenses should reflect the +$100 change!
```

### Test 3: Unapprove an Expense

```sql
-- Unapprove an expense
UPDATE expenses SET status = 'pending' WHERE status = 'approved' LIMIT 1 RETURNING project_id, amount;

-- Check project updated
SELECT budget, actual_expenses, variance FROM projects WHERE id = '<returned_project_id>';
-- actual_expenses should have decreased!
```

### Test 4: Change Project Budget

```sql
-- Change a project budget
UPDATE projects SET budget = budget + 1000 WHERE id = '<any_project_id>';

-- Check variance recalculated
SELECT budget, actual_expenses, variance FROM projects WHERE id = '<any_project_id>';
-- variance should have increased by $1000!
```

## 📊 Verification Queries

### Check All Projects with Calculations

```sql
SELECT 
    p.id,
    p.name,
    p.budget,
    p.actual_expenses,
    p.variance,
    CASE 
        WHEN p.budget > 0 THEN ROUND((p.actual_expenses / p.budget * 100)::numeric, 1)
        ELSE 0
    END as percent_spent,
    CASE
        WHEN p.variance < 0 THEN '❌ OVER BUDGET'
        WHEN p.variance = 0 THEN '✅ EXACT'
        ELSE '✅ UNDER BUDGET'
    END as status,
    COUNT(e.id) as approved_expenses_count
FROM projects p
LEFT JOIN expenses e ON e.project_id = p.id AND e.status = 'approved'
GROUP BY p.id, p.name, p.budget, p.actual_expenses, p.variance
ORDER BY p.created_at DESC;
```

### Check Trigger Exists

```sql
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('expenses_update_project_trigger', 'projects_budget_change_trigger');
```

### Check Columns Exist

```sql
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name IN ('actual_expenses', 'variance', 'budget');
```

## 🎉 Success Indicators

After installation, you should see:

✅ **Immediate**:
- SQL Editor shows success messages
- Green checkmarks for each step
- Sample calculations displayed
- No error messages

✅ **In Database**:
- `projects` table has `actual_expenses` and `variance` columns
- Both triggers exist and are enabled
- All projects have calculated values

✅ **In App**:
- Project detail page shows actual expenses
- Variance displays correctly
- Budget utilization percentage accurate
- Reports show correct totals

## 🐛 Troubleshooting

### Issue: "column already exists"
✅ **Safe**: Script handles this gracefully. Columns won't be recreated.

### Issue: "trigger already exists"
✅ **Safe**: Script drops and recreates triggers. Old version replaced.

### Issue: "function already exists"
✅ **Safe**: Script uses `CREATE OR REPLACE`. Function updated.

### Issue: Values are NULL or 0
- Check: Are there approved expenses? `SELECT COUNT(*) FROM expenses WHERE status = 'approved';`
- Check: Are expenses linked to projects? `SELECT COUNT(*) FROM expenses WHERE project_id IS NOT NULL;`
- Fix: Run manually: `SELECT recalculate_project_totals(id) FROM projects;`

### Issue: Trigger not firing
- Check trigger exists: See verification query above
- Check RLS policies: Ensure `expenses` table is accessible
- Check logs: Look for RAISE NOTICE messages in Supabase logs

## 📝 Next Steps After Installation

1. ✅ **Verify Installation**: Run test queries above
2. ✅ **Test in UI**: Approve an expense via the app
3. ✅ **Check Reports**: Verify numbers match in Reports page
4. ✅ **Update Frontend**: Display `actual_expenses` and `variance` in project cards
5. ✅ **Add Indicators**: Show over/under budget status with colors

## 🔗 Related Files

- `create-project-auto-calc-triggers.sql` - Main SQL migration
- `src/app/api/projects/[id]/rollup/route.ts` - API that uses these calculations
- `src/app/projects/[id]/page.tsx` - Frontend that displays these values
- `src/app/reports/page.tsx` - Reports using aggregated data

## 💡 How It Works

```
┌─────────────────┐
│  User Actions   │
└────────┬────────┘
         │
         ├─→ Approve Expense ──────────┐
         ├─→ Change Amount ────────────┤
         ├─→ Unapprove Expense ────────┤
         ├─→ Delete Expense ───────────┤
         └─→ Change Project Budget ────┤
                                       │
                                       ▼
                         ┌──────────────────────────┐
                         │  DATABASE TRIGGERS FIRE  │
                         └────────┬─────────────────┘
                                  │
                         ┌────────▼──────────┐
                         │  Recalculate:     │
                         │  - actual_expenses│
                         │  - variance       │
                         └────────┬──────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  Projects Updated│
                         │  Automatically!  │
                         └──────────────────┘
```

## ⚡ Performance Notes

- **Fast**: Triggers run in milliseconds
- **Efficient**: Only recalculates affected projects
- **Scalable**: Uses proper indexes
- **Safe**: SECURITY DEFINER with proper permissions
- **Reliable**: Handles all edge cases (NULL values, deleted records, etc.)

---

**Status**: Ready for installation  
**Estimated Time**: 1-2 minutes  
**Risk Level**: Low (idempotent, safe to re-run)  
**Rollback**: Drop triggers if needed (see below)

## 🔄 Rollback Instructions (if needed)

```sql
-- Remove triggers
DROP TRIGGER IF EXISTS expenses_update_project_trigger ON expenses;
DROP TRIGGER IF EXISTS projects_budget_change_trigger ON projects;

-- Remove functions
DROP FUNCTION IF EXISTS trigger_update_project_on_expense_change;
DROP FUNCTION IF EXISTS trigger_update_variance_on_budget_change;
DROP FUNCTION IF EXISTS recalculate_project_totals;

-- Remove columns (CAREFUL - this deletes data!)
ALTER TABLE projects DROP COLUMN IF EXISTS actual_expenses;
ALTER TABLE projects DROP COLUMN IF EXISTS variance;
```
