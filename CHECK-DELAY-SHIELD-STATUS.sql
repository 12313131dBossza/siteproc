-- ============================================================
-- DELAY SHIELD™ - QUICK VERIFICATION CHECK
-- Run this in Supabase SQL Editor to check if test data exists
-- ============================================================

-- 1. CHECK: Do you have an Enterprise company?
SELECT 
  '1️⃣ ENTERPRISE COMPANIES' as check_step,
  id,
  name,
  plan
FROM companies 
WHERE plan = 'enterprise' 
LIMIT 3;

-- 2. CHECK: Does the test project exist?
SELECT 
  '2️⃣ TEST PROJECT' as check_step,
  id,
  name,
  budget,
  status,
  company_id
FROM projects 
WHERE name LIKE '%Delay Shield Test%'
LIMIT 1;

-- 3. CHECK: Are there late purchase orders?
SELECT 
  '3️⃣ LATE ORDERS' as check_step,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status = 'pending' AND created_at < NOW() - INTERVAL '7 days') as late_orders
FROM purchase_orders
WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '%Delay Shield Test%');

-- 4. CHECK: Are there overdue milestones?
SELECT 
  '4️⃣ OVERDUE MILESTONES' as check_step,
  COUNT(*) as total_milestones,
  COUNT(*) FILTER (WHERE completed = false AND target_date < CURRENT_DATE) as overdue
FROM project_milestones
WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '%Delay Shield Test%');

-- 5. CHECK: Does the delay_shield_alerts table exist and have data?
SELECT 
  '5️⃣ DELAY SHIELD ALERT' as check_step,
  id,
  risk_level,
  risk_score,
  predicted_delay_days,
  financial_impact,
  status,
  created_at
FROM delay_shield_alerts
WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '%Delay Shield Test%')
ORDER BY created_at DESC
LIMIT 1;

-- 6. CHECK: If alert was applied, show results
SELECT 
  '6️⃣ APPLIED STATUS' as check_step,
  status,
  applied_option_id,
  applied_at,
  change_order_id
FROM delay_shield_alerts
WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '%Delay Shield Test%')
AND status = 'applied'
LIMIT 1;

-- 7. CHECK: Change orders created from Delay Shield
SELECT 
  '7️⃣ CHANGE ORDERS' as check_step,
  id,
  description,
  cost_delta,
  status,
  created_at
FROM change_orders
WHERE description LIKE '%Delay Shield%'
ORDER BY created_at DESC
LIMIT 3;

-- 8. CHECK: Notifications sent
SELECT 
  '8️⃣ NOTIFICATIONS' as check_step,
  COUNT(*) as total,
  MAX(created_at) as last_created
FROM notifications
WHERE title LIKE '%Delay Shield%';

-- 9. CHECK: Activity logs
SELECT 
  '9️⃣ ACTIVITY LOGS' as check_step,
  action,
  metadata->>'option_name' as option_applied,
  created_at
FROM activity_logs
WHERE action = 'delay_shield_applied'
ORDER BY created_at DESC
LIMIT 3;

-- ============================================================
-- SUMMARY: What should you see?
-- ============================================================
-- ✅ Check 1: At least 1 Enterprise company
-- ✅ Check 2: Test project with $750k budget
-- ✅ Check 3: 3 late orders (created 8-14 days ago)
-- ✅ Check 4: 2 overdue milestones
-- ✅ Check 5: Active alert with HIGH risk, 82% score
-- 
-- After clicking "Apply & Execute All" in the UI:
-- ✅ Check 6: Status = 'applied'
-- ✅ Check 7: Change order created
-- ✅ Check 8: Notifications sent to team
-- ✅ Check 9: Activity logged
-- ============================================================
