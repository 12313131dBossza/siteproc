-- ============================================================================
-- PHASE 1C: PROJECT AUTO-CALC TRIGGERS
-- ============================================================================
-- This migration creates database triggers to automatically:
-- 1. Calculate actual_expenses when expenses are approved/updated/deleted
-- 2. Calculate variance (budget - actual_expenses)
-- 3. Update project totals in real-time
-- ============================================================================

-- Step 1: Add actual_expenses and variance columns to projects table (if not exist)
DO $$ 
BEGIN
    -- Add actual_expenses column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'actual_expenses'
    ) THEN
        ALTER TABLE projects ADD COLUMN actual_expenses NUMERIC(12, 2) DEFAULT 0;
        RAISE NOTICE '✅ Added actual_expenses column to projects table';
    ELSE
        RAISE NOTICE '⏭️  actual_expenses column already exists';
    END IF;

    -- Add variance column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'variance'
    ) THEN
        ALTER TABLE projects ADD COLUMN variance NUMERIC(12, 2) DEFAULT 0;
        RAISE NOTICE '✅ Added variance column to projects table';
    ELSE
        RAISE NOTICE '⏭️  variance column already exists';
    END IF;
END $$;

-- Step 2: Create function to recalculate project totals
CREATE OR REPLACE FUNCTION recalculate_project_totals(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_expenses NUMERIC(12, 2);
    v_budget NUMERIC(12, 2);
    v_variance NUMERIC(12, 2);
BEGIN
    -- Get current budget
    SELECT budget INTO v_budget
    FROM projects
    WHERE id = p_project_id;

    -- Calculate total approved expenses for this project
    SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
    FROM expenses
    WHERE project_id = p_project_id
    AND status = 'approved';

    -- Calculate variance (budget - actual)
    v_variance := COALESCE(v_budget, 0) - v_total_expenses;

    -- Update project with new totals
    UPDATE projects
    SET 
        actual_expenses = v_total_expenses,
        variance = v_variance,
        updated_at = NOW()
    WHERE id = p_project_id;

    RAISE NOTICE '✅ Recalculated project % - Budget: %, Actual: %, Variance: %', 
        p_project_id, v_budget, v_total_expenses, v_variance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION recalculate_project_totals TO authenticated;

COMMENT ON FUNCTION recalculate_project_totals IS 'Recalculates actual_expenses and variance for a project based on approved expenses';

-- Step 3: Create trigger function for expense changes
CREATE OR REPLACE FUNCTION trigger_update_project_on_expense_change()
RETURNS TRIGGER AS $$
DECLARE
    v_old_project_id UUID;
    v_new_project_id UUID;
BEGIN
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        IF OLD.project_id IS NOT NULL THEN
            PERFORM recalculate_project_totals(OLD.project_id);
        END IF;
        RETURN OLD;
    END IF;

    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        IF NEW.project_id IS NOT NULL AND NEW.status = 'approved' THEN
            PERFORM recalculate_project_totals(NEW.project_id);
        END IF;
        RETURN NEW;
    END IF;

    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        v_old_project_id := OLD.project_id;
        v_new_project_id := NEW.project_id;

        -- Case 1: Status changed to/from approved
        IF OLD.status != NEW.status AND (OLD.status = 'approved' OR NEW.status = 'approved') THEN
            IF v_old_project_id IS NOT NULL THEN
                PERFORM recalculate_project_totals(v_old_project_id);
            END IF;
            IF v_new_project_id IS NOT NULL AND v_new_project_id != v_old_project_id THEN
                PERFORM recalculate_project_totals(v_new_project_id);
            END IF;
        END IF;

        -- Case 2: Amount changed while status is approved
        IF OLD.amount != NEW.amount AND NEW.status = 'approved' THEN
            IF v_new_project_id IS NOT NULL THEN
                PERFORM recalculate_project_totals(v_new_project_id);
            END IF;
        END IF;

        -- Case 3: Project changed
        IF v_old_project_id != v_new_project_id THEN
            IF v_old_project_id IS NOT NULL THEN
                PERFORM recalculate_project_totals(v_old_project_id);
            END IF;
            IF v_new_project_id IS NOT NULL AND NEW.status = 'approved' THEN
                PERFORM recalculate_project_totals(v_new_project_id);
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trigger_update_project_on_expense_change IS 'Automatically updates project totals when expenses are created/updated/deleted';

-- Step 4: Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS expenses_update_project_trigger ON expenses;

CREATE TRIGGER expenses_update_project_trigger
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_project_on_expense_change();

COMMENT ON TRIGGER expenses_update_project_trigger ON expenses IS 'Automatically recalculates project budgets when expenses change';

-- Step 5: Create trigger for budget changes on projects
CREATE OR REPLACE FUNCTION trigger_update_variance_on_budget_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If budget changed, recalculate variance
    IF TG_OP = 'UPDATE' AND OLD.budget != NEW.budget THEN
        NEW.variance := NEW.budget - COALESCE(NEW.actual_expenses, 0);
        RAISE NOTICE '✅ Budget changed for project % - recalculated variance: %', NEW.id, NEW.variance;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trigger_update_variance_on_budget_change IS 'Automatically updates variance when project budget changes';

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS projects_budget_change_trigger ON projects;

CREATE TRIGGER projects_budget_change_trigger
    BEFORE UPDATE ON projects
    FOR EACH ROW
    WHEN (OLD.budget IS DISTINCT FROM NEW.budget)
    EXECUTE FUNCTION trigger_update_variance_on_budget_change();

COMMENT ON TRIGGER projects_budget_change_trigger ON projects IS 'Automatically recalculates variance when project budget changes';

-- Step 6: Initial calculation - update all existing projects
DO $$
DECLARE
    v_project RECORD;
    v_updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔄 Starting initial calculation for all existing projects...';
    
    FOR v_project IN SELECT id FROM projects LOOP
        PERFORM recalculate_project_totals(v_project.id);
        v_updated_count := v_updated_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Updated % projects with current expense totals', v_updated_count;
END $$;

-- Step 7: Verification queries
DO $$
DECLARE
    v_projects_count INTEGER;
    v_with_expenses INTEGER;
    v_sample_budget NUMERIC;
    v_sample_actual NUMERIC;
    v_sample_variance NUMERIC;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ AUTO-CALC TRIGGERS INSTALLED SUCCESSFULLY!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    
    -- Count projects
    SELECT COUNT(*) INTO v_projects_count FROM projects;
    RAISE NOTICE '📊 Total projects: %', v_projects_count;
    
    -- Count projects with expenses
    SELECT COUNT(DISTINCT project_id) INTO v_with_expenses 
    FROM expenses 
    WHERE status = 'approved';
    RAISE NOTICE '💰 Projects with approved expenses: %', v_with_expenses;
    
    -- Show sample calculation
    SELECT budget, actual_expenses, variance 
    INTO v_sample_budget, v_sample_actual, v_sample_variance
    FROM projects 
    WHERE actual_expenses > 0
    LIMIT 1;
    
    IF v_sample_budget IS NOT NULL THEN
        RAISE NOTICE '';
        RAISE NOTICE '📋 SAMPLE CALCULATION:';
        RAISE NOTICE '   Budget: $%', v_sample_budget;
        RAISE NOTICE '   Actual Expenses: $%', v_sample_actual;
        RAISE NOTICE '   Variance: $%', v_sample_variance;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 WHAT THIS DOES:';
    RAISE NOTICE '   ✅ When expense is APPROVED → project.actual_expenses updates automatically';
    RAISE NOTICE '   ✅ When expense is UNAPPROVED → project.actual_expenses decreases automatically';
    RAISE NOTICE '   ✅ When expense amount changes → project.actual_expenses recalculates';
    RAISE NOTICE '   ✅ When project budget changes → variance recalculates';
    RAISE NOTICE '   ✅ Variance = Budget - Actual Expenses (always in sync)';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TEST IT:';
    RAISE NOTICE '   1. Create/approve an expense → Check project.actual_expenses';
    RAISE NOTICE '   2. Update expense amount → Check project updates automatically';
    RAISE NOTICE '   3. Change expense status → Check project recalculates';
    RAISE NOTICE '   4. Change project budget → Check variance updates';
    RAISE NOTICE '';
END $$;

-- Query to show current project budgets
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
    COUNT(e.id) as approved_expenses_count
FROM projects p
LEFT JOIN expenses e ON e.project_id = p.id AND e.status = 'approved'
GROUP BY p.id, p.name, p.budget, p.actual_expenses, p.variance
ORDER BY p.created_at DESC
LIMIT 10;
