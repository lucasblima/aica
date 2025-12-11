# PHASE 3.3 Implementation Guide

**Quick Start Guide for Integrating Learning Feedback Loop**

## Quick Navigation

1. [Files Created](#files-created)
2. [Database Setup](#database-setup)
3. [Integration Points](#integration-points)
4. [Usage Examples](#usage-examples)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## Files Created

### Core Service
- **`src/services/feedbackLoopService.ts`** (600+ lines)
  - Main feedback learning service
  - Weight calculation algorithm
  - Gamification integration
  - User preference tracking

### React Components
- **`src/modules/onboarding/components/RecommendationCard.tsx`** (250 lines)
  - Displays module recommendation
  - Handles accept/reject/skip actions
  - Star rating interface

- **`src/modules/onboarding/components/FeedbackModal.tsx`** (300 lines)
  - Collects rejection reasons
  - Additional feedback capture
  - 6 predefined rejection reasons

- **`src/modules/onboarding/components/ModuleProgressTracker.tsx`** (350 lines)
  - Progress bar (0-100%)
  - Lesson tracking
  - Completion interface
  - Star rating for modules
  - XP/achievement display

### API Layer
- **`src/api/feedbackAPI.ts`** (400 lines)
  - Client-side API functions
  - Batch operations
  - Real-time subscriptions
  - Analytics endpoints

### Database
- **`src/db/migrations/001_create_user_module_feedback.sql`** (350+ lines)
  - `user_module_feedback` table
  - `user_module_weights` table
  - Audit trail table
  - Views and triggers
  - RLS policies

### Testing
- **`src/tests/feedbackLoopService.test.ts`** (500+ lines)
  - Unit tests for all service methods
  - Mock setup for Supabase
  - Edge case coverage

### Documentation
- **`docs/PHASE_3_3_LEARNING_FEEDBACK_LOOP.md`** (1000+ lines)
  - Complete system documentation
  - Algorithm explanation
  - API reference
  - Performance considerations

---

## Database Setup

### Step 1: Run Migration

```bash
# Connect to your Supabase project
supabase migration up --region <your-region>

# Or manually execute the SQL in Supabase SQL editor:
# Copy entire file: src/db/migrations/001_create_user_module_feedback.sql
# Paste into SQL editor and run
```

### Step 2: Verify Tables Created

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'user_module%';

-- Expected output:
-- user_module_feedback
-- user_module_weights
-- user_module_weight_audit
-- user_module_feedback_summary (view)
```

### Step 3: Enable RLS

```sql
-- Already done in migration, but verify:
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_module_feedback';

-- Check RLS is enabled:
SELECT relname, relrowsecurity FROM pg_class
WHERE relname = 'user_module_feedback';
```

### Step 4: Test Triggers

```sql
-- Insert test feedback to verify trigger fires
INSERT INTO user_module_feedback (user_id, module_id, feedback_type, interacted_at)
VALUES ('test-user-uuid', 'test-module-uuid', 'accepted', NOW());

-- Verify weight record was created by trigger:
SELECT * FROM user_module_weights
WHERE user_id = 'test-user-uuid' AND module_id = 'test-module-uuid';
```

---

## Integration Points

### 1. Import Service in Components

```typescript
// In RecommendationCard.tsx
import { feedbackLoopService } from '@/services/feedbackLoopService';

// On accept:
await feedbackLoopService.recordModuleFeedback(
  userId,
  moduleId,
  'accepted',
  {
    recommendationId: recommendation.moduleId,
    confidenceScore: recommendation.confidence * 100,
  }
);
```

### 2. Connect to Recommendation Engine

```typescript
// In recommendationEngine.ts - PHASE 3.1
// After generating recommendations, apply learned weights:

const userWeights = await feedbackLoopService.getUserModuleWeights(userId);

recommendations.forEach(rec => {
  const weight = userWeights.get(rec.moduleId) || 1.0;
  rec.score *= weight; // Adjust score by learned weight
});
```

### 3. Display Preferences Dashboard

```typescript
// Create new component: UserPreferencesView.tsx
import { feedbackLoopService } from '@/services/feedbackLoopService';

export function UserPreferencesView({ userId }) {
  const [prefs, setPrefs] = useState(null);

  useEffect(() => {
    feedbackLoopService.getUserPreferences(userId)
      .then(setPrefs);
  }, [userId]);

  return (
    <div>
      <h2>Your Learning Path</h2>
      <p>Acceptance Rate: {(prefs.stats.acceptance_rate * 100).toFixed(1)}%</p>
      <p>Completed: {prefs.stats.total_completed} modules</p>
      <p>Learning Pace: {prefs.stats.learning_pace}</p>
    </div>
  );
}
```

### 4. Daily Weight Decay (Cron Job)

```typescript
// In a backend cron job handler
import { feedbackLoopService } from '@/services/feedbackLoopService';

export async function dailyWeightDecay() {
  const allUsers = await getAllUsers(); // Your user fetching logic

  for (const user of allUsers) {
    const decayedCount = await feedbackLoopService.decayOldRecommendations(
      user.id,
      30 // Decay after 30 days
    );
    console.log(`Decayed ${decayedCount} weights for user ${user.id}`);
  }
}

// Schedule this to run daily at off-peak hours:
// node cron, AWS Lambda, Google Cloud Scheduler, etc.
```

### 5. Gamification Awards

```typescript
// In feedbackLoopService.ts - Already integrated!
// But if needed in other contexts:

const result = await feedbackLoopService.handleModuleCompletion(userId, moduleId, {
  rating: 5,
  timeSpent: 45, // minutes
});

// result.xpAwarded = 100 (50 base + 50 bonus)
// result.achievement_unlocked = 'LEARNER' (if applicable)
// result.newLevel = 5 (if leveled up)
```

---

## Usage Examples

### Example 1: User Accepts Recommendation

```typescript
// From RecommendationCard component
const handleAccept = async () => {
  const feedback = await feedbackLoopService.recordModuleFeedback(
    currentUser.id,
    recommendation.moduleId,
    'accepted',
    {
      recommendationId: recommendation.id,
      confidenceScore: recommendation.score,
    }
  );

  // Feedback recorded, weight updated automatically via trigger
  // User receives 5 CP points
  // Navigate to ModuleProgressTracker
};
```

### Example 2: User Rejects with Reason

```typescript
const handleReject = async (reasons: string[], comment: string) => {
  const feedback = await feedbackLoopService.recordModuleFeedback(
    currentUser.id,
    moduleId,
    'rejected',
    {
      reason: JSON.stringify({
        reasons,
        comment,
        timestamp: new Date().toISOString(),
      }),
    }
  );

  // Weight decreased for this module
  // Module less likely to be recommended in future
  // No CP awarded
};
```

### Example 3: Track Module Progress

```typescript
// In ModuleProgressTracker component
const updateProgress = (newProgress: number) => {
  // Save to database (via API)
  await updateModuleProgress(moduleId, newProgress);
};

const markComplete = async (rating: number) => {
  const result = await feedbackLoopService.handleModuleCompletion(
    userId,
    moduleId,
    { rating }
  );

  // result contains:
  // - xpAwarded: 50 + (5 * 10) = 100
  // - achievement_unlocked: 'LEARNER' or null
  // - newLevel: 2 (if leveled up)

  showNotification(`You earned ${result.xpAwarded} CP! +${result.levelUpBonus} bonus`);
};
```

### Example 4: Get User Preferences

```typescript
const loadUserProfile = async () => {
  const prefs = await feedbackLoopService.getUserPreferences(userId);

  console.log('Accepted modules:', prefs.accepted_modules.length);
  console.log('Completed modules:', prefs.completed_modules.length);
  console.log('Acceptance rate:', (prefs.stats.acceptance_rate * 100).toFixed(1) + '%');
  console.log('Learning pace:', prefs.stats.learning_pace);
  console.log('Average rating:', prefs.stats.avg_rating.toFixed(1) + '/5');
};
```

### Example 5: Get Dynamic Weights

```typescript
const updateRecommendations = async () => {
  // Get user's learned weights
  const weights = await feedbackLoopService.getUserModuleWeights(userId);

  // Adjust recommendation scores
  recommendations.forEach(rec => {
    const customWeight = weights.get(rec.moduleId) || 1.0;
    rec.adjustedScore = rec.baseScore * customWeight;
  });

  // Display personalized rankings
  return recommendations.sort((a, b) => b.adjustedScore - a.adjustedScore);
};
```

---

## Testing

### Run Unit Tests

```bash
# Run all feedback service tests
npm test -- feedbackLoopService.test.ts

# Run specific test suite
npm test -- feedbackLoopService.test.ts --testNamePattern="recordModuleFeedback"

# Run with coverage
npm test -- --coverage feedbackLoopService.test.ts
```

### Manual Testing Checklist

1. **Test Accept Feedback:**
   - [ ] Click "Accept" on recommendation
   - [ ] Check database: `user_module_feedback` has 'accepted' record
   - [ ] Check gamification: 5 CP awarded
   - [ ] Check weight: Weight in `user_module_weights` increased

2. **Test Reject Feedback:**
   - [ ] Click "Reject"
   - [ ] FeedbackModal opens
   - [ ] Select multiple reasons
   - [ ] Submit feedback
   - [ ] Check weight: Weight decreased
   - [ ] Check CP: Not awarded

3. **Test Progress Tracking:**
   - [ ] Update progress to 50%
   - [ ] Update progress to 100%
   - [ ] "Mark as Complete" button appears
   - [ ] Select 5-star rating
   - [ ] Submit completion
   - [ ] Check XP awarded: 50 + (5*10) = 100

4. **Test Weight Calculation:**
   - [ ] Accept same module 5 times
   - [ ] Weight should be around 5+ (high)
   - [ ] Reject 5 times
   - [ ] Weight should be < 1 (low)
   - [ ] Complete module with 5-star rating
   - [ ] Weight should spike significantly

5. **Test Preferences View:**
   - [ ] Load user preferences
   - [ ] Verify correct counts
   - [ ] Verify correct rates
   - [ ] Verify learning pace detection

### Performance Testing

```bash
# Test with 1000 feedback records
npm test -- performance/feedbackLoad.test.ts

# Results should show:
# - Weight calculation: < 500ms
# - Preference aggregation: < 1s
# - Batch recalculation (100 users): < 5s
```

---

## Troubleshooting

### Issue: Weight not updating after feedback

**Symptom:** Submit feedback, but weight stays at 1.0

**Solution:**
1. Check trigger exists:
   ```sql
   SELECT trigger_name FROM information_schema.triggers
   WHERE event_object_table = 'user_module_feedback';
   ```

2. Check RLS policy allows update:
   ```sql
   SELECT * FROM pg_policies
   WHERE tablename = 'user_module_weights' AND cmd = 'UPDATE';
   ```

3. Manually recalculate:
   ```typescript
   await feedbackLoopService.updateModuleWeight(userId, moduleId, 'accepted');
   ```

### Issue: Performance degradation with many records

**Symptom:** Weight calculation takes > 10s

**Solution:**
1. Add missing indexes:
   ```sql
   CREATE INDEX idx_feedback_user_date ON user_module_feedback(user_id, interacted_at DESC);
   ```

2. Archive old records:
   ```sql
   -- Move records older than 2 years to archive table
   INSERT INTO user_module_feedback_archive
   SELECT * FROM user_module_feedback
   WHERE interacted_at < NOW() - INTERVAL '2 years';

   DELETE FROM user_module_feedback
   WHERE interacted_at < NOW() - INTERVAL '2 years';
   ```

3. Use batch operations:
   ```typescript
   // Don't calculate individually, batch instead
   await feedbackLoopService.recalculateUserWeights(userId);
   ```

### Issue: Gamification points not awarded

**Symptom:** User accepts module but doesn't get 5 CP

**Solution:**
1. Check gamificationService is imported:
   ```typescript
   import { gamificationService } from '@/services/gamificationService';
   ```

2. Check error in console (may be swallowed)
   ```typescript
   // In feedbackLoopService.ts
   private async awardFeedbackPoints(...) {
     try { ... }
     catch (error) {
       this.logger.error('Failed to award points', error); // ← Check this
     }
   }
   ```

3. Manually award points:
   ```typescript
   await gamificationService.addXp(userId, 5);
   ```

### Issue: Component not rendering feedback modal

**Symptom:** Click "Reject" but modal doesn't appear

**Solution:**
1. Check FeedbackModal imported:
   ```typescript
   import FeedbackModal from './FeedbackModal';
   ```

2. Check state management:
   ```typescript
   const [showFeedbackModal, setShowFeedbackModal] = useState(false);
   // Must be used in JSX:
   {showFeedbackModal && <FeedbackModal ... />}
   ```

3. Check Dialog component from UI library:
   ```typescript
   import { Dialog } from '@/components/ui/dialog';
   ```

---

## Next Steps

### Immediate (This Sprint):
- [ ] Run database migration
- [ ] Test RecommendationCard component
- [ ] Verify weight calculation with manual tests
- [ ] Enable gamification integration

### Short Term (Next Sprint):
- [ ] Create User Preferences dashboard
- [ ] Add analytics view
- [ ] Set up daily decay cron job
- [ ] Performance optimization if needed

### Medium Term (PHASE 4):
- [ ] Advanced analytics dashboard
- [ ] ML model for feedback prediction
- [ ] A/B testing framework
- [ ] User segmentation by learning pace

---

## Support

For detailed questions, see:
- **Algorithm Details**: `docs/PHASE_3_3_LEARNING_FEEDBACK_LOOP.md`
- **API Reference**: `src/api/feedbackAPI.ts` (JSDoc comments)
- **Service Methods**: `src/services/feedbackLoopService.ts` (detailed docs)
- **Component Props**: Individual component files (PropTypes/JSDoc)

---

**Last Updated:** December 2025
**Version:** 1.0
**Status:** Ready for Integration
