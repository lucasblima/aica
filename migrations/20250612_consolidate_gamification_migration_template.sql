-- Migration: 20250612_consolidate_gamification_migration_template.sql
-- Description: Template for consolidating user_stats into user_consciousness_stats
-- Status: DO NOT EXECUTE - Template only, requires explicit approval
-- Author: Backend Architect Agent

-- ============================================================================
-- PHASE 1: BACKUP AND AUDIT
-- ============================================================================

-- Step 1.1: Create backup of legacy tables for audit trail
CREATE TABLE IF NOT EXISTS _audit_legacy_user_stats_20250612 AS
SELECT * FROM user_stats;

CREATE TABLE IF NOT EXISTS _audit_legacy_user_achievements_20250612 AS
SELECT * FROM user_achievements;

-- Step 1.2: Log migration start
INSERT INTO _migration_log (
  migration_name,
  started_at,
  status,
  details
) VALUES (
  '20250612_consolidate_gamification',
  NOW(),
  'IN_PROGRESS',
  jsonb_build_object(
    'source_table', 'user_stats',
    'target_table', 'user_consciousness_stats',
    'backup_created', true,
    'row_count_source', (SELECT COUNT(*) FROM user_stats)
  )
);

-- ============================================================================
-- PHASE 2: MIGRATE DATA FROM user_stats TO user_consciousness_stats
-- ============================================================================

-- Step 2.1: Migrate users that exist in user_stats but NOT in user_consciousness_stats
INSERT INTO user_consciousness_stats (
  user_id,
  total_points,
  level,
  level_name,
  current_streak,
  longest_streak,
  last_moment_date,
  total_moments,
  total_questions_answered,
  total_summaries_reflected,
  updated_at
)
SELECT
  us.user_id,
  us.total_xp as total_points,
  LEAST(us.level, 5) as level,
  CASE
    WHEN us.level <= 1 THEN 'Observador'
    WHEN us.level <= 2 THEN 'Consciente'
    WHEN us.level <= 3 THEN 'Reflexivo'
    WHEN us.level <= 4 THEN 'Integrado'
    ELSE 'Mestre'
  END as level_name,
  us.current_streak,
  us.longest_streak,
  us.last_activity_date::date as last_moment_date,
  0 as total_moments,
  0 as total_questions_answered,
  0 as total_summaries_reflected,
  NOW() as updated_at
FROM user_stats us
WHERE NOT EXISTS (
  SELECT 1 FROM user_consciousness_stats ucs
  WHERE ucs.user_id = us.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- PHASE 3: UPDATE user_achievements WITH CATEGORY
-- ============================================================================

-- Step 3.1: Add category column if not exists
ALTER TABLE user_achievements
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other'
CHECK (category IN ('journey', 'tasks', 'streaks', 'milestones', 'other'));

-- Step 3.2: Categorize existing achievements
UPDATE user_achievements
SET category = 'tasks'
WHERE category = 'other' AND badge_id IN (
  'first_task', 'task_master', 'perfect_day', 'financial_analyst'
);

UPDATE user_achievements
SET category = 'streaks'
WHERE category = 'other' AND badge_id IN (
  'week_warrior', 'month_marathon', 'saver_streak'
);

UPDATE user_achievements
SET category = 'milestones'
WHERE category = 'other' AND badge_id IN (
  'first_finance_upload', 'level_10', 'budget_master'
);

UPDATE user_achievements
SET category = 'journey'
WHERE category = 'other';

-- ============================================================================
-- PHASE 4: VALIDATION
-- ============================================================================

-- Step 4.1: Validate data consistency
DO $$
DECLARE
  v_migrated_count INT;
  v_consciousness_count INT;
  v_duplicate_count INT;
BEGIN
  -- Count migrated records
  SELECT COUNT(*) INTO v_migrated_count
  FROM user_stats us
  WHERE EXISTS (
    SELECT 1 FROM user_consciousness_stats ucs
    WHERE ucs.user_id = us.user_id
  );

  -- Count total consciousness stats
  SELECT COUNT(*) INTO v_consciousness_count
  FROM user_consciousness_stats;

  -- Check for duplicates (should be 0)
  SELECT COUNT(user_id) INTO v_duplicate_count
  FROM (
    SELECT user_id, COUNT(*) as cnt
    FROM user_consciousness_stats
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) t;

  -- Raise errors if validation fails
  IF v_duplicate_count > 0 THEN
    RAISE EXCEPTION 'MIGRATION FAILED: % duplicate user_ids found in user_consciousness_stats',
      v_duplicate_count;
  END IF;

  -- Log successful validation
  INSERT INTO _migration_log (
    migration_name,
    status,
    details
  ) VALUES (
    '20250612_consolidate_gamification',
    'VALIDATION_PASSED',
    jsonb_build_object(
      'migrated_records', v_migrated_count,
      'total_consciousness_stats', v_consciousness_count,
      'duplicates_found', v_duplicate_count
    )
  );
END $$;

-- Step 4.2: Verify integrity
SELECT
  'Data Migration Summary' as check_type,
  COUNT(*) as total_users,
  COUNT(CASE WHEN total_points > 0 THEN 1 END) as users_with_points,
  ROUND(AVG(total_points), 2) as avg_points,
  MAX(total_points) as max_points,
  MAX(level) as highest_level
FROM user_consciousness_stats;

-- ============================================================================
-- PHASE 5: CLEANUP (ONLY AFTER APPROVAL IN PRODUCTION)
-- ============================================================================

-- WARNING: Only execute these steps AFTER:
-- 1. Verifying all data in production
-- 2. 2 weeks of monitoring passes
-- 3. Explicit approval from backend lead

-- Step 5.1: Disable RLS on legacy table
-- ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;

-- Step 5.2: Drop foreign key constraints
-- ALTER TABLE user_stats DROP CONSTRAINT user_stats_user_id_fkey;

-- Step 5.3: Remove policies
-- DROP POLICY "Users can view own stats" ON user_stats;
-- DROP POLICY "Users can insert own stats" ON user_stats;
-- DROP POLICY "Users can update own stats" ON user_stats;

-- Step 5.4: Rename table to deprecated (archive for 6 months)
-- ALTER TABLE user_stats RENAME TO _deprecated_user_stats_20250612;

-- Step 5.5: After 6 months: DROP
-- DROP TABLE _deprecated_user_stats_20250612;

-- ============================================================================
-- FINAL LOG
-- ============================================================================

INSERT INTO _migration_log (
  migration_name,
  completed_at,
  status,
  details
) VALUES (
  '20250612_consolidate_gamification',
  NOW(),
  'COMPLETED',
  jsonb_build_object(
    'phase', 'Data Migration Complete',
    'next_step', 'Update application code',
    'deprecation_timeline', '2 releases (keep old code)',
    'removal_timeline', '6 months (drop legacy table)'
  )
);

-- ============================================================================
-- NOTES FOR EXECUTION
-- ============================================================================

/*
EXECUTION CHECKLIST:

Before Running:
- [ ] Backup production database
- [ ] Test in staging environment
- [ ] Get approval from backend lead
- [ ] Schedule maintenance window
- [ ] Notify team

Execution Steps:
1. Run PHASE 1 (Backup) - Safe, read-only
2. Run PHASE 2 (Migration) - Safe, non-destructive
3. Run PHASE 3 (Update achievements) - Safe, adds category
4. Run PHASE 4 (Validation) - Safe, validates data
5. Monitor for 2 weeks
6. Only then consider PHASE 5 (Cleanup)

Rollback Plan:
- If migration fails: PHASE 1 creates backups
- Run: INSERT INTO user_stats SELECT * FROM _audit_legacy_user_stats_20250612
- Run: DELETE FROM user_consciousness_stats WHERE user_id NOT IN (SELECT user_id FROM _audit...)

Timeline:
- Immediate: PHASE 1-4 (30 minutes)
- Week 1-2: Monitor and validate
- Week 3-4: Deploy code changes
- Month 2: Consider PHASE 5
- Month 6+: Drop legacy table
*/
