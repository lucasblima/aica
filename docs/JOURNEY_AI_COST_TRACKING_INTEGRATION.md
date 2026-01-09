# Journey Module - AI Cost Tracking Integration Guide

## Overview

The Journey module uses AI for 7 different operations, all integrated with the AI Cost Tracking system.

## Integrated Operations

### 1. Analyze Content Realtime

**File:** `src/modules/journey/services/aiAnalysisService.ts`
**Trigger:** When user types in moment capture (real-time analysis)
**Cost:** ~$0.0001 per analysis
**Tokens:** ~100-200 input, ~50-100 output

### 2. Generate Post-Capture Insight

**File:** `src/modules/journey/services/aiAnalysisService.ts`
**Trigger:** After moment is saved to database
**Cost:** ~$0.0002 per insight
**Tokens:** ~200-300 input, ~100-150 output

### 3. Analyze Moment Sentiment

**File:** `src/modules/journey/services/momentService.ts`
**Trigger:** When moment is created
**Cost:** ~$0.0001 per analysis
**Tokens:** ~100-150 input, ~50 output

### 4. Generate Auto Tags

**File:** `src/modules/journey/services/momentPersistenceService.ts`
**Trigger:** Parallel with sentiment analysis
**Cost:** ~$0.0002 per tag generation
**Tokens:** ~150-200 input, ~75-100 output

### 5. Cluster Moments by Theme

**File:** `src/modules/journey/services/aiAnalysisService.ts`
**Trigger:** When user views journey dashboard
**Cost:** ~$0.0005 per clustering (bulk operation)
**Tokens:** ~500-1000 input, ~200-300 output

### 6. Generate Daily Question

**File:** `src/modules/journey/services/dailyQuestionService.ts`
**Trigger:** Once per day, scheduled
**Cost:** ~$0.0001 per question
**Tokens:** ~150-200 input, ~30-50 output
**Note:** Has 3s timeout fallback

### 7. Generate Weekly Summary

**File:** `src/modules/journey/services/weeklySummaryService.ts`
**Trigger:** Once per week
**Cost:** ~$0.001 per summary (bulk operation)
**Tokens:** ~1000-2000 input, ~300-500 output

---

## Implementation Pattern

All Journey AI operations follow this pattern:

```typescript
const startTime = Date.now();
const response = await geminiCall(...);

trackAIUsage({
  operation_type: 'text_generation',
  ai_model: 'gemini-2.0-flash',
  input_tokens: response.usageMetadata?.promptTokenCount,
  output_tokens: response.usageMetadata?.candidatesTokenCount,
  module_type: 'journey',
  module_id: contextId,
  duration_seconds: (Date.now() - startTime) / 1000,
  request_metadata: {
    use_case: 'operation_name',
    context: 'value'
  }
}).catch(error => {
  console.warn('[Journey AI Tracking] Non-blocking error:', error);
});
```

---

## Cost Estimates

### Per-Operation Costs

| Operation | Input | Output | Cost |
|-----------|-------|--------|------|
| analyze_content_realtime | 150 | 75 | $0.0001 |
| generate_post_capture_insight | 250 | 125 | $0.0002 |
| analyze_moment_sentiment | 125 | 50 | $0.0001 |
| generate_auto_tags | 175 | 90 | $0.0002 |
| cluster_moments_by_theme | 750 | 250 | $0.0005 |
| generate_daily_question | 175 | 40 | $0.0001 |
| generate_weekly_summary | 1500 | 400 | $0.001 |

### Monthly Estimates

**Light User (1 moment/day):** ~$0.025/month
**Regular User (5 moments/day):** ~$0.10/month
**Power User (20 moments/day):** ~$0.37/month

**Total for 1000 users: ~$110-120/month**

---

## Database Integration

All operations store data in `ai_usage_analytics` table:
- `module_type`: 'journey'
- `operation_type`: 'text_generation'
- `request_metadata`: Contains use_case and context data

---

**Last Updated:** 2026-01-08
**Status:** Complete and Integrated
**Maintained By:** Documentation Team
