# BE-02: Implementation Guide - Step-by-Step

**For:** Backend Engineers
**When:** After approval from backend lead
**Estimated Time:** 2.5 days total work

---

## Phase 1: Data Migration (30 minutes)

### Prerequisites

Before starting, verify:
- [ ] Backup of production database taken
- [ ] Approval from backend lead obtained
- [ ] Team notified of 30-minute migration window
- [ ] No active users on system (testing hours)
- [ ] Rollback procedure reviewed

### Step 1.1: Create Backup Tables

Execute in production database:

```sql
-- Run in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS _backup_gamification_20250612 AS
SELECT 'user_stats' as table_name, us.* FROM user_stats us
UNION ALL
SELECT 'user_achievements', ua.* FROM user_achievements ua;

-- Verify backups created
SELECT COUNT(*) as backup_record_count FROM _backup_gamification_20250612;
-- Expected: Count of user_stats + user_achievements rows
```

### Step 1.2: Migrate Data from user_stats

```sql
-- Insert only users NOT already in user_consciousness_stats
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
  LEAST(us.level::text::integer, 5) as level,
  CASE
    WHEN (us.level::text::integer) <= 1 THEN 'Observador'
    WHEN (us.level::text::integer) <= 2 THEN 'Consciente'
    WHEN (us.level::text::integer) <= 3 THEN 'Reflexivo'
    WHEN (us.level::text::integer) <= 4 THEN 'Integrado'
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

-- Check results
SELECT COUNT(*) as inserted_rows FROM user_consciousness_stats;
-- Expected: 2 (or 1 if already existed)
```

### Step 1.3: Add Category to user_achievements

```sql
-- Add category column
ALTER TABLE user_achievements
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other'
CHECK (category IN ('journey', 'tasks', 'streaks', 'milestones', 'other'));

-- Categorize achievements
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

-- Anything remaining is journey
UPDATE user_achievements
SET category = 'journey'
WHERE category = 'other';

-- Verify all categorized
SELECT category, COUNT(*) as count
FROM user_achievements
GROUP BY category;
-- Expected: No 'other' category
```

### Step 1.4: Validate Migration

```sql
-- Check for duplicates in consciousness_stats
SELECT user_id, COUNT(*) as count
FROM user_consciousness_stats
GROUP BY user_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows (no duplicates)

-- Check data consistency
SELECT
  'user_consciousness_stats' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(total_points) as min_points,
  MAX(total_points) as max_points,
  AVG(total_points)::INT as avg_points
FROM user_consciousness_stats;

-- Check achievements categorized
SELECT
  category,
  COUNT(*) as count
FROM user_achievements
GROUP BY category
ORDER BY category;
-- Expected: All have category (no NULL, no 'other')
```

### Step 1.5: Post-Migration Checklist

- [ ] No duplicate user_ids in user_consciousness_stats
- [ ] Data types match (level is INT, not VARCHAR)
- [ ] All achievements have category
- [ ] Backup table created successfully
- [ ] Timestamps are correct (updated_at = NOW())

**If all checks pass: PHASE 1 COMPLETE ✓**

---

## Phase 2: Code Consolidation (2 weeks)

### Step 2.1: Deprecate gamificationService

File: `src/services/gamificationService.ts`

**Add to top of file:**
```typescript
/**
 * @deprecated v2.3.0
 * This service is deprecated and will be removed in v2.5.0
 * Use `consciousnessPointsService` from modules/journey instead
 *
 * Migration Guide:
 * - getUserGameProfile() → getUserConsciousnessStats()
 * - addXP() → Award CP instead
 * - getLeaderboard() → getLeaderboard() (same signature)
 */

import { logger } from '@/lib/logger'

function deprecationWarning(functionName: string) {
  logger.warn(
    `gamificationService.${functionName}() is deprecated. Use consciousnessPointsService instead.`
  )
}
```

**Add deprecation warnings to each export:**
```typescript
export async function addXP(userId: string, xpAmount: number): Promise<UserGameProfile> {
  deprecationWarning('addXP')
  // ... existing code ...
}

export async function getUserGameProfile(userId: string): Promise<UserGameProfile | null> {
  deprecationWarning('getUserGameProfile')
  // ... existing code ...
}

// ... repeat for all exports ...
```

### Step 2.2: Extend consciousnessPointsService

File: `src/modules/journey/services/consciousnessPointsService.ts`

**Add new function to handle achievements:**
```typescript
import { supabase } from '@/lib/supabase'

/**
 * Award an achievement to user
 */
export async function awardAchievement(
  userId: string,
  badgeId: string,
  category: 'journey' | 'tasks' | 'streaks' | 'milestones' = 'journey'
): Promise<Achievement | null> {
  try {
    // Check if already unlocked
    const { data: existing, error: checkError } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .single()

    if (existing) {
      console.log(`User already has badge ${badgeId}`)
      return null
    }

    // Insert achievement
    const { data, error } = await supabase
      .from('user_achievements')
      .insert([
        {
          user_id: userId,
          badge_id: badgeId,
          badge_name: badgeId.replace(/_/g, ' '),
          description: `Unlocked ${badgeId}`,
          category: category,
          unlocked_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error awarding achievement:', error)
    return null
  }
}

/**
 * Check if user should get streak badges
 */
export async function checkAndAwardStreakBadges(
  userId: string
): Promise<Achievement[]> {
  try {
    const stats = await getUserConsciousnessStats(userId)
    if (!stats) return []

    const awarded: Achievement[] = []

    // 7-day streak
    if (stats.current_streak === 7) {
      const achievement = await awardAchievement(
        userId,
        'streak_7_days_consciousness',
        'streaks'
      )
      if (achievement) awarded.push(achievement)
    }

    // 30-day streak
    if (stats.current_streak === 30) {
      const achievement = await awardAchievement(
        userId,
        'streak_30_days_consciousness',
        'streaks'
      )
      if (achievement) awarded.push(achievement)
    }

    return awarded
  } catch (error) {
    console.error('Error checking streak badges:', error)
    return []
  }
}

/**
 * Get all user achievements with category
 */
export async function getUserAchievements(userId: string): Promise<Achievement[]> {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching achievements:', error)
    return []
  }
}
```

### Step 2.3: Update Imports in Components

**Search and replace:**
```typescript
// OLD
import { gamificationService } from '@/services/gamificationService'

// NEW
import { getUserConsciousnessStats, getCPLog } from '@/modules/journey/services/consciousnessPointsService'
```

**Find all references:**
```bash
cd src
grep -r "gamificationService" --include="*.ts" --include="*.tsx" .
```

**Update each file:**
- `src/services/supabaseService.ts` (if references)
- `src/lib/...` (if references)
- Components that use it

### Step 2.4: Update E2E Tests

File: `tests/e2e/persistence-fixtures.ts`

```typescript
// OLD
import { gamificationService } from '@/services/gamificationService'

// NEW
import { getUserConsciousnessStats } from '@/modules/journey/services/consciousnessPointsService'

// Update fixtures to use CP system
export const gamificationFixtures = {
  async createTestUser(userId: string) {
    return await consciousnessPointsService.initializeUserStats(userId)
  },

  async verifyStats(userId: string) {
    const stats = await getUserConsciousnessStats(userId)
    return {
      level: stats?.level,
      total_points: stats?.total_points,
      current_streak: stats?.current_streak,
    }
  },
}
```

### Step 2.5: Update Types

File: `src/modules/journey/types/consciousnessPoints.ts`

Add if missing:
```typescript
export interface Achievement {
  id: string
  user_id: string
  badge_id: string
  badge_name: string
  description: string
  icon?: string
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  category: 'journey' | 'tasks' | 'streaks' | 'milestones'
  xp_reward?: number
  unlocked_at: string
  created_at?: string
}

export interface ConsolidatedGamificationState {
  stats: UserConsciousnessStats | null
  achievements: Achievement[]
  progress: ReturnType<typeof getProgressToNextLevel>
  recentActivity: ConsciousnessPointsLog[]
}
```

### Step 2.6: Run Tests

```bash
# Unit tests
npm run test -- src/modules/journey/services/consciousnessPointsService.ts

# E2E tests
npm run test:e2e

# Check for remaining references to gamificationService
grep -r "gamificationService" src/ tests/
# Should return: (nothing) or only deprecation warnings

# Type check
npm run type-check
# Should have 0 errors
```

### Step 2.7: Post-Code Checklist

- [ ] All tests passing
- [ ] No TS errors
- [ ] gamificationService marked @deprecated
- [ ] All imports updated
- [ ] E2E fixtures use CP system
- [ ] No remaining active references

---

## Phase 3: Testing & Deployment (1 week)

### Step 3.1: Staging Deployment

```bash
# Create feature branch
git checkout -b feat/be-02-gamification-consolidation

# Commit changes
git add -A
git commit -m "feat: Consolidate gamification to Consciousness Points

- Deprecate gamificationService in favor of consciousnessPointsService
- Add achievement category support
- Extend CP service with achievement management
- Update all tests and imports
- Add migration guide for deprecation (2 releases)"

# Push to staging
git push origin feat/be-02-gamification-consolidation
```

### Step 3.2: Staging Tests

```bash
# Deploy to staging
npm run deploy:staging

# Run full test suite
npm run test:full

# Check database
npm run db:check-schema

# Monitor logs
npm run logs:staging --follow
```

### Step 3.3: Production Rollout

```bash
# After staging validation (24-48 hours)

# Create PR for review
git push origin feat/be-02-gamification-consolidation

# After approval:
git checkout main
git pull
git merge feat/be-02-gamification-consolidation

# Tag version (if doing release)
git tag -a v2.3.0-gamification-consolidation -m "Gamification consolidation"

# Deploy to production
npm run deploy:production
```

### Step 3.4: Monitor Deployment

**First 2 hours:**
```bash
# Watch logs for errors
npm run logs:production --follow

# Check database queries
npm run db:monitor-queries

# Monitor user reports
# (Check Slack #bugs channel)
```

**First 24 hours:**
```bash
# Run data integrity checks every 4 hours
npm run scripts/validate-gamification-migration.ts

# Check performance metrics
# - Query time for consciousness_stats
# - User engagement metrics
# - Any 500 errors
```

### Step 3.5: Deployment Checklist

- [ ] Staging deployment successful
- [ ] All tests passing in staging
- [ ] No errors in logs
- [ ] Production deployment successful
- [ ] First 2 hours monitoring completed
- [ ] First 24 hours monitoring completed
- [ ] No user-reported issues

---

## Phase 4: Cleanup & Deprecation (Month 2-6)

### Step 4.1: Monitor for 2 Weeks

Verify no issues in production:
- [ ] No errors related to gamification
- [ ] User engagement metrics normal
- [ ] Database performance good
- [ ] No complaints from users

### Step 4.2: After 2 Minor Releases (1-2 months)

Start removing deprecated code:

```bash
# Create cleanup PR
git checkout -b chore/remove-gamification-service

# Remove deprecated file
rm src/services/gamificationService.ts

# Remove from imports
# (Use IDE to find all references and remove)

# Update documentation
vim docs/architecture/backend_architecture.md
# Update to remove references to gamificationService
```

### Step 4.3: Archive Legacy Table (Month 6)

Only after 6 months without issues:

```sql
-- Step 1: Disable RLS
ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;

-- Step 2: Remove policies
DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;

-- Step 3: Remove constraints (except backup table already exists)
ALTER TABLE user_stats DROP CONSTRAINT user_stats_user_id_fkey;

-- Step 4: Rename for archive
ALTER TABLE user_stats RENAME TO _archived_user_stats_20260612;

-- Step 5: Create index if needed for historical queries
CREATE INDEX idx_archived_user_stats_user_id
ON _archived_user_stats_20260612(user_id);
```

---

## Rollback Procedure (If Needed)

If anything goes wrong during Phase 1:

```sql
-- Restore from backup
INSERT INTO user_stats
SELECT * FROM _backup_gamification_20250612
WHERE table_name = 'user_stats'
ON CONFLICT (user_id) DO NOTHING;

-- Revert consciousness_stats deletions
DELETE FROM user_consciousness_stats
WHERE user_id NOT IN (
  SELECT DISTINCT user_id FROM _backup_gamification_20250612
);

-- Verify
SELECT COUNT(*) FROM user_stats;
SELECT COUNT(*) FROM user_consciousness_stats;

-- If looks good, notify team
-- If not, restore from full database backup
```

If anything goes wrong during Phase 2:

```bash
# Revert code changes
git reset --hard HEAD~1

# Redeploy previous version
npm run deploy:production

# Investigate issue
# Plan code changes
# Re-attempt
```

---

## Success Criteria

**Phase 1 is successful if:**
- [ ] No data loss
- [ ] Duplicates eliminated
- [ ] All validations pass
- [ ] Backup table intact

**Phase 2 is successful if:**
- [ ] All tests pass
- [ ] No TS errors
- [ ] Deprecation warnings in place
- [ ] Code quality maintained

**Phase 3 is successful if:**
- [ ] Staging deployment smooth
- [ ] Production deployment smooth
- [ ] No user reports
- [ ] Performance stable

**Phase 4 is successful if:**
- [ ] Legacy code removed
- [ ] Documentation updated
- [ ] No regressions

---

## Contacts & Escalation

**During Migration (Phase 1):**
- If data looks wrong: Stop, rollback, investigate
- Contact: Backend Lead + DBA

**During Code Changes (Phase 2):**
- If tests fail: Fix, re-test, verify
- Contact: Tech Lead + QA

**During Deployment (Phase 3):**
- If errors in logs: Monitor, don't deploy further
- Contact: DevOps + On-call engineer

**During Cleanup (Phase 4):**
- If issues with old code: Don't remove yet
- Contact: Backend Lead + Tech Lead

---

## Useful Commands

```bash
# Check for references
grep -r "gamificationService" src/ tests/

# Run specific test file
npm test -- tests/e2e/persistence-fixtures.ts

# Type check only
npm run type-check

# Check database schema
npm run db:schema-check

# Validate migration script
npm run db:validate-migration

# Monitor production
npm run logs:production --filter="gamification"
```

---

**Implementation Guide:** BE-02
**Version:** 1.0
**Status:** Ready for Execution
**Date:** 2025-12-12
