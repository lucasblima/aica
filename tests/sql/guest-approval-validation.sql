/**
 * Guest Approval System - Database Validation Queries
 *
 * This file contains SQL queries to validate the guest approval system
 * data structures after Phase 3 E2E tests run.
 *
 * Use these queries with:
 * - Supabase Dashboard SQL Editor
 * - psql CLI tool
 * - mcp__supabase__execute_sql tool
 *
 * Validation includes:
 * 1. Episode creation with guest data
 * 2. Approval token generation
 * 3. Guest research data storage
 * 4. RLS policy enforcement
 */

-- ============================================================================
-- TEST 1: Validate Episode Creation - Public Figure Workflow
-- ============================================================================

-- Query: Retrieve recent public figure episodes created during tests
SELECT
  pe.id as episode_id,
  pe.user_id,
  pe.guest_name,
  pe.guest_category,
  pe.guest_email,
  pe.guest_phone,
  pe.status,
  pe.created_at,
  COUNT(pgr.id) as research_records_count
FROM podcast_episodes pe
LEFT JOIN podcast_guest_research pgr ON pgr.episode_id = pe.id
WHERE pe.guest_category = 'public_figure'
  AND pe.created_at > NOW() - INTERVAL '1 hour'
GROUP BY pe.id, pe.user_id, pe.guest_name, pe.guest_category,
         pe.guest_email, pe.guest_phone, pe.status, pe.created_at
ORDER BY pe.created_at DESC
LIMIT 10;

-- Expected Results:
-- - Multiple rows with guest_category = 'public_figure'
-- - guest_email = NULL (not stored for public figures from research)
-- - guest_phone = NULL (not stored for public figures from research)
-- - research_records_count >= 1 (should have research data)
-- - status = 'pre_production' or 'draft'

---

-- ============================================================================
-- TEST 2: Validate Episode Creation - Common Person Workflow
-- ============================================================================

-- Query: Retrieve recent common person episodes with manual data
SELECT
  pe.id as episode_id,
  pe.user_id,
  pe.guest_name,
  pe.guest_category,
  pe.guest_email,
  pe.guest_phone,
  pe.status,
  pe.created_at
FROM podcast_episodes pe
WHERE pe.guest_category = 'common_person'
  AND pe.guest_email IS NOT NULL
  AND pe.guest_phone IS NOT NULL
  AND pe.created_at > NOW() - INTERVAL '1 hour'
ORDER BY pe.created_at DESC
LIMIT 10;

-- Expected Results:
-- - Multiple rows with guest_category = 'common_person'
-- - guest_email populated with valid email format
-- - guest_phone populated with valid phone format (10-13 digits or with country code)
-- - All required fields non-NULL
-- - status = 'pre_production' or 'draft'

---

-- ============================================================================
-- TEST 3: Validate Approval Token Generation
-- ============================================================================

-- Query: Check approval tokens generated during approval link creation
SELECT
  pe.id as episode_id,
  pe.guest_name,
  pe.approval_token,
  pe.approval_token_created_at,
  EXTRACT(SECOND FROM (NOW() - pe.approval_token_created_at))::INTEGER as seconds_since_created,
  CASE
    WHEN pe.approval_token_created_at IS NULL THEN 'NO_TOKEN'
    WHEN (NOW() - pe.approval_token_created_at) > INTERVAL '30 days' THEN 'EXPIRED'
    ELSE 'VALID'
  END as token_status,
  CHAR_LENGTH(pe.approval_token) as token_length
FROM podcast_episodes pe
WHERE pe.approval_token IS NOT NULL
  AND pe.created_at > NOW() - INTERVAL '1 hour'
ORDER BY pe.approval_token_created_at DESC
LIMIT 10;

-- Expected Results:
-- - Multiple rows with approval_token populated
-- - token_length = 32 (alphanumeric tokens should be 32 characters)
-- - token_status = 'VALID' (created recently)
-- - approval_token_created_at timestamp recent (within seconds)
-- - All tokens should be unique

---

-- ============================================================================
-- TEST 4: Validate Guest Research Data
-- ============================================================================

-- Query: Check guest research records populated from public figure searches
SELECT
  pgr.id as research_id,
  pgr.episode_id,
  pe.guest_name,
  pgr.full_name,
  pgr.biography IS NOT NULL and CHAR_LENGTH(pgr.biography) > 0 as has_biography,
  pgr.phone,
  pgr.email,
  pgr.guest_category,
  pgr.approved_by_guest,
  pgr.approved_at,
  CHAR_LENGTH(COALESCE(pgr.approval_notes, '')) as approval_notes_length,
  pgr.created_at
FROM podcast_guest_research pgr
JOIN podcast_episodes pe ON pe.id = pgr.episode_id
WHERE pgr.created_at > NOW() - INTERVAL '1 hour'
ORDER BY pgr.created_at DESC
LIMIT 10;

-- Expected Results for Public Figure:
-- - has_biography = true (research data should contain biography)
-- - phone = NULL (not captured from research)
-- - email = NULL (not captured from research)
-- - guest_category = 'public_figure' (from wizard step 0)

-- Expected Results for Common Person:
-- - has_biography = false (manually entered, no research)
-- - phone = populated (from manual form)
-- - email = populated (from manual form)
-- - guest_category = 'common_person'

---

-- ============================================================================
-- TEST 5: Validate Approval Data - After Guest Approval
-- ============================================================================

-- Query: Check approval submissions from guest approval page
SELECT
  pgr.id,
  pgr.episode_id,
  pe.guest_name,
  pgr.approved_by_guest,
  pgr.approved_at,
  pgr.approval_notes,
  EXTRACT(SECOND FROM (NOW() - pgr.approved_at))::INTEGER as seconds_since_approved
FROM podcast_guest_research pgr
JOIN podcast_episodes pe ON pe.id = pgr.episode_id
WHERE pgr.approved_by_guest IS NOT NULL
  AND pgr.created_at > NOW() - INTERVAL '1 hour'
ORDER BY pgr.approved_at DESC NULLS LAST
LIMIT 10;

-- Expected Results if Guest Approved:
-- - approved_by_guest = true
-- - approved_at = recent timestamp (non-NULL)
-- - approval_notes may contain guest comments

-- Expected Results if Guest Requested Changes:
-- - approved_by_guest = false
-- - approved_at = NULL (not approved)
-- - approval_notes = change request details

---

-- ============================================================================
-- TEST 6: Validate Phone/Email Constraints
-- ============================================================================

-- Query: Verify email validation constraints are working
SELECT
  pe.id,
  pe.guest_name,
  pe.guest_email,
  CASE
    WHEN pe.guest_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN 'VALID'
    ELSE 'INVALID'
  END as email_validation,
  CHAR_LENGTH(pe.guest_phone) as phone_digits,
  CASE
    WHEN pe.guest_phone ~ '^\+?[0-9]{10,13}$' THEN 'VALID'
    WHEN pe.guest_phone ~ '^\+55[0-9]{10,11}$' THEN 'VALID_BRAZIL'
    WHEN pe.guest_phone ~ '^[0-9]{10,13}$' THEN 'VALID'
    ELSE 'INVALID'
  END as phone_validation
FROM podcast_episodes pe
WHERE (pe.guest_email IS NOT NULL OR pe.guest_phone IS NOT NULL)
  AND pe.created_at > NOW() - INTERVAL '1 hour'
ORDER BY pe.created_at DESC
LIMIT 20;

-- Expected Results:
-- - All email_validation = 'VALID' (regex check should pass)
-- - All phone_validation = 'VALID' or 'VALID_BRAZIL' (10-13 digits)
-- - No 'INVALID' entries (DB constraints should prevent these)

---

-- ============================================================================
-- TEST 7: Validate RLS Policies - User Can Only See Own Episodes
-- ============================================================================

-- Query: List all episodes for current user
-- Note: Run as authenticated user to test RLS enforcement
SELECT
  pe.id,
  pe.user_id,
  pe.guest_name,
  pe.guest_category,
  pe.created_at
FROM podcast_episodes pe
WHERE pe.user_id = auth.uid()
  AND pe.created_at > NOW() - INTERVAL '1 hour'
ORDER BY pe.created_at DESC;

-- Expected Results:
-- - Only episodes belonging to current user (user_id = auth.uid())
-- - Other users' episodes should NOT be visible (RLS enforcement)
-- - Multiple test episodes created during this session

---

-- ============================================================================
-- TEST 8: Validate Related Data Cascading - Outline Sections
-- ============================================================================

-- Query: Check pauta outline sections related to episodes
SELECT
  pe.id as episode_id,
  pe.guest_name,
  pgp.id as pauta_id,
  COUNT(ppos.id) as outline_sections_count
FROM podcast_episodes pe
LEFT JOIN podcast_generated_pautas pgp ON pgp.episode_id = pe.id
LEFT JOIN podcast_pauta_outline_sections ppos ON ppos.pauta_id = pgp.id
WHERE pe.created_at > NOW() - INTERVAL '1 hour'
GROUP BY pe.id, pe.guest_name, pgp.id
ORDER BY pe.created_at DESC
LIMIT 10;

-- Expected Results:
-- - episode_id populated for all pautas (episode_id not project_id)
-- - outline_sections_count >= 0 (may be empty if pauta not yet generated)
-- - Multiple episodes with associated pautas

---

-- ============================================================================
-- TEST 9: Validate Approval Link History (Optional Audit)
-- ============================================================================

-- Query: Check if approval_link_history table is being used
SELECT
  alh.id,
  alh.episode_id,
  alh.method,
  alh.recipient_email,
  alh.recipient_phone,
  alh.sent_at,
  EXTRACT(MINUTE FROM (NOW() - alh.sent_at))::INTEGER as minutes_since_sent
FROM approval_link_history alh
WHERE alh.sent_at > NOW() - INTERVAL '1 hour'
ORDER BY alh.sent_at DESC
LIMIT 10;

-- Note: This table is optional for audit purposes
-- Expected Results:
-- - Records only if approval_link_history table exists and is being used
-- - Method = 'email', 'whatsapp', or 'link_only'
-- - recipient_email or recipient_phone populated based on method

---

-- ============================================================================
-- TEST 10: Comprehensive Status Report
-- ============================================================================

-- Query: Overall summary of test data
SELECT
  COUNT(DISTINCT CASE WHEN pe.guest_category = 'public_figure' THEN pe.id END) as public_figure_episodes,
  COUNT(DISTINCT CASE WHEN pe.guest_category = 'common_person' THEN pe.id END) as common_person_episodes,
  COUNT(DISTINCT CASE WHEN pe.approval_token IS NOT NULL THEN pe.id END) as episodes_with_approval_tokens,
  COUNT(DISTINCT pgr.id) as guest_research_records,
  COUNT(DISTINCT CASE WHEN pgr.approved_by_guest = true THEN pgr.id END) as approved_records,
  COUNT(DISTINCT CASE WHEN pgr.approved_by_guest = false THEN pgr.id END) as rejected_records,
  MAX(pe.created_at) as latest_episode_created
FROM podcast_episodes pe
LEFT JOIN podcast_guest_research pgr ON pgr.episode_id = pe.id
WHERE pe.created_at > NOW() - INTERVAL '1 hour';

-- Expected Results (after successful test run):
-- - public_figure_episodes >= 3 (at least 3 public figure tests)
-- - common_person_episodes >= 3 (at least 3 common person tests)
-- - episodes_with_approval_tokens >= 2 (approval tests)
-- - guest_research_records >= 3 (guest data tests)
-- - approved_records >= 1 (guest approval tests)
-- - rejected_records >= 1 (guest rejection tests)
-- - latest_episode_created = recent timestamp

---

-- ============================================================================
-- TROUBLESHOOTING QUERIES
-- ============================================================================

-- Check: Are RLS policies enabled?
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('podcast_episodes', 'podcast_guest_research', 'approval_link_history')
ORDER BY tablename;

-- Expected: All rowsecurity = true

---

-- Check: Do all required columns exist?
SELECT
  t.tablename,
  array_agg(c.attname ORDER BY c.attnum) as columns
FROM pg_tables t
JOIN pg_class cl ON cl.relname = t.tablename
JOIN pg_attribute c ON c.attrelid = cl.oid
WHERE t.tablename IN ('podcast_episodes', 'podcast_guest_research')
  AND c.attnum > 0
  AND NOT c.attisdropped
GROUP BY t.tablename;

-- Expected columns for podcast_episodes:
-- - id, user_id, guest_name, guest_email, guest_phone, guest_category
-- - approval_token, approval_token_created_at
-- - status, created_at, updated_at

-- Expected columns for podcast_guest_research:
-- - id, episode_id, full_name, phone, email, biography, guest_category
-- - approved_by_guest, approved_at, approval_notes
-- - created_at, updated_at

---

-- Check: Are there any data integrity issues?
SELECT
  'Missing episode_id' as issue,
  COUNT(*) as count
FROM podcast_guest_research
WHERE episode_id IS NULL
UNION ALL
SELECT
  'Missing user_id' as issue,
  COUNT(*) as count
FROM podcast_episodes
WHERE user_id IS NULL
UNION ALL
SELECT
  'Missing guest_name' as issue,
  COUNT(*) as count
FROM podcast_episodes
WHERE guest_name IS NULL OR guest_name = '';

-- Expected: All counts = 0 (no data integrity issues)
