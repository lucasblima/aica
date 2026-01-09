-- ============================================================================
-- RLS POLICY TEST SCRIPT
-- Purpose: Validate Row Level Security policies prevent data leakage
-- Date: 2026-01-09
-- Related: docs/RLS_SECURITY_AUDIT_REPORT.md
-- ============================================================================
--
-- IMPORTANT: Run this script in a TEST/STAGING environment only
-- This script creates test users and data to verify RLS enforcement
--
-- ============================================================================

-- ============================================================================
-- TEST SETUP
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS POLICY TESTING SUITE';
  RAISE NOTICE 'Started at: %', NOW();
  RAISE NOTICE '========================================';
END $$;

-- Create test users (if they do not exist)
-- User 1: alice@test.com (UUID: 11111111-1111-1111-1111-111111111111)
-- User 2: bob@test.com (UUID: 22222222-2222-2222-2222-222222222222)

DO $$
BEGIN
  -- Check if test users exist
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = '11111111-1111-1111-1111-111111111111'
  ) THEN
    RAISE NOTICE 'Creating test user: alice@test.com';
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      aud,
      role
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      '00000000-0000-0000-0000-000000000000',
      'alice@test.com',
      crypt('test_password_alice', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated'
    );
  ELSE
    RAISE NOTICE '✅ Test user alice@test.com already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = '22222222-2222-2222-2222-222222222222'
  ) THEN
    RAISE NOTICE 'Creating test user: bob@test.com';
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      aud,
      role
    ) VALUES (
      '22222222-2222-2222-2222-222222222222',
      '00000000-0000-0000-0000-000000000000',
      'bob@test.com',
      crypt('test_password_bob', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated'
    );
  ELSE
    RAISE NOTICE '✅ Test user bob@test.com already exists';
  END IF;
END $$;

-- ============================================================================
-- TEST 1: moments - User Isolation
-- ============================================================================

DO $$
DECLARE
  alice_id UUID := '11111111-1111-1111-1111-111111111111';
  bob_id UUID := '22222222-2222-2222-2222-222222222222';
  alice_moment_id UUID;
  bob_visible_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 1: moments - User Isolation';
  RAISE NOTICE '========================================';

  -- Alice inserts a private moment
  INSERT INTO moments (id, user_id, type, content, emotion, created_at)
  VALUES (
    gen_random_uuid(),
    alice_id,
    'text',
    'Alice private thought - Bob should not see this',
    '😊',
    NOW()
  )
  RETURNING id INTO alice_moment_id;

  RAISE NOTICE 'Alice created moment: %', alice_moment_id;

  -- Simulate Bob's session and try to read Alice's moment
  PERFORM set_config('request.jwt.claim.sub', bob_id::text, true);
  PERFORM set_config('role', 'authenticated', true);

  SELECT COUNT(*) INTO bob_visible_count
  FROM moments
  WHERE id = alice_moment_id;

  IF bob_visible_count = 0 THEN
    RAISE NOTICE '✅ PASS: Bob cannot see Alice''s moment (RLS working)';
  ELSE
    RAISE WARNING '❌ FAIL: Bob can see Alice''s moment (RLS BREACH)';
  END IF;

  -- Cleanup
  DELETE FROM moments WHERE id = alice_moment_id;
END $$;

-- ============================================================================
-- TEST 2: question_responses - INSERT Privilege Escalation
-- ============================================================================

DO $$
DECLARE
  alice_id UUID := '11111111-1111-1111-1111-111111111111';
  bob_id UUID := '22222222-2222-2222-2222-222222222222';
  test_question_id UUID;
  malicious_insert_blocked BOOLEAN := false;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 2: question_responses - INSERT Privilege Escalation';
  RAISE NOTICE '========================================';

  -- Create a test question
  INSERT INTO daily_questions (id, question_text, category, active)
  VALUES (
    gen_random_uuid(),
    'Test question for RLS test',
    'reflection',
    true
  )
  RETURNING id INTO test_question_id;

  -- Simulate Bob's session
  PERFORM set_config('request.jwt.claim.sub', bob_id::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- Bob tries to insert a response for Alice (privilege escalation attack)
  BEGIN
    INSERT INTO question_responses (user_id, question_id, response_text, responded_at)
    VALUES (
      alice_id,  -- Attempting to insert for Alice
      test_question_id,
      'Malicious response inserted by Bob',
      NOW()
    );

    RAISE WARNING '❌ FAIL: Bob inserted response for Alice (RLS BREACH)';
  EXCEPTION WHEN OTHERS THEN
    malicious_insert_blocked := true;
    RAISE NOTICE '✅ PASS: Bob blocked from inserting for Alice (RLS working)';
  END;

  -- Cleanup
  DELETE FROM daily_questions WHERE id = test_question_id;
END $$;

-- ============================================================================
-- TEST 3: question_responses - DELETE (GDPR Right to Erasure)
-- ============================================================================

DO $$
DECLARE
  alice_id UUID := '11111111-1111-1111-1111-111111111111';
  bob_id UUID := '22222222-2222-2222-2222-222222222222';
  test_question_id UUID;
  alice_response_id UUID;
  delete_succeeded BOOLEAN := false;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 3: question_responses - DELETE (GDPR Compliance)';
  RAISE NOTICE '========================================';

  -- Create a test question
  INSERT INTO daily_questions (id, question_text, category, active)
  VALUES (
    gen_random_uuid(),
    'Test question for DELETE test',
    'reflection',
    true
  )
  RETURNING id INTO test_question_id;

  -- Alice inserts a response
  INSERT INTO question_responses (id, user_id, question_id, response_text, responded_at)
  VALUES (
    gen_random_uuid(),
    alice_id,
    test_question_id,
    'Alice response to be deleted',
    NOW()
  )
  RETURNING id INTO alice_response_id;

  -- Simulate Alice's session
  PERFORM set_config('request.jwt.claim.sub', alice_id::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- Alice deletes her own response (GDPR Right to Erasure)
  BEGIN
    DELETE FROM question_responses WHERE id = alice_response_id;
    delete_succeeded := true;
    RAISE NOTICE '✅ PASS: Alice deleted own response (GDPR Right to Erasure working)';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ FAIL: Alice cannot delete own response (GDPR NON-COMPLIANT)';
  END;

  -- Cleanup
  DELETE FROM daily_questions WHERE id = test_question_id;
END $$;

-- ============================================================================
-- TEST 4: weekly_summaries - Service Role INSERT
-- ============================================================================

DO $$
DECLARE
  alice_id UUID := '11111111-1111-1111-1111-111111111111';
  summary_id UUID;
  user_insert_blocked BOOLEAN := false;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 4: weekly_summaries - Service Role INSERT';
  RAISE NOTICE '========================================';

  -- Test 4a: Authenticated user CANNOT insert summary
  PERFORM set_config('request.jwt.claim.sub', alice_id::text, true);
  PERFORM set_config('role', 'authenticated', true);

  BEGIN
    INSERT INTO weekly_summaries (
      id, user_id, week_number, year,
      period_start, period_end, summary_data,
      generated_at
    ) VALUES (
      gen_random_uuid(),
      alice_id,
      1, 2026,
      '2026-01-01', '2026-01-07',
      '{"test": true}'::jsonb,
      NOW()
    );

    RAISE WARNING '❌ FAIL: User inserted summary (should be service_role only)';
  EXCEPTION WHEN OTHERS THEN
    user_insert_blocked := true;
    RAISE NOTICE '✅ PASS: User blocked from inserting summary';
  END;

  -- Test 4b: Service role CAN insert summary
  PERFORM set_config('role', 'service_role', true);

  BEGIN
    INSERT INTO weekly_summaries (
      id, user_id, week_number, year,
      period_start, period_end, summary_data,
      generated_at
    ) VALUES (
      gen_random_uuid(),
      alice_id,
      1, 2026,
      '2026-01-01', '2026-01-07',
      '{"test": true}'::jsonb,
      NOW()
    )
    RETURNING id INTO summary_id;

    RAISE NOTICE '✅ PASS: Service role inserted summary successfully';

    -- Cleanup
    DELETE FROM weekly_summaries WHERE id = summary_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ FAIL: Service role cannot insert summary';
  END;
END $$;

-- ============================================================================
-- TEST 5: weekly_summaries - User DELETE (GDPR)
-- ============================================================================

DO $$
DECLARE
  alice_id UUID := '11111111-1111-1111-1111-111111111111';
  summary_id UUID;
  delete_succeeded BOOLEAN := false;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 5: weekly_summaries - User DELETE (GDPR)';
  RAISE NOTICE '========================================';

  -- Service role inserts a summary for Alice
  PERFORM set_config('role', 'service_role', true);

  INSERT INTO weekly_summaries (
    id, user_id, week_number, year,
    period_start, period_end, summary_data,
    generated_at
  ) VALUES (
    gen_random_uuid(),
    alice_id,
    2, 2026,
    '2026-01-08', '2026-01-14',
    '{"test": true}'::jsonb,
    NOW()
  )
  RETURNING id INTO summary_id;

  -- Alice deletes her own summary
  PERFORM set_config('request.jwt.claim.sub', alice_id::text, true);
  PERFORM set_config('role', 'authenticated', true);

  BEGIN
    DELETE FROM weekly_summaries WHERE id = summary_id;
    delete_succeeded := true;
    RAISE NOTICE '✅ PASS: Alice deleted own summary (GDPR compliance)';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ FAIL: Alice cannot delete own summary (GDPR NON-COMPLIANT)';
    -- Cleanup with service role
    PERFORM set_config('role', 'service_role', true);
    DELETE FROM weekly_summaries WHERE id = summary_id;
  END;
END $$;

-- ============================================================================
-- TEST 6: daily_questions - User CANNOT INSERT
-- ============================================================================

DO $$
DECLARE
  bob_id UUID := '22222222-2222-2222-2222-222222222222';
  user_insert_blocked BOOLEAN := false;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 6: daily_questions - User CANNOT INSERT';
  RAISE NOTICE '========================================';

  -- Bob tries to insert a malicious question
  PERFORM set_config('request.jwt.claim.sub', bob_id::text, true);
  PERFORM set_config('role', 'authenticated', true);

  BEGIN
    INSERT INTO daily_questions (
      question_text,
      category,
      active,
      created_by_ai
    ) VALUES (
      'What is your bank password?',  -- Malicious question
      'reflection',
      true,
      false
    );

    RAISE WARNING '❌ FAIL: User inserted malicious question (SECURITY BREACH)';
  EXCEPTION WHEN OTHERS THEN
    user_insert_blocked := true;
    RAISE NOTICE '✅ PASS: User blocked from inserting question';
  END;
END $$;

-- ============================================================================
-- TEST 7: whatsapp_user_activity - DELETE (GDPR)
-- ============================================================================

DO $$
DECLARE
  alice_id UUID := '11111111-1111-1111-1111-111111111111';
  activity_id UUID;
  delete_succeeded BOOLEAN := false;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 7: whatsapp_user_activity - DELETE (GDPR)';
  RAISE NOTICE '========================================';

  -- Alice inserts an activity
  PERFORM set_config('request.jwt.claim.sub', alice_id::text, true);
  PERFORM set_config('role', 'authenticated', true);

  INSERT INTO whatsapp_user_activity (
    id, user_id, activity_type, metadata, created_at
  ) VALUES (
    gen_random_uuid(),
    alice_id,
    'connection',
    '{"test": true}'::jsonb,
    NOW()
  )
  RETURNING id INTO activity_id;

  -- Alice deletes her own activity
  BEGIN
    DELETE FROM whatsapp_user_activity WHERE id = activity_id;
    delete_succeeded := true;
    RAISE NOTICE '✅ PASS: Alice deleted own activity (GDPR compliance)';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ FAIL: Alice cannot delete own activity (GDPR NON-COMPLIANT)';
    -- Cleanup
    DELETE FROM whatsapp_user_activity WHERE id = activity_id;
  END;
END $$;

-- ============================================================================
-- TEST 8: work_items - User Isolation
-- ============================================================================

DO $$
DECLARE
  alice_id UUID := '11111111-1111-1111-1111-111111111111';
  bob_id UUID := '22222222-2222-2222-2222-222222222222';
  alice_task_id UUID;
  bob_visible_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 8: work_items - User Isolation';
  RAISE NOTICE '========================================';

  -- Alice creates a task
  INSERT INTO work_items (
    id, user_id, title, description,
    priority, status, created_at
  ) VALUES (
    gen_random_uuid(),
    alice_id,
    'Alice confidential task',
    'Sensitive business strategy',
    'high',
    'todo',
    NOW()
  )
  RETURNING id INTO alice_task_id;

  RAISE NOTICE 'Alice created task: %', alice_task_id;

  -- Bob tries to see Alice's task
  PERFORM set_config('request.jwt.claim.sub', bob_id::text, true);
  PERFORM set_config('role', 'authenticated', true);

  SELECT COUNT(*) INTO bob_visible_count
  FROM work_items
  WHERE id = alice_task_id;

  IF bob_visible_count = 0 THEN
    RAISE NOTICE '✅ PASS: Bob cannot see Alice''s task (RLS working)';
  ELSE
    RAISE WARNING '❌ FAIL: Bob can see Alice''s task (RLS BREACH)';
  END IF;

  -- Cleanup
  DELETE FROM work_items WHERE id = alice_task_id;
END $$;

-- ============================================================================
-- TEST SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS TESTING COMPLETE';
  RAISE NOTICE 'Completed at: %', NOW();
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Review test results above';
  RAISE NOTICE '2. All tests should show ✅ PASS';
  RAISE NOTICE '3. If any ❌ FAIL, run 20260109_add_missing_rls_policies.sql';
  RAISE NOTICE '4. Re-run this test script to verify fixes';
  RAISE NOTICE '';
  RAISE NOTICE 'CLEANUP:';
  RAISE NOTICE 'Test users alice@test.com and bob@test.com remain in database';
  RAISE NOTICE 'Delete manually if no longer needed:';
  RAISE NOTICE '  DELETE FROM auth.users WHERE email IN (''alice@test.com'', ''bob@test.com'');';
END $$;

-- ============================================================================
-- OPTIONAL: Cleanup test users
-- ============================================================================
-- Uncomment the following lines to delete test users after testing:
--
-- DELETE FROM auth.users
-- WHERE id IN (
--   '11111111-1111-1111-1111-111111111111',
--   '22222222-2222-2222-2222-222222222222'
-- );
--
-- ============================================================================
