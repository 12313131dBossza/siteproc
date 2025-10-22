-- RLS-ALLOW-OWN-AND-COMPANY-DELIVERIES.sql
-- Purpose: Ensure authenticated users can SELECT deliveries:
--  - in their company (company_id matches their profile), OR
--  - that they personally created (created_by = auth.uid()), even if company_id is NULL.
-- Also ensures delivery_items are visible when their parent delivery is visible.

BEGIN;

-- Deliveries: enable RLS (no-op if already enabled)
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Drop conflicting policies that might block reads
DROP POLICY IF EXISTS "allow_company_select_deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_select_company" ON public.deliveries;

-- Create permissive SELECT policy covering both company and creator fallback
CREATE POLICY "deliveries_select_company_or_creator"
ON public.deliveries
FOR SELECT
TO authenticated
USING (
  (company_id IS NOT NULL AND company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ))
  OR (created_by = auth.uid())
);

-- Delivery items: enable RLS
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;

-- Drop conflicting policies
DROP POLICY IF EXISTS "allow_company_select_delivery_items" ON public.delivery_items;

-- Create SELECT policy chaining visibility to parent deliveries
CREATE POLICY "delivery_items_select_parent_visible"
ON public.delivery_items
FOR SELECT
TO authenticated
USING (
  delivery_id IN (
    SELECT id FROM public.deliveries WHERE (
      (company_id IS NOT NULL AND company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
      ))
      OR (created_by = auth.uid())
    )
  )
);

COMMIT;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';

-- Quick checks
SELECT 'POLICY_CHECK' AS section, tablename, policyname, cmd, roles, permissive
FROM pg_policies WHERE tablename IN ('deliveries','delivery_items') ORDER BY tablename, policyname;
