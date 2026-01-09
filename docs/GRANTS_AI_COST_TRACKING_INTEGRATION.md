# Grants Module - AI Cost Tracking Integration Guide

## Overview

The Grants (Captação) module uses AI for 7 different operations via Edge Functions, all integrated with the AI Cost Tracking system. All operations use the `gemini-chat` Edge Function which provides AI-powered content generation for grant proposals.

## Integrated Operations

### 1. Generate Field Content

**File:** `src/modules/grants/services/grantAIService.ts`
**Function:** `generateFieldContent()`
**Edge Function:** `gemini-chat` (action: `generate_field_content`)
**Trigger:** When user clicks "Gerar com IA" on proposal form field
**Cost:** ~$0.0015-0.003 per field generation
**Tokens:** ~800-1500 input, ~400-800 output
**Notes:**
- Most expensive operation (provides full edital context + criteria + briefing)
- Input includes edital text, evaluation criteria, previous responses
- Respects field character limits

### 2. Analyze Edital Structure

**File:** `src/modules/grants/services/grantAIService.ts`
**Function:** `analyzeEditalStructure()`
**Edge Function:** `gemini-chat` (action: `analyze_edital_structure`)
**Trigger:** When user uploads PDF edital in wizard
**Cost:** ~$0.002-0.004 per edital
**Tokens:** ~1200-2500 input, ~500-1000 output
**Model:** `gemini-2.0-flash-exp` (smart model)
**Notes:**
- Bulk operation (runs once per edital upload)
- Extracts: title, deadlines, criteria, form fields, requirements
- Returns structured JSON with edital metadata

### 3. Parse Form Fields from Text

**File:** `src/modules/grants/services/grantAIService.ts`
**Function:** `parseFormFieldsFromText()`
**Edge Function:** `gemini-chat` (action: `parse_form_fields`)
**Trigger:** When user pastes form text in wizard
**Cost:** ~$0.0005-0.001 per parse
**Tokens:** ~300-600 input, ~200-400 output
**Notes:**
- Alternative to edital PDF upload
- Extracts field labels, character limits, required flags
- Handles free-form pasted text

### 4. Generate Auto Briefing

**File:** `src/modules/grants/services/briefingAIService.ts`
**Function:** `generateAutoBriefing()`
**Edge Function:** `gemini-chat` (action: `generate_auto_briefing`)
**Trigger:** When user uploads source document (project proposal)
**Cost:** ~$0.003-0.006 per briefing
**Tokens:** ~1500-3000 input, ~800-1500 output
**Model:** `gemini-2.0-flash-exp` (smart model)
**Notes:**
- Most comprehensive operation
- Extracts information from PDF/DOCX source document
- Populates all dynamic briefing fields
- Returns `Record<string, string>` for form fields

### 5. Improve Briefing Field

**File:** `src/modules/grants/services/briefingAIService.ts`
**Function:** `improveBriefingField()`
**Edge Function:** `gemini-chat` (action: `improve_briefing_field`)
**Trigger:** When user clicks "✨ Melhorar" button on briefing field
**Cost:** ~$0.0003-0.0006 per improvement
**Tokens:** ~200-400 input, ~150-300 output
**Notes:**
- Smallest operation (single field refinement)
- Uses context from other briefing fields for coherence
- Preserves original meaning while enhancing clarity

### 6. Extract Required Documents

**File:** `src/modules/grants/services/briefingAIService.ts`
**Function:** `extractRequiredDocuments()`
**Edge Function:** `gemini-chat` (action: `extract_required_documents`)
**Trigger:** When user analyzes edital in wizard (Documents stage)
**Cost:** ~$0.001-0.002 per extraction
**Tokens:** ~600-1200 input, ~300-600 output
**Notes:**
- Extracts required document list from edital PDF
- Returns: name, description, due date for each document
- Used to populate checklist

### 7. Extract Timeline Phases

**File:** `src/modules/grants/services/briefingAIService.ts`
**Function:** `extractTimelinePhases()`
**Edge Function:** `gemini-chat` (action: `extract_timeline_phases`)
**Trigger:** When user analyzes edital in wizard (Timeline stage)
**Cost:** ~$0.001-0.002 per extraction
**Tokens:** ~600-1200 input, ~300-600 output
**Notes:**
- Extracts submission deadlines and phases from edital
- Returns: phase name, description, date
- Used to create project timeline

---

## Implementation Pattern

All Grants AI operations follow this pattern:

```typescript
const startTime = Date.now();

try {
  const result = await EdgeFunctionService.operationName({ payload });

  // ========================================
  // TRACKING DE CUSTO - AI Usage Analytics
  // ========================================
  const usageMetadata = (result as any).__usageMetadata;
  if (usageMetadata) {
    trackAIUsage({
      operation_type: 'text_generation',
      ai_model: (result as any).model || 'gemini-2.0-flash-exp',
      input_tokens: usageMetadata.promptTokenCount || 0,
      output_tokens: usageMetadata.candidatesTokenCount || 0,
      module_type: 'grants',
      module_id: context.project_id,
      duration_seconds: (Date.now() - startTime) / 1000,
      request_metadata: {
        use_case: 'operation_name',
        field_id: context.field_config?.id,
        has_source_doc: !!context.sourceDocumentContent,
        // ... operation-specific metadata
      }
    }).catch(error => {
      console.warn('[Grants AI Tracking] Non-blocking error:', error);
    });
  }
  // ========================================

  return result.data;
} catch (error) {
  console.error('[GrantsAI] Error:', error);
  throw error;
}
```

### Key Implementation Details

1. **Fire-and-forget Pattern**: `trackAIUsage().catch()` - non-blocking
2. **Model Fallback**: `(result as any).model || 'gemini-2.0-flash-exp'` - future-proof
3. **Metadata Extraction**: `(result as any).__usageMetadata` - from Edge Function
4. **Duration Tracking**: `(Date.now() - startTime) / 1000` - seconds precision
5. **Context Fields**: Rich metadata for analysis (use_case, field_id, document lengths)

---

## Cost Estimates

### Per-Operation Costs

| Operation | Input Tokens | Output Tokens | Cost (avg) |
|-----------|--------------|---------------|------------|
| generate_field_content | 1000-1500 | 500-800 | $0.002 |
| analyze_edital_structure | 1500-2500 | 700-1000 | $0.003 |
| parse_form_fields | 400-600 | 250-400 | $0.0007 |
| generate_auto_briefing | 2000-3000 | 1000-1500 | $0.004 |
| improve_briefing_field | 250-400 | 200-300 | $0.0004 |
| extract_required_documents | 800-1200 | 400-600 | $0.0015 |
| extract_timeline_phases | 800-1200 | 400-600 | $0.0015 |

**Pricing:** Based on Gemini 2.0 Flash Experimental pricing
- Input: $0.001 per 1K tokens
- Output: $0.002 per 1K tokens

### Project Lifecycle Estimates

**Setup Phase (one-time per project):**
- Upload edital PDF: $0.003 (analyze structure)
- Upload source document: $0.004 (auto-briefing)
- Extract documents & timeline: $0.003 total
- **Total:** ~$0.01 per project setup

**Proposal Writing Phase:**
- Generate 10 form fields with AI: 10 × $0.002 = $0.02
- Improve 5 briefing fields: 5 × $0.0004 = $0.002
- **Total:** ~$0.022 per proposal

**Complete Project:** ~$0.032 per grant application
**100 Projects/month:** ~$3.20/month
**1000 Projects/month:** ~$32/month

### User Behavior Estimates

**Light User (2 projects/month):** ~$0.064/month
**Regular User (10 projects/month):** ~$0.32/month
**Power User (30 projects/month):** ~$0.96/month

**Total for 100 users (avg 10 projects/month):** ~$32/month

---

## Edge Function Integration

All operations use the **`gemini-chat` Edge Function** with different actions:

### Request Format

```typescript
{
  action: 'generate_field_content' | 'analyze_edital_structure' | ...,
  payload: {
    // action-specific payload
  },
  model?: 'fast' | 'smart'  // optional model selection
}
```

### Response Format

```typescript
{
  result: any,              // action-specific result
  success: boolean,
  latencyMs: number,
  cached: boolean,
  usageMetadata?: {         // NEW - added for cost tracking
    promptTokenCount: number,
    candidatesTokenCount: number,
    totalTokenCount: number
  }
}
```

### Metadata Propagation

The Edge Function service (`edgeFunctionService.ts`) automatically attaches `__usageMetadata` to results:

```typescript
return {
  ...response.result,
  ...(response.usageMetadata && { __usageMetadata: response.usageMetadata })
}
```

Client code extracts it:

```typescript
const usageMetadata = (result as any).__usageMetadata;
```

---

## Database Integration

All operations store data in `ai_usage_analytics` table:

### Schema

```sql
- module_type: 'grants'
- operation_type: 'text_generation'
- ai_model: 'gemini-2.0-flash-exp' (or actual model from Edge Function)
- input_tokens: number
- output_tokens: number
- module_id: project_id (when available)
- duration_seconds: number
- request_metadata: JSONB
```

### Metadata Structure by Operation

**generate_field_content:**
```json
{
  "use_case": "generate_field_content",
  "field_id": "apresentacao_empresa",
  "field_label": "Apresentação da Empresa",
  "max_chars": 3000,
  "has_source_doc": true,
  "has_edital_content": true,
  "criteria_count": 5
}
```

**generate_auto_briefing:**
```json
{
  "use_case": "generate_auto_briefing",
  "has_source_document": true,
  "source_doc_length": 45678,
  "form_fields_count": 12,
  "fields_extracted": 12
}
```

**extract_timeline_phases:**
```json
{
  "use_case": "extract_timeline_phases",
  "pdf_content_length": 23456,
  "phases_extracted": 7
}
```

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Cost per Project:**
   - Query `ai_usage_analytics` grouped by `module_id`
   - Calculate total tokens × pricing

2. **Most Expensive Operations:**
   - Query by `request_metadata->>'use_case'`
   - Identify optimization targets

3. **User Behavior:**
   - Track how many fields users generate vs manually write
   - Monitor auto-briefing adoption rate

4. **Performance:**
   - Average `duration_seconds` per operation
   - Identify slow operations for Edge Function optimization

### Query Examples

**Total cost for a project:**
```sql
SELECT
  module_id,
  SUM(input_tokens * 0.000001 + output_tokens * 0.000002) as total_cost
FROM ai_usage_analytics
WHERE module_type = 'grants'
  AND module_id = 'project-uuid'
GROUP BY module_id;
```

**Most used operations:**
```sql
SELECT
  request_metadata->>'use_case' as operation,
  COUNT(*) as usage_count,
  AVG(duration_seconds) as avg_duration,
  SUM(input_tokens + output_tokens) as total_tokens
FROM ai_usage_analytics
WHERE module_type = 'grants'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY operation
ORDER BY usage_count DESC;
```

---

## Future Optimizations

### Cost Reduction Strategies

1. **Caching:** Cache edital analysis results (same edital, multiple users)
2. **Smart Model Selection:** Use `gemini-2.0-flash` (free tier) where possible
3. **Prompt Optimization:** Reduce input token count via better prompts
4. **Batch Processing:** Combine multiple field generations into single API call

### Potential Savings

- **Caching edital analysis:** 60% cost reduction for popular editais
- **Free tier migration:** 100% cost reduction for eligible operations
- **Batch processing:** 30% reduction via fewer API roundtrips

---

## Testing

### Unit Tests

All tracking integrations have unit tests in:
- `src/modules/grants/services/__tests__/grantAIService.test.ts`
- `src/modules/grants/services/__tests__/briefingAIService.test.ts`

### Integration Tests

Verify tracking works end-to-end:
```bash
npm run test -- grants
```

---

## Related Documentation

- **AI Cost Tracking Architecture:** `docs/architecture/AI_COST_TRACKING_ARCHITECTURE.md`
- **Journey Integration:** `docs/JOURNEY_AI_COST_TRACKING_INTEGRATION.md`
- **Finance Integration:** `docs/FINANCE_AI_COST_TRACKING_INTEGRATION.md`
- **Migration Checklist:** `docs/AI_COST_TRACKING_MIGRATION_CHECKLIST.md`
- **Troubleshooting:** `docs/AI_COST_DASHBOARD_TROUBLESHOOTING.md`

---

**Last Updated:** 2026-01-09
**Status:** Complete and Integrated (Phase 5)
**PR:** #79
**Maintained By:** Documentation Team
