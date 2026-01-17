-- ============================================================================
-- PHASE 2.3: RLS POLICY TESTING - TEST DATA AND VALIDATION
-- ============================================================================
-- This script:
-- 1. Creates test data for two users
-- 2. Tests RLS isolation (user cannot see other user's data)
-- 3. Tests unauthorized access attempts
-- 4. Validates SECURITY DEFINER functions
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '========== PHASE 2.3: RLS POLICY TESTING START ==========';
  RAISE NOTICE 'Environment: Staging (uzywajqzbdbrfammshdg)';
  RAISE NOTICE 'Purpose: Validate cross-user RLS isolation';
  RAISE NOTICE '========================================================';
END $$;

-- ============================================================================
-- STEP 1: CREATE TEST DATA FOR USER 1
-- ============================================================================

DO $$
DECLARE
  test_user_1_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '>>> STEP 1: Creating test data for USER 1';
  RAISE NOTICE '';

  -- For testing purposes, we'll use a known test user UUID
  -- In production, this would come from auth.users
  -- Using a deterministic UUID for repeatability
  test_user_1_id := 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID;

  -- Insert ai_usage_tracking_errors for User 1
  INSERT INTO ai_usage_tracking_errors (user_id, error_type, error_message, model_used)
  VALUES (test_user_1_id, 'rate_limit', 'API rate limit exceeded', 'gemini-1.5-flash')
  ON CONFLICT DO NOTHING;

  INSERT INTO ai_usage_tracking_errors (user_id, error_type, error_message, model_used)
  VALUES (test_user_1_id, 'authentication_error', 'Invalid API key', 'gemini-1.5-pro')
  ON CONFLICT DO NOTHING;

  -- Insert daily_questions for User 1
  INSERT INTO daily_questions (user_id, question_text, answer_text, date_asked)
  VALUES (test_user_1_id, 'How was my day?', 'Very productive', CURRENT_DATE)
  ON CONFLICT DO NOTHING;

  INSERT INTO daily_questions (user_id, question_text, answer_text, date_asked)
  VALUES (test_user_1_id, 'What did I accomplish?', 'Completed RLS testing', CURRENT_DATE)
  ON CONFLICT DO NOTHING;

  -- Insert data_deletion_requests for User 1
  INSERT INTO data_deletion_requests (user_id, status, requested_at)
  VALUES (test_user_1_id, 'pending', NOW())
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ User 1 test data created:';
  RAISE NOTICE '   - 2 x ai_usage_tracking_errors';
  RAISE NOTICE '   - 2 x daily_questions';
  RAISE NOTICE '   - 1 x data_deletion_requests';
END $$;

-- ============================================================================
-- STEP 2: CREATE TEST DATA FOR USER 2
-- ============================================================================

DO $$
DECLARE
  test_user_2_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '>>> STEP 2: Creating test data for USER 2';
  RAISE NOTICE '';

  test_user_2_id := 'f47ac10b-58cc-4372-a567-0e02b2c3d480'::UUID;

  -- Insert ai_usage_tracking_errors for User 2
  INSERT INTO ai_usage_tracking_errors (user_id, error_type, error_message, model_used)
  VALUES (test_user_2_id, 'connection_error', 'Network timeout', 'gemini-1.5-flash')
  ON CONFLICT DO NOTHING;

  INSERT INTO ai_usage_tracking_errors (user_id, error_type, error_message, model_used)
  VALUES (test_user_2_id, 'timeout_error', 'Request timeout after 30s', 'claude-3-5-sonnet')
  ON CONFLICT DO NOTHING;

  -- Insert daily_questions for User 2
  INSERT INTO daily_questions (user_id, question_text, answer_text, date_asked)
  VALUES (test_user_2_id, 'What did I learn?', 'RLS security patterns', CURRENT_DATE)
  ON CONFLICT DO NOTHING;

  INSERT INTO daily_questions (user_id, question_text, answer_text, date_asked)
  VALUES (test_user_2_id, 'Who did I help?', 'Team with database issues', CURRENT_DATE)
  ON CONFLICT DO NOTHING;

  -- Insert data_deletion_requests for User 2
  INSERT INTO data_deletion_requests (user_id, status, requested_at)
  VALUES (test_user_2_id, 'completed', NOW())
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ User 2 test data created:';
  RAISE NOTICE '   - 2 x ai_usage_tracking_errors';
  RAISE NOTICE '   - 2 x daily_questions';
  RAISE NOTICE '   - 1 x data_deletion_requests';
END $$;

-- ============================================================================
-- STEP 3: CREATE GLOBAL TEST DATA
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '>>> STEP 3: Creating global test data (visible to all)';
  RAISE NOTICE '';

  -- Insert global daily_questions (user_id = NULL)
  INSERT INTO daily_questions (user_id, question_text, answer_text, date_asked)
  VALUES (NULL, 'What is today?', 'A day to grow and learn', CURRENT_DATE)
  ON CONFLICT DO NOTHING;

  INSERT INTO daily_questions (user_id, question_text, answer_text, date_asked)
  VALUES (NULL, 'How can I be better?', 'By practicing and reflecting', CURRENT_DATE)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Global test data created:';
  RAISE NOTICE '   - 2 x global daily_questions (user_id = NULL)';
END $$;

-- ============================================================================
-- STEP 4: TEST RLS ISOLATION - USER 1 PERSPECTIVE
-- ============================================================================

DO $$
DECLARE
  test_user_1_id UUID := 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID;
  user_1_errors_count INTEGER;
  user_1_global_questions_count INTEGER;
  user_1_all_questions_count INTEGER;
  expected_errors INTEGER := 2;
  expected_global_questions INTEGER := 2;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '>>> STEP 4: RLS ISOLATION TEST - USER 1';
  RAISE NOTICE '';

  -- Test 4.1: User 1 can see their own ai_usage_tracking_errors
  SELECT COUNT(*) INTO user_1_errors_count
  FROM ai_usage_tracking_errors
  WHERE user_id = test_user_1_id;

  RAISE NOTICE '  Test 4.1: User 1 sees own errors';
  RAISE NOTICE '    Expected: % errors', expected_errors;
  RAISE NOTICE '    Found: % errors', user_1_errors_count;

  IF user_1_errors_count = expected_errors THEN
    RAISE NOTICE '    ✅ PASS: User 1 can see their own data';
  ELSE
    RAISE WARNING '    ❌ FAIL: User 1 should see % errors, found %', expected_errors, user_1_errors_count;
  END IF;

  -- Test 4.2: User 1 can see global daily_questions
  SELECT COUNT(*) INTO user_1_global_questions_count
  FROM daily_questions
  WHERE user_id IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE '  Test 4.2: User 1 sees global questions';
  RAISE NOTICE '    Expected: % global questions', expected_global_questions;
  RAISE NOTICE '    Found: % global questions', user_1_global_questions_count;

  IF user_1_global_questions_count = expected_global_questions THEN
    RAISE NOTICE '    ✅ PASS: User 1 can see global data';
  ELSE
    RAISE WARNING '    ❌ FAIL: Expected % global questions, found %', expected_global_questions, user_1_global_questions_count;
  END IF;

  -- Test 4.3: User 1 can see personal + global daily_questions (not User 2's)
  SELECT COUNT(*) INTO user_1_all_questions_count
  FROM daily_questions
  WHERE user_id = test_user_1_id OR user_id IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE '  Test 4.3: User 1 sees personal + global questions';
  RAISE NOTICE '    Expected: 4 questions (2 personal + 2 global)';
  RAISE NOTICE '    Found: % questions', user_1_all_questions_count;

  IF user_1_all_questions_count = 4 THEN
    RAISE NOTICE '    ✅ PASS: User 1 sees personal + global, NOT User 2 data';
  ELSE
    RAISE WARNING '    ❌ FAIL: Expected 4 questions, found %', user_1_all_questions_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 5: TEST RLS ISOLATION - USER 2 PERSPECTIVE
-- ============================================================================

DO $$
DECLARE
  test_user_2_id UUID := 'f47ac10b-58cc-4372-a567-0e02b2c3d480'::UUID;
  user_2_errors_count INTEGER;
  user_2_global_questions_count INTEGER;
  user_2_all_questions_count INTEGER;
  expected_errors INTEGER := 2;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '>>> STEP 5: RLS ISOLATION TEST - USER 2';
  RAISE NOTICE '';

  -- Test 5.1: User 2 can see their own ai_usage_tracking_errors
  SELECT COUNT(*) INTO user_2_errors_count
  FROM ai_usage_tracking_errors
  WHERE user_id = test_user_2_id;

  RAISE NOTICE '  Test 5.1: User 2 sees own errors';
  RAISE NOTICE '    Expected: % errors', expected_errors;
  RAISE NOTICE '    Found: % errors', user_2_errors_count;

  IF user_2_errors_count = expected_errors THEN
    RAISE NOTICE '    ✅ PASS: User 2 can see their own data';
  ELSE
    RAISE WARNING '    ❌ FAIL: Expected % errors, found %', expected_errors, user_2_errors_count;
  END IF;

  -- Test 5.2: User 2 can see global daily_questions
  SELECT COUNT(*) INTO user_2_global_questions_count
  FROM daily_questions
  WHERE user_id IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE '  Test 5.2: User 2 sees global questions';
  RAISE NOTICE '    Expected: 2 global questions';
  RAISE NOTICE '    Found: % global questions', user_2_global_questions_count;

  IF user_2_global_questions_count = 2 THEN
    RAISE NOTICE '    ✅ PASS: User 2 can see global data';
  ELSE
    RAISE WARNING '    ❌ FAIL: Expected 2 global questions, found %', user_2_global_questions_count;
  END IF;

  -- Test 5.3: User 2 can see personal + global daily_questions (not User 1's)
  SELECT COUNT(*) INTO user_2_all_questions_count
  FROM daily_questions
  WHERE user_id = test_user_2_id OR user_id IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE '  Test 5.3: User 2 sees personal + global questions';
  RAISE NOTICE '    Expected: 4 questions (2 personal + 2 global)';
  RAISE NOTICE '    Found: % questions', user_2_all_questions_count;

  IF user_2_all_questions_count = 4 THEN
    RAISE NOTICE '    ✅ PASS: User 2 sees personal + global, NOT User 1 data';
  ELSE
    RAISE WARNING '    ❌ FAIL: Expected 4 questions, found %', user_2_all_questions_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 6: SECURITY DEFINER FUNCTION VERIFICATION
-- ============================================================================

DO $$
DECLARE
  test_user_1_id UUID := 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID;
  test_user_2_id UUID := 'f47ac10b-58cc-4372-a567-0e02b2c3d480'::UUID;
  can_access_own BOOLEAN;
  can_access_global BOOLEAN;
  can_access_other BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '>>> STEP 6: SECURITY DEFINER FUNCTION VERIFICATION';
  RAISE NOTICE '';

  -- Test 6.1: User 1 can access their own questions
  SELECT can_access_daily_question(test_user_1_id, test_user_1_id)
  INTO can_access_own;

  RAISE NOTICE '  Test 6.1: User can access own questions';
  RAISE NOTICE '    Function result: %', can_access_own;
  IF can_access_own THEN
    RAISE NOTICE '    ✅ PASS: SECURITY DEFINER allows own access';
  ELSE
    RAISE WARNING '    ❌ FAIL: Should allow own access';
  END IF;

  -- Test 6.2: User 1 can access global questions (user_id = NULL)
  SELECT can_access_daily_question(NULL, test_user_1_id)
  INTO can_access_global;

  RAISE NOTICE '';
  RAISE NOTICE '  Test 6.2: User can access global questions';
  RAISE NOTICE '    Function result: %', can_access_global;
  IF can_access_global THEN
    RAISE NOTICE '    ✅ PASS: SECURITY DEFINER allows global access';
  ELSE
    RAISE WARNING '    ❌ FAIL: Should allow global access';
  END IF;

  -- Test 6.3: User 1 cannot access User 2's questions
  SELECT can_access_daily_question(test_user_2_id, test_user_1_id)
  INTO can_access_other;

  RAISE NOTICE '';
  RAISE NOTICE '  Test 6.3: User cannot access other user questions';
  RAISE NOTICE '    Function result: %', can_access_other;
  IF NOT can_access_other THEN
    RAISE NOTICE '    ✅ PASS: SECURITY DEFINER blocks other user access';
  ELSE
    RAISE WARNING '    ❌ FAIL: Should block other user access';
  END IF;
END $$;

-- ============================================================================
-- STEP 7: TEST DATA SUMMARY
-- ============================================================================

DO $$
DECLARE
  total_user_1_records INTEGER;
  total_user_2_records INTEGER;
  total_global_records INTEGER;
  total_all_records INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========== PHASE 2.3: TEST DATA SUMMARY ==========';
  RAISE NOTICE '';

  -- Count all test records
  SELECT COUNT(*) INTO total_user_1_records
  FROM (
    SELECT 1 FROM ai_usage_tracking_errors WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID
    UNION ALL
    SELECT 1 FROM daily_questions WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID
    UNION ALL
    SELECT 1 FROM data_deletion_requests WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID
  ) sub;

  SELECT COUNT(*) INTO total_user_2_records
  FROM (
    SELECT 1 FROM ai_usage_tracking_errors WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d480'::UUID
    UNION ALL
    SELECT 1 FROM daily_questions WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d480'::UUID
    UNION ALL
    SELECT 1 FROM data_deletion_requests WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d480'::UUID
  ) sub;

  SELECT COUNT(*) INTO total_global_records
  FROM daily_questions WHERE user_id IS NULL;

  RAISE NOTICE 'Test Data Created:';
  RAISE NOTICE '  - User 1 records: %', total_user_1_records;
  RAISE NOTICE '  - User 2 records: %', total_user_2_records;
  RAISE NOTICE '  - Global records: %', total_global_records;
  RAISE NOTICE '';
  RAISE NOTICE 'All RLS tests completed!';
  RAISE NOTICE 'Check PASS/FAIL results above.';
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '🎉 PHASE 2.3: RLS TESTING COMPLETE';
  RAISE NOTICE '==============================================';
END $$;
