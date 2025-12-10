# AI Cost Tracking - Complete Documentation

This directory contains the complete documentation for AI usage cost tracking in Aica Life OS.

## Quick Links

- **Architecture** → `architecture/AI_COST_TRACKING_ARCHITECTURE.md`
- **Integration Examples** → `examples/AI_TRACKING_INTEGRATION_EXAMPLES.md`
- **Migration File** → `../supabase/migrations/20251209000000_ai_cost_tracking_enhancements.sql`
- **Service Implementation** → `../src/services/aiUsageTrackingService.ts`

## Quick Start

### 1. Apply Database Migration

```bash
# From project root
supabase db push
```

This creates:
- `ai_model_pricing` table (pricing source of truth)
- `ai_usage_tracking_errors` table (error logging)
- `mv_daily_ai_costs` materialized view (performance)
- SQL functions for tracking and cost calculation
- Triggers for data validation

### 2. Import Tracking Service

```typescript
import { trackAIUsage } from '@/services/aiUsageTrackingService';
```

### 3. Add Tracking to Your AI Calls

```typescript
// After successful Gemini API call
const response = await gemini.generateContent(prompt);

// Track usage (fire-and-forget, non-blocking)
trackAIUsage({
  operation_type: 'text_generation',
  ai_model: 'gemini-2.0-flash',
  input_tokens: response.usageMetadata?.promptTokenCount,
  output_tokens: response.usageMetadata?.candidatesTokenCount,
  module_type: 'grants',
  module_id: projectId
});

return response.text();
```

### 4. Verify Tracking Works

```sql
-- Check latest tracking records
SELECT * FROM ai_usage_analytics
ORDER BY created_at DESC
LIMIT 10;
```

## Key Features

### Non-Blocking Tracking
- Fire-and-forget async calls
- Zero latency impact on user experience
- < 10ms overhead

### Automatic Cost Calculation
- Centralized pricing table (`ai_model_pricing`)
- Automatic lookup and calculation
- Local cache fallback for resilience

### Fail-Safe Design
- Tracking errors NEVER break functionality
- Comprehensive error logging
- Graceful degradation

### Performance Optimized
- Strategic indexes for fast queries
- Materialized view for dashboard
- Batch tracking support

### Complete Observability
- Real-time cost tracking
- Budget monitoring
- Error rate tracking

## Architecture Overview

```
Application Layer (Modules)
       ↓
Tracking Service Layer (TypeScript/Python)
       ↓
Database Layer (PostgreSQL Functions)
       ↓
Storage (ai_usage_analytics table)
```

**Key Principle:** Tracking is completely decoupled from business logic.

## Documentation Structure

### Architecture Document
`architecture/AI_COST_TRACKING_ARCHITECTURE.md` (10,000+ words)

Comprehensive reference covering:
- System design and data flow
- Database schema and functions
- Security (RLS policies)
- Performance optimization
- Error handling strategy
- Monitoring and alerting
- Migration guide

### Integration Examples
`examples/AI_TRACKING_INTEGRATION_EXAMPLES.md` (5,000+ words)

Practical code examples:
- Basic usage patterns
- Module-specific integrations (Grants, Journey, Podcast)
- Backend (Python FastAPI) integration
- Error handling patterns
- Performance best practices
- Streaming responses
- Batch operations

### Migration File
`../supabase/migrations/20251209000000_ai_cost_tracking_enhancements.sql` (800+ lines)

Complete database migration:
- Tables: `ai_model_pricing`, `ai_usage_tracking_errors`
- Functions: `log_ai_usage`, `calculate_token_cost`, `get_current_model_pricing`
- Triggers: Cost validation
- Indexes: Performance optimization
- RLS Policies: Security
- Materialized View: Dashboard optimization
- Seed Data: Current Gemini pricing

### Service Implementation
`../src/services/aiUsageTrackingService.ts` (400+ lines)

TypeScript service with:
- `trackAIUsage()` - Main tracking function
- `withAITracking()` - Wrapper for automatic tracking
- `trackAIUsageBatch()` - Bulk operations
- `extractGeminiUsageMetadata()` - Usage extraction
- `calculateCost()` - Cost calculation
- Error handling and logging

## Common Use Cases

### 1. Simple Text Generation

```typescript
import { trackAIUsage, extractGeminiUsageMetadata } from '@/services/aiUsageTrackingService';

const response = await gemini.generateContent(prompt);
const usage = extractGeminiUsageMetadata(response);

trackAIUsage({
  operation_type: 'text_generation',
  ai_model: 'gemini-2.0-flash',
  ...usage,
  module_type: 'grants'
});
```

### 2. Wrapper Pattern (Recommended)

```typescript
import { withAITracking } from '@/services/aiUsageTrackingService';

const result = await withAITracking(
  () => gemini.generateContent(prompt),
  {
    operation_type: 'text_generation',
    ai_model: 'gemini-2.0-flash',
    module_type: 'grants'
  }
);
```

### 3. Backend (Python)

```python
from services.ai_tracking import track_ai_usage

response = gemini.generate_content(prompt)

track_ai_usage(
    user_id=user_id,
    operation_type='text_generation',
    ai_model='gemini-2.0-flash',
    input_tokens=response.usage.input,
    output_tokens=response.usage.output
)
```

## Troubleshooting

### Records Not Appearing

**Check:**
1. RLS policies (are you authenticated?)
2. `ai_usage_tracking_errors` table for errors
3. Console logs for tracking failures

**Solution:**
```sql
-- As authenticated user
SELECT * FROM ai_usage_analytics WHERE user_id = auth.uid();

-- Check errors
SELECT * FROM ai_usage_tracking_errors ORDER BY created_at DESC LIMIT 10;
```

### Cost Calculations Incorrect

**Check:**
1. Pricing data loaded correctly
2. Model name matches exactly
3. Trigger validation working

**Solution:**
```sql
-- Verify pricing
SELECT * FROM ai_model_pricing WHERE model_name = 'gemini-2.0-flash';

-- Test calculation
SELECT * FROM calculate_token_cost('gemini-2.0-flash', 1000, 500);
```

### High Error Rate

**Check:**
1. Database connection health
2. Supabase service key valid
3. Recent migration applied

**Solution:**
```sql
-- Check error patterns
SELECT error_message, COUNT(*)
FROM ai_usage_tracking_errors
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY error_message;
```

## Performance Tips

### 1. Fire-and-Forget
```typescript
// DON'T await tracking in critical paths
trackAIUsage({...}); // No await

// Continue immediately
return response;
```

### 2. Use Materialized View for Dashboards
```sql
-- Fast aggregated queries
SELECT * FROM mv_daily_ai_costs
WHERE user_id = $user_id
  AND date >= CURRENT_DATE - INTERVAL '30 days';
```

### 3. Batch Tracking for Bulk Operations
```typescript
const operations = items.map(item => ({
  operation_type: 'text_generation',
  ai_model: 'gemini-2.0-flash',
  input_tokens: item.usage.input,
  output_tokens: item.usage.output
}));

await trackAIUsageBatch(operations);
```

## Dashboard Queries

### Current Month Total
```sql
SELECT get_current_month_cost($user_id);
```

### Cost by Model (Last 30 Days)
```sql
SELECT
  ai_model,
  SUM(total_cost_usd) as total_cost,
  COUNT(*) as requests
FROM ai_usage_analytics
WHERE user_id = $user_id
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY ai_model;
```

### Top 10 Most Expensive Operations
```sql
SELECT
  operation_type,
  ai_model,
  total_cost_usd,
  created_at
FROM ai_usage_analytics
WHERE user_id = $user_id
ORDER BY total_cost_usd DESC
LIMIT 10;
```

## Updating Pricing

When Google updates Gemini pricing:

```sql
-- 1. Add new pricing
INSERT INTO ai_model_pricing (
  model_name,
  input_price_per_1m_tokens,
  output_price_per_1m_tokens,
  effective_from
) VALUES (
  'gemini-2.0-flash',
  0.10, -- New price
  0.40, -- New price
  '2026-01-01'
);

-- 2. Expire old pricing
UPDATE ai_model_pricing
SET effective_until = '2025-12-31'
WHERE model_name = 'gemini-2.0-flash'
  AND effective_from < '2026-01-01';
```

## Support

For detailed information, consult:
- **Architecture:** `architecture/AI_COST_TRACKING_ARCHITECTURE.md`
- **Examples:** `examples/AI_TRACKING_INTEGRATION_EXAMPLES.md`
- **Source Code:** `../src/services/aiUsageTrackingService.ts`

For issues:
1. Check error logs: `ai_usage_tracking_errors` table
2. Verify migration applied: `supabase db diff`
3. Test functions manually: `SELECT log_ai_usage(...)`

---

**Last Updated:** 2025-12-09
**Maintained By:** Aica Backend Architect
