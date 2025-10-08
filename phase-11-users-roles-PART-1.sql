-- =====================================================
-- Phase 11: Users & Roles Management (PART 1 - Enum Setup)
-- =====================================================
-- Run this FIRST, then run PART 2

-- Step 1: Create or update user_role enum type
DO $$ 
BEGIN
  -- Try to create the enum type
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'manager', 'accountant', 'viewer');
  ELSE
    -- Enum exists, add missing values if needed
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'manager' AND enumtypid = 'user_role'::regtype) THEN
      ALTER TYPE user_role ADD VALUE 'manager';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'accountant' AND enumtypid = 'user_role'::regtype) THEN
      ALTER TYPE user_role ADD VALUE 'accountant';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'viewer' AND enumtypid = 'user_role'::regtype) THEN
      ALTER TYPE user_role ADD VALUE 'viewer';
    END IF;
  END IF;
END $$;

-- ✅ Part 1 Complete!
-- Now run phase-11-users-roles-PART-2.sql
