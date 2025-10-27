-- ============================================================================
-- PHASE 2 VERIFICATION SCRIPT
-- Verifies all Client, Contractor & Bids features are properly set up
-- ============================================================================

-- Check if clients table exists and has data
SELECT 
  'Clients Table' as feature,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') as exists,
  (SELECT COUNT(*) FROM clients) as record_count,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'clients') as column_count
UNION ALL

-- Check if contractors table exists and has data
SELECT 
  'Contractors Table' as feature,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'contractors') as exists,
  (SELECT COUNT(*) FROM contractors) as record_count,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'contractors') as column_count
UNION ALL

-- Check if bids table exists and has data
SELECT 
  'Bids Table' as feature,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'bids') as exists,
  (SELECT COUNT(*) FROM bids) as record_count,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'bids') as column_count;

-- ============================================================================
-- Check RLS Policies
-- ============================================================================

SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename IN ('clients', 'contractors', 'bids')
ORDER BY tablename, cmd;

-- ============================================================================
-- Check Activity Log Integration
-- ============================================================================

SELECT 
  activity_type,
  COUNT(*) as count
FROM activity_logs
WHERE activity_type IN ('client', 'contractor', 'bid')
GROUP BY activity_type
ORDER BY activity_type;

-- ============================================================================
-- Summary Statistics
-- ============================================================================

SELECT 
  'Summary' as section,
  (SELECT COUNT(*) FROM clients WHERE status = 'active') as active_clients,
  (SELECT COUNT(*) FROM contractors WHERE status = 'active') as active_contractors,
  (SELECT COUNT(*) FROM bids WHERE status = 'pending') as pending_bids,
  (SELECT COUNT(*) FROM bids WHERE status = 'approved') as approved_bids,
  (SELECT COUNT(*) FROM bids WHERE status = 'rejected') as rejected_bids;
