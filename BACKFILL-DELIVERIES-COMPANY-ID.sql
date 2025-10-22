-- BACKFILL-DELIVERIES-COMPANY-ID.sql
-- Purpose: Ensure all your recent deliveries are assigned to your company_id so filters and policies match.
-- Replace the placeholders or let the dynamic block auto-detect from your latest profile.

DO $$
DECLARE
  uid uuid;
  cid uuid;
  updated_count int;
BEGIN
  -- Auto-detect: pick the most recently active profile
  SELECT id, company_id INTO uid, cid
  FROM public.profiles
  WHERE company_id IS NOT NULL
  ORDER BY updated_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF uid IS NULL OR cid IS NULL THEN
    RAISE NOTICE 'No profile with company_id found; backfill skipped.';
    RETURN;
  END IF;

  UPDATE public.deliveries d
  SET company_id = cid
  WHERE d.company_id IS NULL
    AND d.created_by = uid;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled % deliveries with company_id=% for user=%', updated_count, cid, uid;
END $$;

-- Refresh cache
NOTIFY pgrst, 'reload schema';

-- Show counts after backfill
SELECT 'DELIVERIES_COUNTS' AS section,
  COUNT(*) FILTER (WHERE company_id IS NULL) AS null_company,
  COUNT(*) FILTER (WHERE company_id IS NOT NULL) AS with_company
FROM public.deliveries;
