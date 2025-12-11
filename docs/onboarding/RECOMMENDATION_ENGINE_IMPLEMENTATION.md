# Recommendation Engine Implementation Guide

**Status**: Complete Implementation
**Version**: 1.0
**Date**: December 11, 2025
**Author**: Aica Life OS - PHASE 3 Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Algorithm Details](#algorithm-details)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [Integration Guide](#integration-guide)
8. [Testing Strategy](#testing-strategy)
9. [Performance Considerations](#performance-considerations)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose

The Recommendation Engine is the intelligent backbone of Aica Life OS's onboarding process. It generates personalized module recommendations based on:

- **Trail Responses** (60% weight): Explicit answers from contextual trails
- **Moment Patterns** (30% weight): Implicit signals from user moments
- **User Behavior** (10% weight): Engagement metrics and activity patterns

### Key Features

✅ **Intelligent Scoring**: Weighted algorithm combining multiple signal sources
✅ **Contextual Matching**: Links trails/moments to 52+ available modules
✅ **Learning System**: Feedback improves future recommendations
✅ **Deduplication**: Prevents recommending completed/rejected modules
✅ **Smart Ordering**: Prerequisite-aware journey optimization
✅ **Caching**: 7-day cache reduces computation overhead
✅ **Analytics**: Comprehensive tracking of recommendation effectiveness

### Available Modules

The system manages 52 modules across 10 categories:

- **Emotional Health** (12 modules): Meditation, journaling, emotion regulation
- **Physical Health** (10 modules): Fitness, nutrition, sleep, energy
- **Finance** (12 modules): Budgeting, debt, savings, investment
- **Relationships** (10 modules): Communication, empathy, boundaries, connection
- **Personal Growth** (10 modules): Purpose, goals, habits, learning
- **Productivity & Wellness** (8 modules): Time management, focus, reflection

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Recommendation System                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐    ┌──────────────────┐                   │
│  │  User Inputs    │    │  Raw Data        │                   │
│  ├─────────────────┤    ├──────────────────┤                   │
│  │ - Trail Data    │────│ - Moments        │                   │
│  │ - Responses     │    │ - Feedback       │                   │
│  │ - Feedback      │    │ - Behavior       │                   │
│  └─────────────────┘    └──────────────────┘                   │
│           │                     │                                │
│           └─────────┬───────────┘                                │
│                     │                                            │
│          ┌──────────▼──────────┐                               │
│          │ Recommendation      │                               │
│          │ Engine Service      │                               │
│          │ (RecommendationEngine)                             │
│          │                     │                               │
│          │ PHASE 1: Extract    │                               │
│          │ PHASE 2: Signals    │                               │
│          │ PHASE 3: Score      │                               │
│          │ PHASE 4: Rank       │                               │
│          │ PHASE 5: Order      │                               │
│          │ PHASE 6: Summary    │                               │
│          └──────────┬──────────┘                               │
│                     │                                           │
│          ┌──────────▼──────────┐                               │
│          │ Result              │                               │
│          ├─────────────────────┤                               │
│          │ - Recommendations[] │                               │
│          │ - Summary           │                               │
│          │ - Metadata          │                               │
│          │ - Next Review Date  │                               │
│          └─────────────────────┘                               │
│                     │                                           │
│     ┌───────────────┼───────────────┐                          │
│     │               │               │                          │
│  ┌──▼──┐      ┌─────▼────┐    ┌────▼──┐                       │
│  │Cache│      │  Logging │    │ UI    │                       │
│  │(7d) │      │(Analytics)   │Display│                       │
│  └─────┘      └──────────┘    └───────┘                       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Layers

#### 1. Data Layer
- **module_definitions**: 52 module catalog with metadata
- **onboarding_context_captures**: User trail responses
- **moments**: User moment journal entries
- **module_feedback**: Individual feedback records
- **module_learning_weights**: Dynamic weights from feedback

#### 2. Service Layer
- **RecommendationEngine**: Core algorithm
- **Signal Extraction**: Convert data → signals
- **Scoring Engine**: Calculate module scores
- **Ranking System**: Select top modules

#### 3. API Layer
- **recommendationAPI**: REST endpoints
- **Admin endpoints**: Management functions
- **Analytics endpoints**: Performance tracking

#### 4. Integration Points
- **Onboarding flow**: Trigger after trails/moments
- **User dashboard**: Display recommendations
- **Feedback loop**: Learn from user actions
- **Analytics**: Monitor system performance

---

## Core Components

### 1. RecommendationEngine Service

**File**: `src/services/recommendationEngine.ts`
**Lines**: 650+
**Exports**: `RecommendationEngine` class, `getRecommendationEngine()` factory

#### Main Methods

```typescript
// Core generation
async generateRecommendations(
  userId: string,
  trailContexts: StoredContextCapture[],
  moments: any[],
  completedModuleIds: string[],
  userFeedback: Record<string, any>
): Promise<RecommendationResult>

// Signal extraction
private extractSignals(
  trailContexts,
  moments,
  userFeedback
): ExtractedSignals

// Behavior analysis
private calculateBehaviorSignals(
  userId,
  moments
): BehaviorSignal

// Module scoring
private scoreAllModules(
  signals,
  behavior,
  completedModuleIds
): Map<string, ModuleScore>
```

#### Key Features

- **6-Phase Algorithm**: Extract → Signals → Score → Rank → Order → Summarize
- **Flexible Weights**: Configurable trail/moment/behavior ratios
- **Extensible Signals**: Easy to add new signal types
- **Error Handling**: Graceful degradation with detailed logging
- **Performance**: Optimized for <1s generation time

### 2. Module Definitions Catalog

**File**: `src/data/moduleDefinitions.ts`
**Lines**: 550+
**Modules**: 52 complete definitions

#### Module Structure

```typescript
interface ModuleDefinition {
  id: string;                          // Unique identifier
  name: string;                        // Display name
  description: string;                 // What user learns
  category: ModuleCategory;            // 10 categories
  icon: string;                        // UI icon reference
  color: string;                       // UI color (hex/Tailwind)
  estimatedMinutes: number;            // Time to complete
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  priority: number;                    // 1-10 importance

  triggeringTrails: string[];          // Which trails recommend it
  triggeringLifeAreas: string[];       // Which life areas trigger it

  prerequisites: string[];             // Must complete first
  complementaryModules: string[];      // Recommended together

  lessons: number;                     // Number of lessons
  practiceActivities: boolean;         // Has practice
}
```

#### Module Categories

| Category | Modules | Focus |
|----------|---------|-------|
| Emotional Health | 12 | Emotional regulation, stress management, resilience |
| Physical Health | 10 | Fitness, nutrition, sleep, energy |
| Finance | 12 | Budgeting, debt, savings, investment |
| Relationships | 10 | Communication, empathy, connection, boundaries |
| Personal Growth | 10 | Purpose, vision, habits, confidence |
| Productivity | 8 | Time management, focus, goal setting |

### 3. Type Definitions

**File**: `src/types/recommendationTypes.ts`
**Lines**: 400+

Key types:

- **ModuleRecommendation**: Single recommendation with score
- **RecommendationResult**: Complete result set for user
- **ExtractedSignals**: Aggregated input signals
- **TrailSignal**: Explicit signal from trail
- **MomentSignal**: Implicit signal from moment
- **BehaviorSignal**: User activity metrics

### 4. REST API

**File**: `src/api/recommendationAPI.ts`
**Lines**: 250+
**Endpoints**: 9 public + 3 admin

#### Public Endpoints

```typescript
// Generate personalized recommendations
POST /api/recommendations/generate
Body: {userId, forceRefresh?, limitResults?}
Returns: RecommendationResult

// Submit feedback on recommendation
POST /api/recommendations/feedback
Body: {userId, moduleId, action, feedback?, rating?}
Returns: {success, message}

// Get specific module
GET /api/modules/:moduleId
Returns: {success, module, stats?}

// List modules with filter
GET /api/modules?category=X&difficulty=Y&limit=Z
Returns: {success, modules[], total, offset}

// Get current user's recommendations
GET /api/recommendations
Returns: RecommendationResult
```

#### Admin Endpoints

```typescript
// Force refresh user recommendations
POST /api/admin/recommendations/refresh/:userId

// Get module statistics
GET /api/admin/modules/stats

// Get user feedback trends
GET /api/admin/users/:userId/feedback-trends
```

---

## Algorithm Details

### Scoring Formula

```
MODULE_SCORE = (Trail_Contribution × 0.6) +
               (Moment_Contribution × 0.3) +
               (Behavior_Contribution × 0.1)

Where:
  Trail_Contribution = SUM(trail_signal_strength × trail_module_weight × priority)
  Moment_Contribution = SUM(moment_urgency × moment_life_area_match)
  Behavior_Contribution = BASE_SCORE × engagement_adjustment
```

### PHASE 1: Signal Extraction

Extract raw data into scored signals:

```typescript
// Trail Signal
{
  trailId: "health-emotional",
  trailName: "Saúde Mental",
  strength: 0.9,              // 90% questions answered
  trailScore: 85,             // 0-100 score
  triggerModuleIds: ["meditation", "breathing"],
  averageWeight: 7.5          // Answer importance
}

// Moment Signal
{
  momentId: "moment_123",
  emotion: "anxious",
  sentiment: -0.7,            // -1 = very negative
  urgency: 0.85,              // 0-1
  lifeAreas: ["health", "finance"]
}

// Behavior Signal
{
  userId: "user_123",
  momentStreak: 12,           // Days of consecutive moments
  engagementScore: 0.75,      // 0-1
  averageMomentSentiment: -0.2
}
```

### PHASE 2-3: Scoring

For each module:

1. **Trail-based scoring** (60% weight):
   ```
   IF module.triggeringTrails CONTAINS trail_id:
     score += module.priority × trail_strength × 0.6 × 10
   ```

2. **Moment-based scoring** (30% weight):
   ```
   FOR each moment:
     IF module.triggeringLifeAreas CONTAINS moment.life_area:
       score += moment.urgency × 0.3 × 10
   ```

3. **Behavior-based scoring** (10% weight):
   ```
   IF user.engagement > 0.7:
     score += 3 × 0.1 × 10  // Boost habits for engaged users
   ```

4. **Complementary boosts**:
   ```
   FOR each high-scoring module:
     FOR each complementary_module:
       complementary_module.score += 5
   ```

5. **Deduplication**:
   ```
   REMOVE modules in completed_list
   PENALIZE modules in rejected_list (score *= 0.4)
   ```

### PHASE 4: Ranking

1. Filter: score > 0 AND confidence >= min_threshold
2. Sort: by score descending
3. Select: top N (default 6)
4. Normalize: score to 0-100 scale

### PHASE 5: Ordering

Topological sort by prerequisites:

```
FOR each recommendation:
  VISIT_DEPENDENCIES(module)
  ADD to ordered_list

RESULT: Prerequisites before dependents
        Higher priority comes first
```

Example:
```
[meditation_basics, breathing_exercises]
    ↓
[stress_management, anxiety_management]
    ↓
[relationship_insights]
```

### PHASE 6: Summary

Generate human-readable explanation:

```
"Com base em sua trilha de Saúde Mental e seus
últimos momentos, recomendamos começar com
'Meditação para Iniciantes'. Essa é a área
onde você pode obter maior impacto rápido."
```

---

## Database Schema

### Tables

#### 1. module_definitions
Catalog of all available modules.

```sql
-- Key columns:
id (UUID, PRIMARY KEY)
name VARCHAR(255)
category VARCHAR(50)
priority INTEGER (1-10)
estimated_minutes INTEGER
difficulty VARCHAR(20)
triggering_trails TEXT[]    -- Array of trail IDs
prerequis sites TEXT[]       -- Array of module IDs
complementary_modules TEXT[] -- Array of module IDs
created_at, updated_at TIMESTAMPTZ
```

#### 2. user_module_recommendations
Current cached recommendations per user.

```sql
-- Key columns:
id (UUID, PRIMARY KEY)
user_id (UUID, FOREIGN KEY)
recommended_modules TEXT[]   -- Ordered array of IDs
recommendations_data JSONB   -- Full result object
user_feedback JSONB          -- Feedback history
generated_at TIMESTAMPTZ
expires_at TIMESTAMPTZ       -- 7-day expiry
UNIQUE(user_id)
```

#### 3. module_feedback
Individual feedback records.

```sql
-- Key columns:
id (UUID, PRIMARY KEY)
user_id (UUID, FOREIGN KEY)
module_id (UUID, FOREIGN KEY)
action VARCHAR(20)           -- accepted/rejected/completed
feedback_text TEXT
rating INTEGER (1-5)
feedback_at TIMESTAMPTZ
```

#### 4. module_learning_weights
Dynamic weights learned from feedback.

```sql
-- Key columns:
id (UUID, PRIMARY KEY)
module_id (UUID, FOREIGN KEY, UNIQUE)
base_priority INTEGER
feedback_adjustment DECIMAL(3,2)
total_recommendations INTEGER
accepted_count INTEGER
rejection_count INTEGER
completed_count INTEGER
acceptance_rate DECIMAL (GENERATED)
completion_rate DECIMAL (GENERATED)
last_updated TIMESTAMPTZ
```

### Views

```sql
v_module_recommendation_stats    -- Module performance analytics
v_user_recommendation_history    -- User's recommendation history
v_user_feedback_trends           -- User feedback patterns
```

### Functions

```sql
get_user_recommendations(user_id)         -- Get current recommendations
record_module_feedback(...)                -- Record feedback + update weights
initialize_module_weights()                -- Setup initial weights
```

---

## API Reference

### Generate Recommendations

```http
POST /api/recommendations/generate
Content-Type: application/json

{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "forceRefresh": false,
  "limitResults": 6
}

Response 200:
{
  "success": true,
  "data": {
    "userId": "550e8400...",
    "recommendations": [
      {
        "moduleId": "meditation_basics",
        "moduleName": "Meditação para Iniciantes",
        "description": "Aprenda técnicas...",
        "score": 95,
        "confidence": 0.95,
        "priority": "critical",
        "reason": "Você selecionou 'ansioso'...",
        "triggeringFactors": ["Saúde Mental (trilha)", "padrão em momentos"],
        "suggestedStartDate": "2025-12-11T00:00:00Z",
        "estimatedTimeToComplete": 240,
        "complementaryModules": ["breathing_exercises"],
        "prerequisites": []
      },
      ...
    ],
    "personalizationSummary": "Com base em sua trilha...",
    "algorithmMetadata": {
      "trailWeight": 0.6,
      "momentWeight": 0.3,
      "behaviorWeight": 0.1
    },
    "nextReviewDate": "2025-12-18T00:00:00Z",
    "totalModulesEvaluated": 52,
    "generatedAt": "2025-12-11T10:30:00Z"
  },
  "message": "6 recomendações personalizadas...",
  "cacheHit": false
}
```

### Submit Feedback

```http
POST /api/recommendations/feedback
Content-Type: application/json

{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "moduleId": "meditation_basics",
  "action": "accepted",
  "feedback": "Excelente módulo!",
  "rating": 5
}

Response 200:
{
  "success": true,
  "message": "Obrigado pelo feedback!...",
  "updatedModuleScore": 97,
  "recommendationRefreshTriggered": false
}
```

### Get Module

```http
GET /api/modules/meditation_basics

Response 200:
{
  "success": true,
  "module": {
    "id": "meditation_basics",
    "name": "Meditação para Iniciantes",
    "description": "Aprenda técnicas...",
    "category": "emotional-health",
    "estimatedMinutes": 240,
    "difficulty": "beginner",
    "priority": 9,
    "lessons": 8,
    "prerequisites": [],
    "complementaryModules": ["breathing_exercises"]
  },
  "recommendationContext": {
    "userScore": 95,
    "userConfidence": 0.95,
    "feedbackStats": {
      "totalRecommendations": 1250,
      "acceptedCount": 950,
      "completedCount": 750,
      "acceptanceRate": 0.76,
      "completionRate": 0.79
    }
  }
}
```

### List Modules

```http
GET /api/modules?category=emotional-health&difficulty=beginner&limit=10&offset=0

Response 200:
{
  "success": true,
  "modules": [...],
  "total": 12,
  "limit": 10,
  "offset": 0
}
```

---

## Integration Guide

### 1. Onboarding Flow Integration

After user completes trail or moment:

```typescript
// In onboarding component
import { recommendationAPI } from '@/api/recommendationAPI';

async function finalizeOnboardingAndRecommend(userId: string) {
  try {
    // Generate recommendations
    const result = await recommendationAPI.generateRecommendations({
      userId,
      forceRefresh: true,
      limitResults: 6
    });

    if (result.success) {
      // Display recommendations to user
      displayRecommendations(result.data);

      // Navigate to next step
      navigateTo('/onboarding/recommendations');
    }
  } catch (error) {
    console.error('Failed to generate recommendations', error);
  }
}
```

### 2. Dashboard Integration

Display recommendations on user dashboard:

```typescript
// In dashboard component
import { recommendationAPI } from '@/api/recommendationAPI';
import { useEffect, useState } from 'react';

export function RecommendationsWidget({ userId }) {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecommendations() {
      const result = await recommendationAPI.getUserRecommendations(userId);
      if (result.success) {
        setRecommendations(result.data);
      }
      setLoading(false);
    }

    loadRecommendations();
  }, [userId]);

  if (loading) return <LoadingSpinner />;
  if (!recommendations) return <ErrorMessage />;

  return (
    <div className="recommendations-widget">
      <h2>Recomendações Personalizadas</h2>
      <p className="summary">{recommendations.personalizationSummary}</p>

      <div className="module-list">
        {recommendations.recommendations.map(rec => (
          <ModuleCard
            key={rec.moduleId}
            module={rec}
            onAccept={() => handleFeedback(rec.moduleId, 'accepted')}
            onReject={() => handleFeedback(rec.moduleId, 'rejected')}
          />
        ))}
      </div>
    </div>
  );
}

async function handleFeedback(moduleId, action) {
  await recommendationAPI.submitRecommendationFeedback({
    userId: currentUser.id,
    moduleId,
    action,
    rating: undefined
  });
}
```

### 3. Feedback Loop Integration

Track when user completes module:

```typescript
// When user finishes module
async function onModuleComplete(moduleId: string) {
  // Award consciousness points (from gamification engine)
  await awardConsciousnessPoints(userId, 50);

  // Record module feedback
  await recommendationAPI.submitRecommendationFeedback({
    userId,
    moduleId,
    action: 'completed',
    rating: userRating // 1-5
  });

  // Trigger recommendations refresh
  const newRecommendations = await recommendationAPI.generateRecommendations({
    userId,
    forceRefresh: true
  });

  displayRecommendations(newRecommendations.data);
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// recommendationEngine.test.ts
describe('RecommendationEngine', () => {
  test('should extract trail signals correctly', () => {
    const engine = new RecommendationEngine();
    const trailContext = createMockTrailContext();
    const signal = engine.extractTrailSignal(trailContext);

    expect(signal.trailId).toBe('health-emotional');
    expect(signal.strength).toBeGreaterThan(0);
    expect(signal.triggerModuleIds).toContain('meditation_basics');
  });

  test('should score modules correctly', () => {
    const scores = engine.scoreAllModules(signals, behavior, []);

    expect(scores.size).toBe(52);
    expect(scores.get('meditation_basics')?.score).toBeGreaterThan(30);
  });

  test('should rank and select top modules', () => {
    const recommendations = engine.rankAndSelectModules(scores);

    expect(recommendations).toHaveLength(6);
    expect(recommendations[0].score).toBeGreaterThanOrEqual(recommendations[1].score);
  });
});
```

### Integration Tests

```typescript
// recommendationAPI.test.ts
describe('Recommendation API', () => {
  test('should generate recommendations end-to-end', async () => {
    const result = await recommendationAPI.generateRecommendations({
      userId: testUserId,
      forceRefresh: true
    });

    expect(result.success).toBe(true);
    expect(result.data?.recommendations).toHaveLength(6);
    expect(result.data?.personalizationSummary).toBeDefined();
  });

  test('should record feedback and trigger learning', async () => {
    await recommendationAPI.submitRecommendationFeedback({
      userId: testUserId,
      moduleId: 'meditation_basics',
      action: 'accepted',
      rating: 5
    });

    // Verify feedback was recorded
    const feedback = await db.module_feedback.findByUserAndModule();
    expect(feedback).toBeDefined();
  });

  test('should cache recommendations for 7 days', async () => {
    const result1 = await recommendationAPI.generateRecommendations({userId});
    const result2 = await recommendationAPI.generateRecommendations({userId});

    expect(result1.cacheHit).toBe(false);
    expect(result2.cacheHit).toBe(true);
  });
});
```

### Performance Tests

```typescript
// performance.test.ts
test('should generate recommendations in < 1 second', async () => {
  const start = Date.now();

  await recommendationAPI.generateRecommendations({
    userId: testUserId,
    forceRefresh: true
  });

  const duration = Date.now() - start;
  expect(duration).toBeLessThan(1000);
});
```

---

## Performance Considerations

### Optimization Strategies

1. **Caching**: 7-day cache reduces compute from 0-2s to 10-50ms
2. **Lazy Loading**: Load modules on demand
3. **Database Indexes**: Optimize queries with strategic indexes
4. **Batch Operations**: Fetch data in single query
5. **Algorithm Simplicity**: O(n) complexity, not O(n²)

### Database Performance

```sql
-- Key indexes for performance
CREATE INDEX idx_module_definitions_category ON module_definitions(category);
CREATE INDEX idx_recommendations_user_id ON user_module_recommendations(user_id);
CREATE INDEX idx_feedback_user_module ON module_feedback(user_id, module_id);
CREATE INDEX idx_learning_weights_tendency ON module_learning_weights(recommendation_tendency DESC);
```

### Expected Performance

| Operation | Time | Cache |
|-----------|------|-------|
| Generate recommendations | 500-900ms | 10-50ms |
| Submit feedback | 100-200ms | N/A |
| List modules | 50-100ms | 5-20ms |
| Get module | 20-50ms | 5-10ms |
| Admin stats | 1-2s | 100-500ms |

---

## Troubleshooting

### Common Issues

#### Issue 1: Empty Recommendations
**Symptom**: No recommendations generated for user
**Causes**:
- User hasn't completed any trails (no signals)
- All recommendations have minimum score of 0
- User already completed all modules

**Solution**:
```typescript
// Fallback to popular modules for new users
if (recommendations.length === 0) {
  const fallback = MODULE_CATALOG
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);

  return {
    ...result,
    recommendations: fallback,
    personalizationSummary: "Comece com nossos módulos mais populares"
  };
}
```

#### Issue 2: Cache Not Expiring
**Symptom**: User sees old recommendations after feedback
**Cause**: Cache TTL too long or manual refresh not triggered

**Solution**:
```typescript
// Force refresh after feedback
await recommendationAPI.submitRecommendationFeedback({...});
await recommendationAPI.generateRecommendations({
  userId,
  forceRefresh: true  // This bypasses cache
});
```

#### Issue 3: Unfair Score Weighting
**Symptom**: Moments dominate recommendations
**Solution**: Adjust weights in algorithm config
```typescript
const engine = new RecommendationEngine({
  trailWeight: 0.7,      // Increase trail influence
  momentWeight: 0.2,     // Decrease moment influence
  behaviorWeight: 0.1
});
```

#### Issue 4: Prerequisites Blocking
**Symptom**: User can't access needed module
**Solution**: Allow prerequisite bypass for critical modules
```typescript
// Mark modules that can be taken out-of-order
if (module.priority >= 8) {
  recommendation.prerequisites = []; // Critical modules have no prereqs
}
```

### Debug Logging

Enable detailed logging:

```typescript
// In environment
process.env.DEBUG_RECOMMENDATIONS = 'true';

// In recommendation engine
private logger = {
  debug: (msg: string, data?: any) => {
    if (process.env.DEBUG_RECOMMENDATIONS) {
      console.debug(`[RecommendationEngine] ${msg}`, data);
    }
  }
};
```

Check logs for:
- Signal extraction details
- Score calculations per module
- Ranking decisions
- Cache hit/miss

---

## Future Enhancements

### Phase 3.1: Machine Learning
- Neural network for weight optimization
- Predict completion likelihood
- Personalized ordering for each user

### Phase 3.2: Advanced Analytics
- Cohort analysis of recommendation patterns
- A/B testing framework
- Recommendation diversity metrics

### Phase 3.3: Real-time Updates
- Websocket notifications for new recommendations
- Live feedback aggregation
- Dynamic weight adjustment

### Phase 3.4: Integration Expansion
- Email digests of top recommendations
- SMS notifications for urgent modules
- Calendar integration for module scheduling

---

## Appendix

### A. Module ID Reference

```
EMOTIONAL HEALTH:
- meditation_basics, breathing_exercises, journaling
- emotion_picker, stress_management, daily_reflections
- mood_tracking, growth_mindset, rest_recovery
- motivation_boost, affirmations, support_network

PHYSICAL HEALTH:
- fitness_tracking, exercise_library, nutrition_tracker
- sleep_hygiene, sleep_tracking, movement_breaks
- meal_planning, energy_optimization, recovery_optimization
- nutrition_balance

FINANCE:
- budget_builder, expense_tracking, debt_management
- savings_goals, emergency_fund, investment_education
- income_boost, wealth_strategies, financial_foundation
- credit_repair, spending_analysis, negotiation_tips

RELATIONSHIPS:
- communication_skills, conflict_resolution, empathy_development
- boundary_setting, self_love, connection_building
- vulnerability_practice, social_skills, relationship_insights
- family_dynamics

PERSONAL GROWTH:
- purpose_discovery, values_clarification, life_design
- career_planning, habit_building, learning_paths
- confidence_building, vision_setting, spirituality_exploration
- creative_expression

PRODUCTIVITY:
- time_management, focus_techniques, weekly_summaries
- goal_setting, priority_management, success_tracking
- deep_work, mindfulness
```

### B. Configuration Examples

```typescript
// Conservative: Favor explicit trails
const config = {
  trailWeight: 0.8,
  momentWeight: 0.1,
  behaviorWeight: 0.1
};

// Balanced: Default
const config = {
  trailWeight: 0.6,
  momentWeight: 0.3,
  behaviorWeight: 0.1
};

// Aggressive: Moment-driven
const config = {
  trailWeight: 0.4,
  momentWeight: 0.5,
  behaviorWeight: 0.1
};

// Diversified: High serendipity
const config = {
  enableSerendipity: true,
  serendipityProbability: 0.3
};
```

---

**Document Version**: 1.0
**Last Updated**: December 11, 2025
**Maintained By**: Aica Life OS Development Team
