-- ============================================================
-- DELAY SHIELD™ FULL TEST FLOW
-- Run this in Supabase SQL Editor to test the ENTIRE flow
-- From detection → alert → apply → completion
-- ============================================================

-- ============================================================
-- STEP 0: Find your Enterprise company
-- ============================================================
SELECT id, name, plan FROM companies WHERE plan = 'enterprise' LIMIT 5;

-- Copy the company ID you want to use below
-- Example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

-- ============================================================
-- STEP 1: CREATE TEST PROJECT WITH HIGH RISK DATA
-- ============================================================

DO $$
DECLARE
  v_company_id UUID;
  v_project_id UUID;
  v_user_id UUID;
BEGIN
  -- Get enterprise company
  SELECT id INTO v_company_id FROM companies WHERE plan = 'enterprise' LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No Enterprise company found. Please ensure you have a company with plan = enterprise';
  END IF;
  
  -- Get a user from that company
  SELECT id INTO v_user_id FROM profiles WHERE company_id = v_company_id LIMIT 1;
  
  RAISE NOTICE '✅ Using Company ID: %', v_company_id;
  RAISE NOTICE '✅ Using User ID: %', v_user_id;

  -- Delete existing test project if any
  DELETE FROM projects WHERE name = 'Delay Shield Test - Full Flow' AND company_id = v_company_id;

  -- Create high-risk test project
  INSERT INTO projects (
    id,
    company_id,
    name,
    project_number,
    status,
    budget,
    start_date,
    end_date,
    description,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    'Delay Shield Test - Full Flow',
    'DS-FULL-001',
    'active',
    750000,  -- $750k budget for big impact numbers
    CURRENT_DATE - INTERVAL '45 days',
    CURRENT_DATE + INTERVAL '45 days',
    '🧪 TEST PROJECT: For testing Delay Shield full flow. Contains intentionally risky data.',
    NOW()
  )
  RETURNING id INTO v_project_id;

  RAISE NOTICE '✅ Created Project ID: %', v_project_id;

  -- Create late pending orders (triggers supplier risk)
  INSERT INTO purchase_orders (company_id, project_id, vendor, description, amount, status, requested_by, created_at)
  VALUES 
    (v_company_id, v_project_id, 'Slow Steel Supplier', 'Steel beams - 50 tons - CRITICAL PATH', 85000, 'pending', v_user_id, NOW() - INTERVAL '12 days'),
    (v_company_id, v_project_id, 'Delayed Concrete Co', 'Ready-mix concrete - 300 yards', 42000, 'pending', v_user_id, NOW() - INTERVAL '8 days'),
    (v_company_id, v_project_id, 'Late Electrical Supply', 'Main panel and wiring - DELAYED', 28000, 'pending', v_user_id, NOW() - INTERVAL '14 days'),
    (v_company_id, v_project_id, 'On-Time Plumbing', 'Plumbing fixtures', 15000, 'approved', v_user_id, NOW() - INTERVAL '2 days');

  RAISE NOTICE '✅ Created 4 purchase orders (3 late, 1 normal)';

  -- Create overdue milestones (triggers timeline risk)
  INSERT INTO project_milestones (project_id, company_id, name, description, target_date, completed, created_at)
  VALUES
    (v_project_id, v_company_id, 'Foundation Complete', 'Concrete foundation poured and cured', CURRENT_DATE - INTERVAL '5 days', false, NOW()),
    (v_project_id, v_company_id, 'Steel Erection Start', 'Begin structural steel installation', CURRENT_DATE - INTERVAL '2 days', false, NOW()),
    (v_project_id, v_company_id, 'Rough Inspection', 'City inspection for rough-in work', CURRENT_DATE + INTERVAL '7 days', false, NOW());

  RAISE NOTICE '✅ Created 3 milestones (2 overdue, 1 upcoming)';

END $$;

-- Verify test project created
SELECT 
  '📋 TEST PROJECT' as type,
  id,
  name,
  budget,
  status
FROM projects 
WHERE name = 'Delay Shield Test - Full Flow';

-- ============================================================
-- STEP 2: CREATE THE DELAY SHIELD ALERT (Simulating AI Scan)
-- ============================================================

DO $$
DECLARE
  v_company_id UUID;
  v_project_id UUID;
  v_alert_id UUID;
BEGIN
  -- Get the test project
  SELECT p.id, p.company_id INTO v_project_id, v_company_id
  FROM projects p
  WHERE p.name = 'Delay Shield Test - Full Flow'
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Test project not found. Run STEP 1 first.';
  END IF;

  -- Delete any existing alert for this project
  DELETE FROM delay_shield_alerts WHERE project_id = v_project_id;

  -- Create a HIGH RISK alert with all the data
  INSERT INTO delay_shield_alerts (
    id,
    company_id,
    project_id,
    risk_score,
    risk_level,
    predicted_delay_days,
    financial_impact,
    contributing_factors,
    recovery_options,
    email_draft,
    status,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    v_project_id,
    0.82,  -- 82% risk score
    'high',
    12,    -- 12 days predicted delay
    89500, -- $89,500 financial impact
    -- Contributing factors (JSON array)
    '[
      {
        "type": "supplier",
        "name": "Slow Steel Supplier",
        "issue": "Order pending for 12+ days - steel is critical path item",
        "severity": "high",
        "confidence": 0.95
      },
      {
        "type": "supplier", 
        "name": "Late Electrical Supply",
        "issue": "Order pending for 14 days - blocking electrical rough-in",
        "severity": "high",
        "confidence": 0.92
      },
      {
        "type": "timeline",
        "name": "Foundation Complete",
        "issue": "Milestone overdue by 5 days",
        "severity": "medium",
        "confidence": 0.88
      },
      {
        "type": "timeline",
        "name": "Steel Erection Start", 
        "issue": "Milestone overdue by 2 days - blocked by steel delivery",
        "severity": "high",
        "confidence": 0.90
      }
    ]'::jsonb,
    -- Recovery options (JSON array with 3 options)
    '[
      {
        "id": 1,
        "name": "Express Steel + Overtime Crews",
        "type": "fastest",
        "cost": 28500,
        "time_saved_days": 10,
        "description": "Switch to express steel supplier with air freight, add weekend overtime crews to accelerate foundation and steel work.",
        "action_items": [
          "Contact ABC Express Steel for same-day quote",
          "Approve air freight surcharge ($8,500)",
          "Schedule weekend overtime crew ($12,000)",
          "Notify client of recovery plan",
          "Update project timeline"
        ],
        "recommended": true
      },
      {
        "id": 2,
        "name": "Local Steel Alternative",
        "type": "cheapest",
        "cost": 8500,
        "time_saved_days": 5,
        "description": "Source steel from local supplier with 5-day delivery. Partial acceleration with selective overtime.",
        "action_items": [
          "Get quotes from 3 local steel suppliers",
          "Accept 5% material cost increase",
          "Schedule 2 overtime shifts",
          "Adjust milestone dates",
          "Notify subcontractors of new schedule"
        ],
        "recommended": false
      },
      {
        "id": 3,
        "name": "Balanced Recovery Plan",
        "type": "balanced",
        "cost": 15000,
        "time_saved_days": 8,
        "description": "Expedite steel with ground shipping + strategic overtime on critical path items only.",
        "action_items": [
          "Expedite steel order with ground shipping",
          "Add overtime for steel erection crew only",
          "Re-sequence electrical work around steel",
          "Update client on 4-day delay (vs 12)",
          "Document change order"
        ],
        "recommended": false
      }
    ]'::jsonb,
    -- Email draft (JSON)
    '{
      "to": ["supplier@example.com", "pm@example.com"],
      "subject": "🚨 Urgent: Delay Shield Alert - Delay Shield Test Project",
      "body": "Dear Team,\n\nOur AI system has detected a HIGH risk of 12-day delay on the Delay Shield Test project.\n\nFinancial Impact: $89,500\n\nKey Issues:\n- Steel delivery severely delayed (12+ days pending)\n- Electrical supply delayed (14 days pending)\n- Foundation milestone overdue by 5 days\n\nRecommended Action: Express Steel + Overtime Crews\nCost: $28,500\nTime Saved: 10 days\n\nPlease review and approve the recovery plan.\n\nBest regards,\nDelay Shield AI"
    }'::jsonb,
    'active',
    NOW()
  )
  RETURNING id INTO v_alert_id;

  RAISE NOTICE '✅ Created Alert ID: %', v_alert_id;
  RAISE NOTICE '🎯 Go to /delay-shield to see and test the alert!';

END $$;

-- ============================================================
-- STEP 3: VERIFY EVERYTHING IS SET UP
-- ============================================================

-- Check the alert
SELECT 
  '🛡️ DELAY SHIELD ALERT' as type,
  id,
  risk_level,
  risk_score,
  predicted_delay_days,
  financial_impact,
  status,
  created_at
FROM delay_shield_alerts
WHERE project_id = (SELECT id FROM projects WHERE name = 'Delay Shield Test - Full Flow')
ORDER BY created_at DESC
LIMIT 1;

-- Check contributing factors
SELECT 
  '⚠️ RISK FACTORS' as type,
  cf->>'type' as factor_type,
  cf->>'name' as factor_name,
  cf->>'issue' as issue,
  cf->>'severity' as severity
FROM delay_shield_alerts,
LATERAL jsonb_array_elements(contributing_factors) as cf
WHERE project_id = (SELECT id FROM projects WHERE name = 'Delay Shield Test - Full Flow')
AND status = 'active';

-- Check recovery options
SELECT 
  '💡 RECOVERY OPTIONS' as type,
  ro->>'id' as option_id,
  ro->>'name' as option_name,
  ro->>'type' as option_type,
  (ro->>'cost')::numeric as cost,
  (ro->>'time_saved_days')::int as days_saved,
  ro->>'recommended' as recommended
FROM delay_shield_alerts,
LATERAL jsonb_array_elements(recovery_options) as ro
WHERE project_id = (SELECT id FROM projects WHERE name = 'Delay Shield Test - Full Flow')
AND status = 'active';

-- Check late orders
SELECT 
  '📦 LATE ORDERS' as type,
  vendor,
  amount,
  status,
  created_at,
  NOW() - created_at as pending_duration
FROM purchase_orders
WHERE project_id = (SELECT id FROM projects WHERE name = 'Delay Shield Test - Full Flow')
AND status = 'pending'
ORDER BY created_at;

-- Check overdue milestones
SELECT 
  '🎯 OVERDUE MILESTONES' as type,
  name,
  target_date,
  CURRENT_DATE - target_date as days_overdue
FROM project_milestones
WHERE project_id = (SELECT id FROM projects WHERE name = 'Delay Shield Test - Full Flow')
AND completed = false
AND target_date < CURRENT_DATE;

-- ============================================================
-- STEP 4: TEST THE APPLY FLOW (Manual SQL version)
-- This simulates what happens when user clicks "Apply & Execute All"
-- ============================================================

-- Run this AFTER you've verified the alert exists
-- It simulates applying Option 1 (Express Steel + Overtime)

*
DO $$
DECLARE
  v_alert_id UUID;
  v_project_id UUID;
  v_company_id UUID;
  v_user_id UUID;
  v_change_order_id UUID;
  v_selected_option JSONB;
BEGIN
  -- Get the active alert
  SELECT id, project_id, company_id, recovery_options->0 
  INTO v_alert_id, v_project_id, v_company_id, v_selected_option
  FROM delay_shield_alerts
  WHERE status = 'active'
  AND project_id = (SELECT id FROM projects WHERE name = 'Delay Shield Test - Full Flow')
  LIMIT 1;

  IF v_alert_id IS NULL THEN
    RAISE EXCEPTION 'No active alert found';
  END IF;

  -- Get user
  SELECT id INTO v_user_id FROM profiles WHERE company_id = v_company_id LIMIT 1;

  RAISE NOTICE '🚀 Applying Option: %', v_selected_option->>'name';

  -- 1. CREATE CHANGE ORDER
  INSERT INTO change_orders (
    id,
    company_id,
    project_id,
    description,
    reason,
    cost_delta,
    status,
    created_by,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    v_project_id,
    'Delay Shield™ Mitigation: ' || (v_selected_option->>'name'),
    'Applied recovery option to mitigate 12-day predicted delay. ' || (v_selected_option->>'description'),
    (v_selected_option->>'cost')::numeric,
    'pending',
    v_user_id,
    NOW()
  )
  RETURNING id INTO v_change_order_id;

  RAISE NOTICE '✅ Created Change Order: %', v_change_order_id;

  -- 2. CREATE IN-APP NOTIFICATIONS (for all team members)
  INSERT INTO notifications (user_id, company_id, type, title, message, link, metadata, read, created_at)
  SELECT 
    p.id,
    v_company_id,
    'project_update',
    '🛡️ Delay Shield™: Recovery Plan Applied',
    (v_selected_option->>'name') || ' has been applied. Predicted to save ' || (v_selected_option->>'time_saved_days') || ' days.',
    '/delay-shield',
    jsonb_build_object('alert_id', v_alert_id, 'option_name', v_selected_option->>'name'),
    false,
    NOW()
  FROM profiles p
  WHERE p.company_id = v_company_id;

  RAISE NOTICE '✅ Created notifications for team members';

  -- 3. UPDATE PROJECT BUDGET
  UPDATE projects
  SET budget = budget + (v_selected_option->>'cost')::numeric,
      updated_at = NOW()
  WHERE id = v_project_id;

  RAISE NOTICE '✅ Updated project budget (+$%)', (v_selected_option->>'cost');

  -- 4. MARK ALERT AS APPLIED
  UPDATE delay_shield_alerts
  SET 
    status = 'applied',
    applied_option_id = 1,
    applied_at = NOW(),
    applied_by = v_user_id,
    change_order_id = v_change_order_id
  WHERE id = v_alert_id;

  RAISE NOTICE '✅ Alert marked as applied';

  -- 5. CREATE ACTIVITY LOG
  INSERT INTO activity_logs (company_id, user_id, type, action, title, description, entity_type, entity_id, status, metadata, created_at)
  VALUES (
    v_company_id,
    v_user_id,
    'delay_shield',
    'delay_shield_applied',
    'Delay Shield: Applied ' || (v_selected_option->>'name'),
    'Recovery plan applied to mitigate 12-day predicted delay.',
    'project',
    v_project_id,
    'success',
    jsonb_build_object(
      'alert_id', v_alert_id,
      'option_name', v_selected_option->>'name',
      'option_type', v_selected_option->>'type',
      'estimated_cost', (v_selected_option->>'cost')::numeric,
      'time_saved_days', (v_selected_option->>'time_saved_days')::int,
      'change_order_id', v_change_order_id
    ),
    NOW()
  );

  RAISE NOTICE '✅ Activity logged';
  RAISE NOTICE '🎉 COMPLETE! Check the results below.';

END $$;
*/

-- ============================================================
-- STEP 5: VERIFY AFTER APPLYING (Uncomment Step 4 first)
-- ============================================================

-- Check alert status changed
SELECT 
  '🛡️ ALERT STATUS' as check_type,
  id,
  status,
  applied_option_id,
  applied_at,
  change_order_id
FROM delay_shield_alerts
WHERE project_id = (SELECT id FROM projects WHERE name = 'Delay Shield Test - Full Flow');

-- Check change order created
SELECT 
  '📋 CHANGE ORDER' as check_type,
  id,
  description,
  cost_delta,
  status,
  created_at
FROM change_orders
WHERE project_id = (SELECT id FROM projects WHERE name = 'Delay Shield Test - Full Flow')
AND description LIKE 'Delay Shield%'
ORDER BY created_at DESC
LIMIT 1;

-- Check notifications created
SELECT 
  '🔔 NOTIFICATIONS' as check_type,
  COUNT(*) as notification_count,
  MAX(title) as sample_title
FROM notifications
WHERE title LIKE '%Delay Shield%'
AND created_at > NOW() - INTERVAL '1 hour';

-- Check activity log
SELECT 
  '📝 ACTIVITY LOG' as check_type,
  action,
  meta->>'option_name' as applied_option,
  meta->>'estimated_cost' as cost,
  meta->>'time_saved_days' as days_saved,
  created_at
FROM activity_logs
WHERE action = 'delay_shield_applied'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================
-- CLEANUP (Optional - run when done testing)
-- ============================================================

/*
-- Delete test data
DELETE FROM delay_shield_alerts WHERE project_id = (SELECT id FROM projects WHERE name = 'Delay Shield Test - Full Flow');
DELETE FROM change_orders WHERE project_id = (SELECT id FROM projects WHERE name = 'Delay Shield Test - Full Flow');
DELETE FROM activity_logs WHERE entity_id = (SELECT id FROM projects WHERE name = 'Delay Shield Test - Full Flow');
DELETE FROM notifications WHERE title LIKE '%Delay Shield%';
DELETE FROM project_milestones WHERE project_id = (SELECT id FROM projects WHERE name = 'Delay Shield Test - Full Flow');
DELETE FROM purchase_orders WHERE project_id = (SELECT id FROM projects WHERE name = 'Delay Shield Test - Full Flow');
DELETE FROM projects WHERE name = 'Delay Shield Test - Full Flow';

RAISE NOTICE '🧹 Cleanup complete!';
*/

-- ============================================================
-- 🎯 TESTING INSTRUCTIONS
-- ============================================================
-- 
-- 1. Run STEP 0 to find your Enterprise company ID
-- 2. Run STEP 1 to create the test project with risky data
-- 3. Run STEP 2 to create the Delay Shield alert
-- 4. Run STEP 3 to verify everything is set up
-- 5. Go to your app at /delay-shield - you should see the alert!
-- 6. Click "View" on the alert and test the UI
-- 7. Click "Apply & Execute All" to test the full flow
-- 8. Run STEP 5 queries to verify everything was created
--
-- OR to test entirely via SQL:
-- - Uncomment and run STEP 4 to simulate applying via SQL
-- - Run STEP 5 to verify
-- ============================================================
