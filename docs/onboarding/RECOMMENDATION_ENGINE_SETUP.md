# Recommendation Engine - Setup & Integration Guide

**Status**: Ready for Integration
**Date**: December 11, 2025
**Complexity**: Medium
**Estimated Setup Time**: 2-3 hours

---

## Quick Start Checklist

- [ ] Review RECOMMENDATION_ENGINE_IMPLEMENTATION.md
- [ ] Run SQL migrations on your Supabase database
- [ ] Update environment variables (if needed)
- [ ] Initialize module catalog in database
- [ ] Test recommendation generation
- [ ] Integrate with onboarding flow
- [ ] Verify analytics tracking
- [ ] Deploy to production

---

## Installation Steps

### 1. Database Setup

#### Option A: Using Supabase Dashboard

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy the entire content from:
   ```
   src/services/migrations/001_create_recommendation_tables.sql
   ```
4. Paste into a new query
5. Click "Run"

**Expected Output**:
- 4 tables created
- 3 views created
- 4 functions created
- 8 triggers created
- RLS policies enabled

#### Option B: Using CLI

```bash
# Apply migration
supabase migration up

# Or manually if using Supabase:
supabase db push --file src/services/migrations/001_create_recommendation_tables.sql
```

### 2. Verify Database Setup

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'module_%' OR table_name LIKE 'user_%';

-- Check if functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%recommendation%';

-- Check if views exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'VIEW';
```

### 3. Seed Module Catalog

The migrations automatically initialize module weights. To add custom modules:

```typescript
// src/scripts/seed-modules.ts
import { supabase } from '@/lib/supabase';
import { MODULE_CATALOG } from '@/data/moduleDefinitions';

async function seedModules() {
  const { error } = await supabase
    .from('module_definitions')
    .upsert(
      MODULE_CATALOG.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        category: m.category,
        icon: m.icon,
        color: m.color,
        estimated_minutes: m.estimatedMinutes,
        difficulty: m.difficulty,
        priority: m.priority,
        triggering_trails: m.triggeringTrails,
        triggering_life_areas: m.triggeringLifeAreas,
        prerequisites: m.prerequisites,
        complementary_modules: m.complementaryModules,
        lessons: m.lessons,
        practice_activities: m.practiceActivities,
        urgency_boost: m.urgencyBoost,
        serendipity_factor: m.serendipityFactor,
      })),
      { onConflict: 'id' }
    );

  if (error) throw error;
  console.log('Modules seeded successfully');
}

// Run: npx ts-node src/scripts/seed-modules.ts
```

Run the seed script:
```bash
npx ts-node src/scripts/seed-modules.ts
```

### 4. Verify Modules Loaded

```typescript
// Check module count
import { MODULE_CATALOG } from '@/data/moduleDefinitions';
console.log(`Loaded ${MODULE_CATALOG.length} modules`);
```

Expected output: `Loaded 52 modules`

---

## Integration Points

### 1. Onboarding Flow

Update your onboarding completion handler:

```typescript
// src/pages/onboarding/final-step.tsx
import { generateRecommendations } from '@/api/recommendationAPI';

async function handleOnboardingComplete(userId: string) {
  // 1. Show loading state
  setIsLoading(true);

  try {
    // 2. Generate personalized recommendations
    const response = await generateRecommendations({
      userId,
      forceRefresh: true,
      limitResults: 6,
    });

    if (!response.success) {
      throw new Error(response.message);
    }

    // 3. Store recommendations in context/state
    setRecommendations(response.data);

    // 4. Show recommendations screen
    navigateTo('/onboarding/recommendations', {
      state: { recommendations: response.data },
    });
  } catch (error) {
    setError('Failed to generate recommendations');
    console.error(error);
  } finally {
    setIsLoading(false);
  }
}
```

### 2. Dashboard Widget

Create recommendation card component:

```typescript
// src/components/RecommendationCard.tsx
import { ModuleRecommendation } from '@/types/recommendationTypes';
import { submitRecommendationFeedback } from '@/api/recommendationAPI';

interface RecommendationCardProps {
  recommendation: ModuleRecommendation;
  userId: string;
  onFeedback?: (action: string) => void;
}

export function RecommendationCard({
  recommendation,
  userId,
  onFeedback,
}: RecommendationCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleFeedback = async (action: 'accepted' | 'rejected') => {
    setIsLoading(true);
    try {
      const result = await submitRecommendationFeedback({
        userId,
        moduleId: recommendation.moduleId,
        action,
      });

      if (result.success) {
        onFeedback?.(action);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const priorityColor = {
    critical: 'text-red-600 bg-red-50',
    high: 'text-blue-600 bg-blue-50',
    medium: 'text-yellow-600 bg-yellow-50',
    low: 'text-green-600 bg-green-50',
  };

  return (
    <div className="recommendation-card border rounded-lg p-4 mb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-lg">{recommendation.moduleName}</h3>
          <p className="text-sm text-gray-600">{recommendation.description}</p>
        </div>
        <div className={`${priorityColor[recommendation.priority]} px-2 py-1 rounded text-xs font-medium`}>
          {recommendation.priority.charAt(0).toUpperCase() + recommendation.priority.slice(1)}
        </div>
      </div>

      {/* Reason */}
      <p className="text-sm text-gray-700 mb-3 italic">"{recommendation.reason}"</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div>
          <span className="text-gray-500">Confiança</span>
          <div className="font-semibold">{Math.round(recommendation.confidence * 100)}%</div>
        </div>
        <div>
          <span className="text-gray-500">Duração</span>
          <div className="font-semibold">{recommendation.estimatedTimeToComplete} min</div>
        </div>
        <div>
          <span className="text-gray-500">Dificuldade</span>
          <div className="font-semibold capitalize">{/* from module */}</div>
        </div>
      </div>

      {/* Triggering Factors */}
      {recommendation.triggeringFactors.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-600 mb-1">Por quê:</p>
          <div className="flex flex-wrap gap-1">
            {recommendation.triggeringFactors.map((factor, idx) => (
              <span key={idx} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                {factor}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => handleFeedback('accepted')}
          disabled={isLoading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium disabled:opacity-50"
        >
          Explorar
        </button>
        <button
          onClick={() => handleFeedback('rejected')}
          disabled={isLoading}
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded font-medium disabled:opacity-50"
        >
          Pular
        </button>
      </div>
    </div>
  );
}
```

### 3. Module Detail Page

```typescript
// src/pages/modules/[moduleId].tsx
import { getModule } from '@/api/recommendationAPI';

export default function ModulePage({ moduleId }) {
  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadModule() {
      const response = await getModule({ moduleId });
      if (response.success) {
        setModule(response.module);
      }
      setLoading(false);
    }

    loadModule();
  }, [moduleId]);

  if (loading) return <LoadingSpinner />;
  if (!module) return <NotFoundPage />;

  return (
    <div className="module-detail">
      {/* Hero Section */}
      <div className="hero" style={{ backgroundColor: module.color }}>
        <div className="content">
          <h1>{module.name}</h1>
          <p className="lead">{module.description}</p>
        </div>
      </div>

      {/* Content */}
      <div className="container">
        {/* Key Info */}
        <div className="info-grid">
          <div>
            <span className="label">Duração</span>
            <span className="value">{module.estimatedMinutes} minutos</span>
          </div>
          <div>
            <span className="label">Dificuldade</span>
            <span className="value capitalize">{module.difficulty}</span>
          </div>
          <div>
            <span className="label">Lições</span>
            <span className="value">{module.lessons || 'N/A'}</span>
          </div>
          <div>
            <span className="label">Prática</span>
            <span className="value">{module.practiceActivities ? 'Sim' : 'Não'}</span>
          </div>
        </div>

        {/* Prerequisites */}
        {module.prerequisites.length > 0 && (
          <div className="section prerequisites">
            <h2>Pré-requisitos</h2>
            <p>Complete esses módulos primeiro:</p>
            <ul>
              {module.prerequisites.map(prereqId => (
                <li key={prereqId}>
                  {getModuleById(prereqId)?.name || prereqId}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Start Learning Button */}
        <button className="btn-primary btn-lg">
          Começar a Aprender
        </button>
      </div>
    </div>
  );
}
```

### 4. Feedback Hook

```typescript
// src/hooks/useRecommendationFeedback.ts
import { submitRecommendationFeedback } from '@/api/recommendationAPI';

export function useRecommendationFeedback(userId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitFeedback = async (
    moduleId: string,
    action: 'accepted' | 'rejected' | 'completed',
    feedback?: string,
    rating?: number
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await submitRecommendationFeedback({
        userId,
        moduleId,
        action,
        feedback,
        rating,
      });

      if (!response.success) {
        setError(response.message);
        return false;
      }

      return true;
    } catch (err) {
      setError('Failed to submit feedback');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { submitFeedback, loading, error };
}
```

---

## Configuration

### Environment Variables

No additional environment variables required! The system uses your existing:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Optional: Adjust Algorithm Weights

```typescript
// src/config/recommendation.config.ts
import { RecommendationAlgorithmConfig } from '@/types/recommendationTypes';

export const RECOMMENDATION_CONFIG: RecommendationAlgorithmConfig = {
  // Scoring weights (sum = 1.0)
  trailWeight: 0.6,      // Explicit trail answers
  momentWeight: 0.3,     // Implicit moment patterns
  behaviorWeight: 0.1,   // User engagement

  // Results
  maxRecommendations: 6,
  minConfidenceScore: 0.3,

  // Caching (in seconds)
  cacheEnabled: true,
  cacheTTL: 7 * 24 * 60 * 60,           // 7 days
  forceRefreshIfOlderThan: 14 * 24 * 60 * 60, // 14 days

  // Learning
  acceptanceFeedbackBoost: 5,
  rejectionFeedbackPenalty: -3,
  completionFeedbackBoost: 10,

  // Deduplication
  excludeAlreadyCompleted: true,
  excludePreviouslyRejected: true,
  penalizeRejectedScore: 0.4,

  // Advanced
  enableSerendipity: false,
  serendipityProbability: 0.15,
};

// Use in engine
import { getRecommendationEngine } from '@/services/recommendationEngine';
const engine = getRecommendationEngine(RECOMMENDATION_CONFIG);
```

---

## Testing

### Manual Testing Checklist

```bash
# 1. Test recommendation generation
POST /api/recommendations/generate
Body: {userId: "test-user-123", forceRefresh: true}

# 2. Test feedback submission
POST /api/recommendations/feedback
Body: {
  userId: "test-user-123",
  moduleId: "meditation_basics",
  action: "accepted",
  rating: 5
}

# 3. Test module retrieval
GET /api/modules/meditation_basics

# 4. Test module listing
GET /api/modules?category=emotional-health&limit=10

# 5. Verify cache hit
POST /api/recommendations/generate
# Should return cacheHit: true on second call
```

### Automated Testing

```typescript
// src/__tests__/recommendation.test.ts
import { recommendationAPI } from '@/api/recommendationAPI';
import { RecommendationEngine } from '@/services/recommendationEngine';

describe('Recommendation System', () => {
  const testUserId = 'test-user-123';

  test('should generate recommendations', async () => {
    const result = await recommendationAPI.generateRecommendations({
      userId: testUserId,
      forceRefresh: true,
    });

    expect(result.success).toBe(true);
    expect(result.data?.recommendations).toBeDefined();
    expect(result.data?.recommendations.length).toBeGreaterThan(0);
  });

  test('should record feedback', async () => {
    const result = await recommendationAPI.submitRecommendationFeedback({
      userId: testUserId,
      moduleId: 'meditation_basics',
      action: 'accepted',
      rating: 5,
    });

    expect(result.success).toBe(true);
  });

  test('should cache recommendations', async () => {
    const result1 = await recommendationAPI.generateRecommendations({
      userId: testUserId,
    });

    const result2 = await recommendationAPI.generateRecommendations({
      userId: testUserId,
    });

    expect(result1.cacheHit).toBe(false);
    expect(result2.cacheHit).toBe(true);
  });

  test('should score modules correctly', () => {
    const engine = new RecommendationEngine();
    // Additional tests...
  });
});

// Run: npm test -- recommendation.test.ts
```

---

## Troubleshooting

### Issue: Modules not loading

```typescript
// Check if modules are in database
SELECT COUNT(*) FROM module_definitions;
// Should return 52

// If 0, run seed script
npx ts-node src/scripts/seed-modules.ts
```

### Issue: Empty recommendations

```typescript
// Check if user has completed trails
SELECT * FROM onboarding_context_captures
WHERE user_id = 'test-user-123';

// Check if user has created moments
SELECT * FROM moments
WHERE user_id = 'test-user-123';

// If both empty, use test data
```

### Issue: Cache not working

```typescript
// Check cache setting
SELECT * FROM user_module_recommendations
WHERE user_id = 'test-user-123';

// If empty, cache might not have been saved
// Check for database errors

// Force refresh
POST /api/recommendations/generate
Body: {userId: "test-user-123", forceRefresh: true}
```

### Issue: Database errors

```sql
-- Check RLS policies
SELECT * FROM information_schema.table_privileges
WHERE table_name IN (
  'module_definitions',
  'user_module_recommendations',
  'module_feedback'
);

-- Check if user ID matches
SELECT auth.uid(); -- Should return user UUID
```

---

## Deployment

### Pre-Deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] SQL migrations applied to production database
- [ ] Module catalog seeded
- [ ] Environment variables configured
- [ ] API endpoints tested with Postman/curl
- [ ] Error logging configured
- [ ] Analytics tracking verified
- [ ] RLS policies enabled on production

### Production Deployment

```bash
# 1. Apply migrations to production database
supabase db push --file src/services/migrations/001_create_recommendation_tables.sql

# 2. Seed modules in production
NODE_ENV=production npx ts-node src/scripts/seed-modules.ts

# 3. Deploy API
git push heroku main
# or
vercel deploy

# 4. Verify in production
curl https://your-app.com/api/modules | jq '.total'
# Should return 52
```

### Rollback Plan

If issues occur:

```sql
-- Disable RLS temporarily to diagnose
ALTER TABLE user_module_recommendations DISABLE ROW LEVEL SECURITY;

-- Drop tables if needed
DROP TABLE IF EXISTS module_feedback CASCADE;
DROP TABLE IF EXISTS user_module_recommendations CASCADE;
DROP TABLE IF EXISTS module_learning_weights CASCADE;
DROP TABLE IF EXISTS module_definitions CASCADE;

-- Re-run migrations
-- Re-seed data
```

---

## Performance Tuning

### Monitor Query Performance

```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 100; -- Log queries > 100ms
SELECT pg_reload_conf();

-- Check slow queries
SELECT query, calls, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Index Optimization

```sql
-- Check which indexes are most used
SELECT indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Create additional indexes if needed
CREATE INDEX idx_recommendations_expires_at_user_id
ON user_module_recommendations(expires_at, user_id);
```

---

## Support & Documentation

**Main Documentation**: `RECOMMENDATION_ENGINE_IMPLEMENTATION.md`
**API Reference**: `docs/onboarding/MODULOS_RECOMENDACOES_LOGIC.md`
**Code**:
- `src/services/recommendationEngine.ts`
- `src/api/recommendationAPI.ts`
- `src/data/moduleDefinitions.ts`
- `src/types/recommendationTypes.ts`

---

**Setup Version**: 1.0
**Last Updated**: December 11, 2025
