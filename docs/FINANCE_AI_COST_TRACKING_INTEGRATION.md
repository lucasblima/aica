# Finance Module - AI Cost Tracking Integration Guide

## Overview

The Finance module uses AI for 5 different operations, all integrated with the AI Cost Tracking system. This guide documents all AI-powered features in the Finance Agent.

## Integrated Operations

### 1. Finance Agent Chat

**File:** `src/modules/finance/services/financeAgentService.ts`
**Function:** `chat()`
**Trigger:** User asks a question in Finance Agent
**Cost:** ~$0.0002 per message
**Tokens:** ~350-500 input, ~80-150 output

**Metadata Tracked:**
- `session_id`: Conversation session identifier
- `message_length`: Character count of user message
- `has_context`: Whether financial context is included
- `history_length`: Number of previous messages in conversation

### 2. Analyze Spending

**File:** `src/modules/finance/services/financeAgentService.ts`
**Function:** `analyzeSpending()`
**Trigger:** User requests spending analysis
**Cost:** ~$0.0004 per analysis
**Tokens:** ~600-800 input, ~180-250 output

**Metadata Tracked:**
- `transactions_count`: Number of transactions analyzed
- `date_range`: Time period analyzed (e.g., "2025-01-01 to 2025-01-31")
- `total_expenses`: Total amount spent in period

**Use Case:** Identifies spending patterns, suggests categories for reduction

### 3. Predict Next Month

**File:** `src/modules/finance/services/financeAgentService.ts`
**Function:** `predictNextMonth()`
**Trigger:** User requests monthly expense prediction
**Cost:** ~$0.0005 per prediction
**Tokens:** ~700-900 input, ~200-280 output

**Metadata Tracked:**
- `historical_months`: Number of months of historical data used
- `categories_count`: Number of spending categories analyzed
- `total_income`: Total income in period
- `total_expenses`: Total expenses in period

**Use Case:** Forecasts next month's expenses based on historical patterns

### 4. Suggest Savings

**File:** `src/modules/finance/services/financeAgentService.ts`
**Function:** `suggestSavings()`
**Trigger:** User requests savings opportunities
**Cost:** ~$0.0004 per suggestion set
**Tokens:** ~650-750 input, ~150-220 output

**Metadata Tracked:**
- `current_spending`: Total current spending amount
- `target_savings`: Amount user needs to save (based on negative balance)
- `categories_analyzed`: Number of categories reviewed
- `balance`: Current account balance

**Use Case:** Identifies specific opportunities to reduce spending

### 5. Identify Anomalies

**File:** `src/modules/finance/services/financeAgentService.ts`
**Function:** `identifyAnomalies()`
**Trigger:** User requests anomaly detection
**Cost:** ~$0.0005 per detection run
**Tokens:** ~800-1000 input, ~120-180 output

**Metadata Tracked:**
- `transactions_analyzed`: Number of transactions checked
- `anomalies_found`: Count of detected anomalies
- `date_range`: Time period analyzed
- `total_transactions`: Total transaction count

**Use Case:** Detects duplicate charges, unusual spending patterns, outliers

---

## Implementation Pattern

All Finance AI operations follow this pattern:

```typescript
const startTime = Date.now();

const result = await this.chat(userId, sessionId, prompt, [], context);

trackAIUsage({
  operation_type: 'text_generation',
  ai_model: 'gemini-2.0-flash',
  module_type: 'finance',
  module_id: sessionId,
  duration_seconds: (Date.now() - startTime) / 1000,
  request_metadata: {
    function_name: 'operationName',
    use_case: 'finance_use_case',
    // operation-specific metadata
  }
}).catch(error => {
  console.warn('[Finance AI Tracking] Non-blocking error:', error.message);
});
```

**Key Characteristics:**
- ✅ Non-blocking: Uses `.catch()` to prevent tracking errors from breaking app
- ✅ Fire-and-forget: No `await` on `trackAIUsage()`
- ✅ Rich metadata: Includes transaction counts, date ranges, financial metrics
- ✅ Consistent module_type: Always `'finance'`
- ✅ Duration tracking: Measures actual operation time

---

## Cost Estimates

### Per-Operation Costs (Gemini 2.0 Flash Pricing)

| Operation | Input Tokens | Output Tokens | Cost per Call |
|-----------|--------------|---------------|---------------|
| chat | 400 | 115 | $0.00020 |
| analyzeSpending | 700 | 215 | $0.00035 |
| predictNextMonth | 800 | 240 | $0.00040 |
| suggestSavings | 700 | 185 | $0.00035 |
| identifyAnomalies | 900 | 150 | $0.00043 |

**Pricing Model (as of 2026-01-08):**
- Input: $0.00000050 per token (50 cents per 1M tokens)
- Output: $0.00000150 per token ($1.50 per 1M tokens)

### Monthly Cost Projections

**Conservative Estimate (Low Usage):**
- 50 chat messages/month: $0.01
- 10 spending analyses/month: $0.004
- 4 monthly predictions/month: $0.002
- 8 savings suggestions/month: $0.003
- 4 anomaly detections/month: $0.002
- **Total:** ~$0.02/month per active user

**Moderate Estimate (Average Usage):**
- 200 chat messages/month: $0.04
- 30 spending analyses/month: $0.01
- 8 monthly predictions/month: $0.003
- 20 savings suggestions/month: $0.007
- 10 anomaly detections/month: $0.004
- **Total:** ~$0.06/month per active user

**High Estimate (Power User):**
- 500 chat messages/month: $0.10
- 60 spending analyses/month: $0.02
- 12 monthly predictions/month: $0.005
- 40 savings suggestions/month: $0.014
- 20 anomaly detections/month: $0.009
- **Total:** ~$0.15/month per active user

---

## Monitoring Queries

### Track Finance AI Usage

```sql
-- Daily Finance AI costs
SELECT
  DATE(created_at) as date,
  COUNT(*) as operation_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_cost_usd) as total_cost,
  ROUND(AVG(duration_seconds), 2) as avg_duration_seconds
FROM ai_usage_analytics
WHERE module_type = 'finance'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Finance Operations Breakdown

```sql
-- Cost breakdown by Finance operation
SELECT
  request_metadata->>'function_name' as operation,
  request_metadata->>'use_case' as use_case,
  COUNT(*) as call_count,
  ROUND(AVG(input_tokens)::numeric, 0) as avg_input_tokens,
  ROUND(AVG(output_tokens)::numeric, 0) as avg_output_tokens,
  ROUND(SUM(total_cost_usd)::numeric, 4) as total_cost,
  ROUND(AVG(duration_seconds)::numeric, 2) as avg_duration
FROM ai_usage_analytics
WHERE module_type = 'finance'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY request_metadata->>'function_name', request_metadata->>'use_case'
ORDER BY total_cost DESC;
```

### Most Expensive Finance Sessions

```sql
-- Top 10 most expensive Finance chat sessions
SELECT
  module_id as session_id,
  COUNT(*) as message_count,
  SUM(input_tokens) as total_input,
  SUM(output_tokens) as total_output,
  ROUND(SUM(total_cost_usd)::numeric, 4) as session_cost,
  MIN(created_at) as session_start,
  MAX(created_at) as session_end
FROM ai_usage_analytics
WHERE module_type = 'finance'
  AND request_metadata->>'function_name' = 'chat'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY module_id
ORDER BY session_cost DESC
LIMIT 10;
```

### Finance AI Performance Metrics

```sql
-- Performance metrics for Finance operations
SELECT
  request_metadata->>'function_name' as operation,
  COUNT(*) as total_calls,
  ROUND(AVG(duration_seconds)::numeric, 3) as avg_latency,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_seconds)::numeric, 3) as p95_latency,
  MAX(duration_seconds) as max_latency,
  COUNT(*) FILTER (WHERE duration_seconds > 5) as slow_calls
FROM ai_usage_analytics
WHERE module_type = 'finance'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY request_metadata->>'function_name'
ORDER BY total_calls DESC;
```

### Transaction Analysis Patterns

```sql
-- Analyze what transaction volumes Finance AI is processing
SELECT
  request_metadata->>'function_name' as operation,
  ROUND(AVG((request_metadata->>'transactions_count')::numeric), 0) as avg_transactions_processed,
  MAX((request_metadata->>'transactions_count')::numeric) as max_transactions,
  COUNT(*) as operation_count
FROM ai_usage_analytics
WHERE module_type = 'finance'
  AND request_metadata->>'transactions_count' IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY request_metadata->>'function_name'
ORDER BY avg_transactions_processed DESC;
```

---

## Testing

### Unit Tests

**File:** `src/modules/finance/services/__tests__/financeAITracking.test.ts`

**Coverage:**
- ✅ 40+ test cases covering all 5 operations
- ✅ Token extraction validation
- ✅ Non-blocking error handling
- ✅ Metadata accuracy checks
- ✅ Performance impact validation
- ✅ Edge case handling (zero tokens, large counts, missing metadata)

**Run tests:**
```bash
npm test financeAITracking.test.ts
npm test -- --coverage financeAITracking.test.ts
```

---

## Troubleshooting

### Issue: Tracking not working

**Check:**
1. Verify `trackAIUsage` is imported correctly
2. Check Supabase connection (`ai_usage_analytics` table exists)
3. Look for console warnings: `[Finance AI Tracking] Non-blocking error`
4. Verify user is authenticated (tracking requires `user_id`)

### Issue: High costs

**Check:**
1. Run cost breakdown query (see Monitoring Queries above)
2. Identify which operations are most expensive
3. Consider caching frequently requested analyses
4. Review session lengths (long chat sessions accumulate cost)

### Issue: Missing metadata

**Check:**
1. Verify `usageMetadata` is present in Gemini responses
2. Check fallback values are being used (0 for missing tokens)
3. Ensure `request_metadata` fields are populated correctly

---

## Related Documentation

- **Main AI Tracking Guide:** `docs/AI_COST_TRACKING_README.md`
- **Architecture:** `docs/architecture/AI_COST_TRACKING_ARCHITECTURE.md`
- **Migration Checklist:** `docs/AI_COST_TRACKING_MIGRATION_CHECKLIST.md`
- **Journey Example:** `docs/JOURNEY_AI_COST_TRACKING_INTEGRATION.md`
- **Test Summary:** `JOURNEY_AI_TRACKING_TESTS_SUMMARY.md`

---

**Last Updated:** 2026-01-08
**Module:** Finance
**Operations Tracked:** 5
**Test Coverage:** 40+ unit tests
**Status:** ✅ Fully Integrated
