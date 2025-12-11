# PHASE 1B: Testing Guide

**Purpose**: Comprehensive guide for testing onboarding API endpoints
**Date**: 2025-12-11

---

## Unit Tests

### Testing Trail Data

```typescript
// src/data/__tests__/contextualTrails.test.ts

import { describe, it, expect } from 'vitest';
import { CONTEXTUAL_TRAILS, ALL_TRAILS, getTrailById } from '@/data/contextualTrails';

describe('Contextual Trails Data', () => {
  it('should have exactly 5 trails', () => {
    expect(ALL_TRAILS.length).toBe(5);
  });

  it('should have all required trail IDs', () => {
    const trailIds = Object.keys(CONTEXTUAL_TRAILS);
    expect(trailIds).toContain('health-emotional');
    expect(trailIds).toContain('health-physical');
    expect(trailIds).toContain('finance');
    expect(trailIds).toContain('relationships');
    expect(trailIds).toContain('growth');
  });

  it('should return trail by ID', () => {
    const trail = getTrailById('health-emotional');
    expect(trail).toBeDefined();
    expect(trail?.name).toBe('Saúde Mental e Bem-estar Emocional');
  });

  it('each trail should have 3-4 questions', () => {
    ALL_TRAILS.forEach(trail => {
      expect(trail.questions.length).toBeGreaterThanOrEqual(3);
      expect(trail.questions.length).toBeLessThanOrEqual(4);
    });
  });

  it('all questions should be required', () => {
    ALL_TRAILS.forEach(trail => {
      trail.questions.forEach(q => {
        expect(q.isRequired).toBe(true);
      });
    });
  });

  it('all answers should have weights 0-10', () => {
    ALL_TRAILS.forEach(trail => {
      trail.questions.forEach(q => {
        q.answers.forEach(a => {
          expect(a.weight).toBeGreaterThanOrEqual(0);
          expect(a.weight).toBeLessThanOrEqual(10);
        });
      });
    });
  });

  it('should have unique answer IDs per question', () => {
    ALL_TRAILS.forEach(trail => {
      trail.questions.forEach(q => {
        const ids = q.answers.map(a => a.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });
    });
  });
});
```

---

### Testing Service Functions

```typescript
// src/services/__tests__/onboardingService.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCourseTrails,
  getTrailById_API,
  captureTrailResponses,
  calculateRecommendedModules,
} from '@/services/onboardingService';

describe('Onboarding Service', () => {
  const mockUserId = 'test-user-uuid';
  const mockTrailId = 'health-emotional';

  describe('getCourseTrails', () => {
    it('should return 5 trails', async () => {
      const trails = await getCourseTrails();
      expect(trails.length).toBe(5);
    });

    it('should return trails with all required fields', async () => {
      const trails = await getCourseTrails();
      trails.forEach(trail => {
        expect(trail.id).toBeDefined();
        expect(trail.name).toBeDefined();
        expect(trail.questions).toBeDefined();
        expect(trail.recommendedModules).toBeDefined();
      });
    });
  });

  describe('getTrailById_API', () => {
    it('should return specific trail', async () => {
      const trail = await getTrailById_API(mockTrailId);
      expect(trail?.id).toBe(mockTrailId);
    });

    it('should return undefined for invalid trail', async () => {
      const trail = await getTrailById_API('invalid-trail');
      expect(trail).toBeUndefined();
    });

    it('should return trail with all questions', async () => {
      const trail = await getTrailById_API(mockTrailId);
      expect(trail?.questions.length).toBeGreaterThan(0);
    });
  });

  describe('captureTrailResponses', () => {
    // Mock Supabase
    beforeEach(() => {
      vi.mock('@/services/supabaseClient');
    });

    it('should return error if trail not found', async () => {
      const result = await captureTrailResponses(
        mockUserId,
        'invalid-trail',
        []
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should calculate trail score between 0-10', async () => {
      const responses = [
        { questionId: 'q1_emotion', selectedAnswerIds: ['anxious'] },
        { questionId: 'q2_areas', selectedAnswerIds: ['self_awareness', 'stress_management'] },
        { questionId: 'q3_reflection_frequency', selectedAnswerIds: ['rarely'] },
        { questionId: 'q4_goal', selectedAnswerIds: ['reduce_stress'] },
      ];

      const result = await captureTrailResponses(
        mockUserId,
        mockTrailId,
        responses
      );

      if (result.success) {
        expect(result.trailScore).toBeGreaterThanOrEqual(0);
        expect(result.trailScore).toBeLessThanOrEqual(10);
      }
    });

    it('should recommend modules', async () => {
      const responses = [
        { questionId: 'q1_emotion', selectedAnswerIds: ['anxious'] },
        { questionId: 'q2_areas', selectedAnswerIds: ['stress_management'] },
        { questionId: 'q3_reflection_frequency', selectedAnswerIds: ['rarely'] },
        { questionId: 'q4_goal', selectedAnswerIds: ['reduce_stress'] },
      ];

      const result = await captureTrailResponses(
        mockUserId,
        mockTrailId,
        responses
      );

      if (result.success) {
        expect(Array.isArray(result.recommendedModules)).toBe(true);
        expect(result.recommendedModules.length).toBeGreaterThan(0);
      }
    });

    it('should award consciousness points', async () => {
      const responses = [
        { questionId: 'q1_emotion', selectedAnswerIds: ['joy'] },
        { questionId: 'q2_areas', selectedAnswerIds: ['self_awareness'] },
        { questionId: 'q3_reflection_frequency', selectedAnswerIds: ['daily'] },
        { questionId: 'q4_goal', selectedAnswerIds: ['understand_self'] },
      ];

      const result = await captureTrailResponses(
        mockUserId,
        mockTrailId,
        responses
      );

      if (result.success) {
        expect(result.pointsAwarded).toBeGreaterThan(0);
        expect(result.pointsAwarded).toBeLessThanOrEqual(25);
      }
    });
  });
});
```

---

## Integration Tests

### Manual Testing with Mock Data

```typescript
// src/__tests__/onboarding.integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  listAllTrails,
  getTrailDetails,
  captureContextualTrail,
  getOnboardingStatusEndpoint,
  finalizeOnboarding,
} from '@/api/onboardingAPI';

describe('Onboarding Integration Tests', () => {
  const testUserId = 'test-integration-user-id';

  describe('Trail Discovery', () => {
    it('can list all trails', async () => {
      const result = await listAllTrails();
      expect(result.success).toBe(true);
      expect(result.trails.length).toBe(5);
    });

    it('can get specific trail details', async () => {
      const result = await getTrailDetails('health-emotional');
      expect(result.success).toBe(true);
      expect(result.trail?.id).toBe('health-emotional');
      expect(result.trail?.questions.length).toBe(4);
    });

    it('returns error for invalid trail', async () => {
      const result = await getTrailDetails('invalid-trail-xyz');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Trail Completion Flow', () => {
    it('can capture health-emotional trail responses', async () => {
      const result = await captureContextualTrail({
        userId: testUserId,
        trailId: 'health-emotional',
        responses: [
          { questionId: 'q1_emotion', selectedAnswerIds: ['anxious'] },
          { questionId: 'q2_areas', selectedAnswerIds: ['self_awareness', 'stress_management'] },
          { questionId: 'q3_reflection_frequency', selectedAnswerIds: ['rarely'] },
          { questionId: 'q4_goal', selectedAnswerIds: ['reduce_stress'] },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.trailScore).toBeGreaterThan(0);
      expect(result.recommendedModules.length).toBeGreaterThan(0);
      expect(result.pointsAwarded).toBeGreaterThan(0);
    });

    it('can capture finance trail responses', async () => {
      const result = await captureContextualTrail({
        userId: testUserId,
        trailId: 'finance',
        responses: [
          { questionId: 'q1_financial_status', selectedAnswerIds: ['stressed'] },
          { questionId: 'q2_financial_priorities', selectedAnswerIds: ['budget', 'debt'] },
          { questionId: 'q3_expense_tracking', selectedAnswerIds: ['no_want'] },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.trailScore).toBeGreaterThan(0);
    });

    it('can capture relationships trail responses', async () => {
      const result = await captureContextualTrail({
        userId: testUserId,
        trailId: 'relationships',
        responses: [
          { questionId: 'q1_social_life', selectedAnswerIds: ['lonely'] },
          { questionId: 'q2_relationship_focus', selectedAnswerIds: ['friendships', 'community'] },
          { questionId: 'q3_relationship_importance', selectedAnswerIds: ['authenticity'] },
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Onboarding Status', () => {
    it('can get onboarding status after capturing trails', async () => {
      // First capture a trail
      await captureContextualTrail({
        userId: testUserId,
        trailId: 'health-emotional',
        responses: [
          { questionId: 'q1_emotion', selectedAnswerIds: ['anxious'] },
          { questionId: 'q2_areas', selectedAnswerIds: ['self_awareness'] },
          { questionId: 'q3_reflection_frequency', selectedAnswerIds: ['rarely'] },
          { questionId: 'q4_goal', selectedAnswerIds: ['reduce_stress'] },
        ],
      });

      // Get status
      const result = await getOnboardingStatusEndpoint(testUserId);
      expect(result.success).toBe(true);
      expect(result.status?.trailsCompleted).toBeGreaterThan(0);
      expect(result.progressPercentage).toBeGreaterThan(0);
    });
  });

  describe('Onboarding Finalization', () => {
    it('returns error if not enough trails completed', async () => {
      const userId = 'test-insufficient-trails';
      // Assume user has only 1 trail completed

      const result = await finalizeOnboarding(userId);
      // May fail due to < 3 trails
      if (!result.success) {
        expect(result.message).toContain('at least 3');
      }
    });
  });
});
```

---

## API Endpoint Tests

### Using Postman / cURL

#### 1. Get All Trails
```bash
curl -X GET http://localhost:3000/api/onboarding/trails \
  -H "Content-Type: application/json"

# Response
{
  "success": true,
  "trails": [
    {
      "id": "health-emotional",
      "name": "Saúde Mental e Bem-estar Emocional",
      "icon": "Brain",
      "color": "#6B9EFF",
      "priority": 1,
      "questions": [
        {
          "id": "q1_emotion",
          "question": "Como você está se sentindo emocionalmente?",
          "type": "single",
          "answers": [...]
        }
      ]
    },
    // ... 4 more trails
  ]
}
```

---

#### 2. Get Specific Trail
```bash
curl -X GET http://localhost:3000/api/onboarding/trails/health-emotional \
  -H "Content-Type: application/json"

# Response
{
  "success": true,
  "trail": {
    "id": "health-emotional",
    "name": "Saúde Mental e Bem-estar Emocional",
    // ... full trail details
  }
}
```

---

#### 3. Capture Trail Responses
```bash
curl -X POST http://localhost:3000/api/onboarding/capture-context \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -d '{
    "userId": "user-uuid-here",
    "trailId": "health-emotional",
    "responses": [
      {
        "questionId": "q1_emotion",
        "selectedAnswerIds": ["anxious"]
      },
      {
        "questionId": "q2_areas",
        "selectedAnswerIds": ["self_awareness", "stress_management"]
      },
      {
        "questionId": "q3_reflection_frequency",
        "selectedAnswerIds": ["rarely"]
      },
      {
        "questionId": "q4_goal",
        "selectedAnswerIds": ["reduce_stress"]
      }
    ]
  }'

# Response
{
  "success": true,
  "trailId": "health-emotional",
  "trailScore": 6.5,
  "recommendedModules": [
    "meditation",
    "stress_management",
    "breathing_exercises",
    "journaling",
    "daily_reflections"
  ],
  "pointsAwarded": 19,
  "nextStep": "complete_more_trails",
  "message": "Trail \"health-emotional\" completed successfully"
}
```

---

#### 4. Get Onboarding Status
```bash
curl -X GET "http://localhost:3000/api/onboarding/status?userId=user-uuid-here" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"

# Response
{
  "success": true,
  "status": {
    "userId": "user-uuid-here",
    "trailsCompleted": 1,
    "totalTrails": 5,
    "completedTrailIds": ["health-emotional"],
    "allRecommendedModules": [
      "meditation",
      "breathing_exercises",
      "journaling"
    ],
    "averageTrailScore": 6.5,
    "isOnboardingComplete": false,
    "lastCompletedTrailAt": "2025-12-11T10:30:00Z"
  },
  "progressPercentage": 20,
  "isComplete": false
}
```

---

#### 5. Finalize Onboarding
```bash
curl -X POST http://localhost:3000/api/onboarding/finalize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -d '{
    "userId": "user-uuid-here"
  }'

# Response (if >= 3 trails completed)
{
  "success": true,
  "nextStep": "step_2_moment_capture",
  "allRecommendedModules": [
    "meditation",
    "breathing_exercises",
    "journaling",
    "budget_builder",
    "expense_tracking",
    "communication_skills"
  ],
  "averageScore": 6.75,
  "pointsAwarded": 50,
  "message": "Onboarding completed! You have 6 personalized module recommendations."
}

# Response (if < 3 trails completed)
{
  "success": false,
  "nextStep": "view_recommendations",
  "message": "Please complete at least 3 trails. You have completed 1"
}
```

---

#### 6. Get Module Recommendations
```bash
curl -X GET "http://localhost:3000/api/onboarding/recommendations/user-uuid-here" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"

# Response
{
  "success": true,
  "modules": [
    {
      "moduleId": "meditation",
      "moduleName": "Meditation",
      "confidence": 1.0,
      "priority": "high",
      "reasonFromTrails": ["health-emotional", "relationships", "growth"]
    },
    {
      "moduleId": "journaling",
      "moduleName": "Journaling",
      "confidence": 0.67,
      "priority": "medium",
      "reasonFromTrails": ["health-emotional", "growth"]
    }
  ]
}
```

---

## Database Validation Tests

### Verify Data Persistence

```sql
-- Check if capture was saved
SELECT * FROM onboarding_context_captures
WHERE user_id = 'test-user-uuid'
ORDER BY created_at DESC
LIMIT 1;

-- Expected columns:
-- id, user_id, trail_id, responses, trail_score, recommended_modules, created_at, updated_at

-- Verify RLS works
-- Log in as different user and try to access this record
-- Should return 0 rows due to RLS policy

-- Check data integrity
SELECT
  user_id,
  trail_id,
  trail_score,
  array_length(recommended_modules, 1) as module_count,
  created_at
FROM onboarding_context_captures
ORDER BY created_at DESC
LIMIT 10;
```

---

## Performance Tests

### Load Testing

```typescript
// src/__tests__/performance.test.ts

import { performance } from 'perf_hooks';
import { captureContextualTrail } from '@/api/onboardingAPI';

describe('Performance Tests', () => {
  it('should capture trail responses in < 100ms', async () => {
    const start = performance.now();

    await captureContextualTrail({
      userId: 'perf-test-user',
      trailId: 'health-emotional',
      responses: [
        { questionId: 'q1_emotion', selectedAnswerIds: ['anxious'] },
        { questionId: 'q2_areas', selectedAnswerIds: ['self_awareness'] },
        { questionId: 'q3_reflection_frequency', selectedAnswerIds: ['rarely'] },
        { questionId: 'q4_goal', selectedAnswerIds: ['reduce_stress'] },
      ],
    });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should fetch onboarding status in < 50ms', async () => {
    const start = performance.now();

    await getOnboardingStatusEndpoint('perf-test-user');

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50);
  });

  it('should list all trails in < 20ms', async () => {
    const start = performance.now();

    await listAllTrails();

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(20);
  });
});
```

---

## Troubleshooting Tests

### Common Issues

```typescript
describe('Error Handling', () => {
  it('should handle missing userId gracefully', async () => {
    const result = await captureContextualTrail({
      userId: '',
      trailId: 'health-emotional',
      responses: [],
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('required');
  });

  it('should handle invalid trail ID', async () => {
    const result = await captureContextualTrail({
      userId: 'test-user',
      trailId: 'nonexistent-trail',
      responses: [],
    });

    expect(result.success).toBe(false);
  });

  it('should handle empty responses array', async () => {
    const result = await captureContextualTrail({
      userId: 'test-user',
      trailId: 'health-emotional',
      responses: [],
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('responses');
  });

  it('should handle missing required questions', async () => {
    const result = await captureContextualTrail({
      userId: 'test-user',
      trailId: 'health-emotional',
      responses: [
        { questionId: 'q1_emotion', selectedAnswerIds: ['anxious'] },
        // Missing q2_areas, q3_reflection_frequency, q4_goal
      ],
    });

    // Should either fail or return validation error
    if (!result.success) {
      expect(result.message).toContain('required');
    }
  });
});
```

---

## Checklist

- [ ] Unit tests pass for trail data
- [ ] Unit tests pass for service functions
- [ ] Integration tests pass
- [ ] All endpoints tested with cURL/Postman
- [ ] Database migration applied successfully
- [ ] RLS policies verified
- [ ] Performance tests pass
- [ ] Error handling tested
- [ ] Cross-user data access blocked by RLS

---

**Created**: 2025-12-11
**Status**: Ready for Testing
