-- Test Script: Notification Scheduler System
-- Issue #173
--
-- This script tests all components of the notification scheduler system
-- Run in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Verify Configuration
-- ============================================================================

SELECT 'Step 1: Checking configuration...' AS status;

SELECT test_notification_config();

-- Expected output:
-- {
--   "supabase_url_configured": true,
--   "service_role_key_configured": true,
--   "pg_cron_installed": true,
--   "http_extension_installed": true,
--   "cron_job_exists": true,
--   "test_timestamp": "2026-01-29T..."
-- }

-- ============================================================================
-- STEP 2: Verify Tables Exist
-- ============================================================================

SELECT 'Step 2: Checking tables...' AS status;

SELECT
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_notifications') AS scheduled_notifications_exists,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_templates') AS notification_templates_exists,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_log') AS notification_log_exists;

-- ============================================================================
-- STEP 3: Check CRON Jobs
-- ============================================================================

SELECT 'Step 3: Checking CRON jobs...' AS status;

SELECT
  jobname,
  schedule,
  active,
  database
FROM cron.job
WHERE jobname LIKE '%notification%';

-- Expected: 3 jobs
-- - process-scheduled-notifications (*/5 * * * *)
-- - cleanup-notification-logs (0 3 * * *)
-- - mark-expired-notifications (0 * * * *)

-- ============================================================================
-- STEP 4: Check Templates
-- ============================================================================

SELECT 'Step 4: Checking templates...' AS status;

SELECT
  template_key,
  template_name,
  notification_type,
  is_system,
  is_active
FROM notification_templates
WHERE is_system = true;

-- Expected: 4 system templates

-- ============================================================================
-- STEP 5: Test Creating Notification (as user)
-- ============================================================================

SELECT 'Step 5: Creating test notification...' AS status;

-- Note: This requires an authenticated user context
-- In production, this would be done via frontend/service

-- Simulate creating a notification
INSERT INTO scheduled_notifications (
  user_id,
  target_phone,
  target_name,
  notification_type,
  message_template,
  message_variables,
  scheduled_for,
  priority
)
VALUES (
  auth.uid(),  -- Current user
  '5511987654321',
  'Test User',
  'reminder',
  'Test notification: {{message}}',
  '{"message": "Hello from test script!"}'::jsonb,
  now() + INTERVAL '5 minutes',  -- Schedule 5 minutes from now
  5
)
RETURNING id, status, scheduled_for;

-- ============================================================================
-- STEP 6: Test RPC Functions
-- ============================================================================

SELECT 'Step 6: Testing RPC functions...' AS status;

-- Test get_notification_stats
SELECT get_notification_stats(auth.uid());

-- Expected output:
-- {
--   "total_scheduled": 1,
--   "total_sent": 0,
--   "total_failed": 0,
--   "success_rate": 0,
--   "next_scheduled": "2026-01-29T...",
--   "last_sent": null
-- }

-- ============================================================================
-- STEP 7: Test Manual Processing Trigger
-- ============================================================================

SELECT 'Step 7: Testing manual processing trigger...' AS status;

-- This will attempt to process notifications
SELECT trigger_notification_processing();

-- Check logs after trigger
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-scheduled-notifications')
ORDER BY start_time DESC
LIMIT 1;

-- ============================================================================
-- STEP 8: Check System Health
-- ============================================================================

SELECT 'Step 8: Checking system health...' AS status;

SELECT * FROM notification_system_health;

-- ============================================================================
-- STEP 9: Test Recurrence Function
-- ============================================================================

SELECT 'Step 9: Testing recurrence function...' AS status;

-- Create a recurring notification
INSERT INTO scheduled_notifications (
  user_id,
  target_phone,
  target_name,
  notification_type,
  message_template,
  scheduled_for,
  is_recurring,
  recurrence_pattern,
  priority
)
VALUES (
  auth.uid(),
  '5511987654321',
  'Test User',
  'daily_report',
  'Daily test message',
  now() + INTERVAL '1 day',
  true,
  'daily',
  5
)
RETURNING id;

-- Test creating next occurrence
-- Note: Replace <notification_id> with actual ID from above
-- SELECT create_next_recurring_notification('<notification_id>');

-- ============================================================================
-- STEP 10: Test Cleanup Functions
-- ============================================================================

SELECT 'Step 10: Testing cleanup functions...' AS status;

-- Test mark expired (should not affect recent notifications)
SELECT mark_expired_notifications();

-- Test cleanup old logs (should not affect recent logs)
SELECT cleanup_old_notification_logs();

-- ============================================================================
-- STEP 11: Verify RLS Policies
-- ============================================================================

SELECT 'Step 11: Checking RLS policies...' AS status;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('scheduled_notifications', 'notification_templates', 'notification_log')
ORDER BY tablename, policyname;

-- ============================================================================
-- STEP 12: Check Indexes
-- ============================================================================

SELECT 'Step 12: Checking indexes...' AS status;

SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('scheduled_notifications', 'notification_templates', 'notification_log')
ORDER BY tablename, indexname;

-- Expected indexes on scheduled_notifications:
-- - idx_scheduled_notifications_pending
-- - idx_scheduled_notifications_user
-- - idx_scheduled_notifications_rate_limit
-- - idx_scheduled_notifications_recurring
-- - idx_scheduled_notifications_status

-- ============================================================================
-- STEP 13: Test Query Performance
-- ============================================================================

SELECT 'Step 13: Testing query performance...' AS status;

-- This should use idx_scheduled_notifications_pending
EXPLAIN ANALYZE
SELECT id, priority, scheduled_for
FROM scheduled_notifications
WHERE status = 'scheduled'
  AND scheduled_for <= now()
  AND deleted_at IS NULL
ORDER BY priority ASC, scheduled_for ASC
LIMIT 50;

-- Check that Index Scan is used, not Seq Scan

-- ============================================================================
-- STEP 14: Simulate Processing Cycle
-- ============================================================================

SELECT 'Step 14: Simulating full processing cycle...' AS status;

-- 1. Create immediate notification
WITH new_notif AS (
  INSERT INTO scheduled_notifications (
    user_id,
    target_phone,
    notification_type,
    message_template,
    scheduled_for,
    priority
  )
  VALUES (
    auth.uid(),
    '5511987654321',
    'custom',
    'Immediate test notification',
    now(),  -- Schedule for now
    1  -- High priority
  )
  RETURNING id
)
SELECT 'Created notification: ' || id AS result FROM new_notif;

-- 2. Trigger processing
SELECT trigger_notification_processing();

-- 3. Wait a few seconds, then check status
SELECT
  id,
  status,
  attempts,
  sent_at,
  last_error
FROM scheduled_notifications
WHERE user_id = auth.uid()
  AND created_at > now() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- 4. Check logs
SELECT
  attempt_number,
  status,
  error_message,
  duration_ms,
  created_at
FROM notification_log
WHERE user_id = auth.uid()
  AND created_at > now() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 15: Clean Up Test Data
-- ============================================================================

SELECT 'Step 15: Cleaning up test data...' AS status;

-- Soft delete test notifications
UPDATE scheduled_notifications
SET deleted_at = now()
WHERE user_id = auth.uid()
  AND notification_type IN ('reminder', 'custom', 'daily_report')
  AND message_template LIKE '%test%'
  AND created_at > now() - INTERVAL '1 hour';

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 'Test Summary' AS status;

SELECT
  'Configuration' AS component,
  CASE
    WHEN (test_notification_config()->>'supabase_url_configured')::boolean
     AND (test_notification_config()->>'service_role_key_configured')::boolean
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS status

UNION ALL

SELECT
  'CRON Jobs' AS component,
  CASE
    WHEN (SELECT COUNT(*) FROM cron.job WHERE jobname LIKE '%notification%') = 3
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS status

UNION ALL

SELECT
  'Templates' AS component,
  CASE
    WHEN (SELECT COUNT(*) FROM notification_templates WHERE is_system = true) >= 4
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS status

UNION ALL

SELECT
  'RLS Policies' AS component,
  CASE
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'scheduled_notifications') >= 3
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS status

UNION ALL

SELECT
  'Indexes' AS component,
  CASE
    WHEN (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'scheduled_notifications') >= 5
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS status;

-- ============================================================================
-- DONE
-- ============================================================================

SELECT 'All tests completed!' AS status;
SELECT 'Check results above for any failures.' AS note;
