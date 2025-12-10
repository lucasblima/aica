# AI Cost Tracking - Integration Examples

This document provides real-world examples of how to integrate AI usage tracking into Aica Life OS services.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Grants Module Example](#grants-module-example)
3. [Journey Module Example](#journey-module-example)
4. [Podcast Module Example](#podcast-module-example)
5. [Backend (Python FastAPI) Example](#backend-python-example)
6. [Error Handling Patterns](#error-handling-patterns)
7. [Performance Best Practices](#performance-best-practices)

---

## Basic Usage

### Simple Text Generation

```typescript
import { trackAIUsage } from '@/services/aiUsageTrackingService';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function generateText(prompt: string) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Execute AI operation
  const response = await model.generateContent(prompt);
  const text = response.response.text();

  // Track usage (fire-and-forget)
  trackAIUsage({
    operation_type: 'text_generation',
    ai_model: 'gemini-2.0-flash',
    input_tokens: response.response.usageMetadata?.promptTokenCount,
    output_tokens: response.response.usageMetadata?.candidatesTokenCount,
    total_tokens: response.response.usageMetadata?.totalTokenCount,
    module_type: 'grants',
    request_metadata: {
      prompt_preview: prompt.substring(0, 100) + '...'
    }
  });

  return text;
}
```

### Using the Wrapper (Recommended)

```typescript
import { withAITracking } from '@/services/aiUsageTrackingService';

async function generateText(prompt: string) {
  return withAITracking(
    async () => {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const response = await model.generateContent(prompt);
      return response.response.text();
    },
    {
      operation_type: 'text_generation',
      ai_model: 'gemini-2.0-flash',
      module_type: 'grants',
      request_metadata: { prompt_preview: prompt.substring(0, 100) }
    }
  );
}
```

---

## Grants Module Example

### Before (No Tracking)

```typescript
// src/modules/grants/services/grantAIService.ts

export async function generateProposalSection(
  fieldName: string,
  briefing: BriefingData,
  edital: EditalData
): Promise<string> {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = buildSectionPrompt(fieldName, briefing, edital);
  const response = await model.generateContent(prompt);

  return response.response.text();
}
```

### After (With Tracking)

```typescript
// src/modules/grants/services/grantAIService.ts

import { trackAIUsage, extractGeminiUsageMetadata } from '@/services/aiUsageTrackingService';

export async function generateProposalSection(
  fieldName: string,
  briefing: BriefingData,
  edital: EditalData,
  projectId?: string
): Promise<string> {
  const startTime = Date.now();
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = buildSectionPrompt(fieldName, briefing, edital);
  const response = await model.generateContent(prompt);
  const text = response.response.text();

  // Track usage (non-blocking)
  const duration = (Date.now() - startTime) / 1000;
  const usage = extractGeminiUsageMetadata(response.response);

  trackAIUsage({
    operation_type: 'text_generation',
    ai_model: 'gemini-2.0-flash-exp',
    ...usage,
    duration_seconds: duration,
    module_type: 'grants',
    module_id: projectId,
    request_metadata: {
      field_name: fieldName,
      edital_title: edital.title,
      prompt_length: prompt.length
    }
  });

  return text;
}
```

---

## Journey Module Example

### Sentiment Analysis with Tracking

```typescript
// src/modules/journey/services/journeyAIService.ts

import { withAITracking } from '@/services/aiUsageTrackingService';
import { GEMINI_MODELS, getModelForUseCase } from '@/lib/gemini/models';

export async function analyzeMomentSentiment(
  content: string,
  momentId: string
): Promise<{ sentiment: string; insights: string[] }> {
  const modelName = GEMINI_MODELS[getModelForUseCase('analyze_moment_sentiment')];

  return withAITracking(
    async () => {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = `Analyze the sentiment and extract insights from this journal entry:\n\n${content}`;
      const response = await model.generateContent(prompt);

      // Parse response
      const result = JSON.parse(response.response.text());
      return result;
    },
    {
      operation_type: 'text_generation',
      ai_model: modelName,
      module_type: 'journey',
      module_id: momentId,
      request_metadata: {
        content_length: content.length,
        use_case: 'analyze_moment_sentiment'
      }
    }
  );
}
```

---

## Podcast Module Example

### Deep Research with File Search

```typescript
// src/modules/podcast/services/podcastResearchService.ts

import { trackAIUsage } from '@/services/aiUsageTrackingService';

export async function researchGuest(
  guestName: string,
  episodeId: string
): Promise<GuestProfile> {
  const startTime = Date.now();

  // Call backend for File Search + Deep Research
  const response = await fetch('/api/file-search/query-authenticated', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      query: `Research comprehensive profile for ${guestName}`,
      categories: ['podcast_research'],
      model: 'gemini-2.0-flash-exp'
    })
  });

  const data = await response.json();
  const duration = (Date.now() - startTime) / 1000;

  // Track usage (tokens from backend response if available)
  trackAIUsage({
    operation_type: 'file_search_query',
    ai_model: 'gemini-2.0-flash-exp',
    input_tokens: data.usage?.input_tokens,
    output_tokens: data.usage?.output_tokens,
    duration_seconds: duration,
    module_type: 'podcast',
    module_id: episodeId,
    request_metadata: {
      guest_name: guestName,
      sources_used: data.citations?.length || 0
    }
  });

  return parseGuestProfile(data.answer);
}
```

---

## Backend (Python FastAPI) Example

### Tracking from Python Backend

```python
# backend/services/ai_tracking.py

import os
from supabase import create_client, Client
from typing import Optional, Dict, Any

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

def track_ai_usage(
    user_id: str,
    operation_type: str,
    ai_model: str,
    input_tokens: int = None,
    output_tokens: int = None,
    total_cost_usd: float = 0.0,
    module_type: str = None,
    module_id: str = None,
    request_metadata: Dict[str, Any] = None
) -> Optional[str]:
    """
    Track AI usage from Python backend

    Returns record ID on success, None on failure
    """
    try:
        result = supabase.rpc('log_ai_usage', {
            'p_user_id': user_id,
            'p_operation_type': operation_type,
            'p_ai_model': ai_model,
            'p_input_tokens': input_tokens,
            'p_output_tokens': output_tokens,
            'p_total_cost_usd': total_cost_usd,
            'p_module_type': module_type,
            'p_module_id': module_id,
            'p_request_metadata': request_metadata
        }).execute()

        return result.data if result.data else None

    except Exception as e:
        print(f"[AI Tracking] Failed to log usage: {e}")
        return None
```

### Integration in File Search Service

```python
# backend/main.py (FileSearchService.search_documents)

@staticmethod
async def search_documents(
    query: str,
    store_names: list[str],
    user_id: str,
    metadata_filter: str = None,
    model: str = "gemini-2.0-flash-exp"
) -> dict:
    """Busca semântica com tracking de custos"""

    import time
    from services.ai_tracking import track_ai_usage

    start_time = time.time()

    file_search_config = types.FileSearch(
        file_search_store_names=store_names
    )

    if metadata_filter:
        file_search_config.filter = metadata_filter

    try:
        response = client.models.generate_content(
            model=model,
            contents=query,
            config=types.GenerateContentConfig(
                tools=[types.Tool(file_search=file_search_config)]
            )
        )

        duration = time.time() - start_time

        # Extract usage metadata
        usage = response.usage_metadata if hasattr(response, 'usage_metadata') else None

        # Track usage (non-blocking)
        track_ai_usage(
            user_id=user_id,
            operation_type='file_search_query',
            ai_model=model,
            input_tokens=usage.prompt_token_count if usage else None,
            output_tokens=usage.candidates_token_count if usage else None,
            module_type='grants',  # or dynamic based on context
            request_metadata={
                'query_preview': query[:100],
                'stores_count': len(store_names),
                'duration_seconds': duration
            }
        )

        # Extract citations
        citations = []
        if response.candidates and response.candidates[0].grounding_metadata:
            gm = response.candidates[0].grounding_metadata
            if hasattr(gm, 'grounding_chunks'):
                for chunk in gm.grounding_chunks:
                    citations.append({
                        "uri": chunk.web.uri if chunk.web else None,
                        "title": chunk.web.title if chunk.web else None
                    })

        return {
            "answer": response.text,
            "citations": citations,
            "model": model,
            "usage": {
                "input_tokens": usage.prompt_token_count if usage else 0,
                "output_tokens": usage.candidates_token_count if usage else 0
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
```

---

## Error Handling Patterns

### Pattern 1: Silent Failure (Recommended for Most Cases)

```typescript
// Tracking never breaks functionality
async function performAITask() {
  const response = await geminiCall();

  // Tracking error is logged but not propagated
  trackAIUsage({...}).catch(err => {
    console.debug('[Tracking] Silent failure:', err);
  });

  return response;
}
```

### Pattern 2: Defensive Wrapper

```typescript
async function safeTrackAIUsage(params: TrackAIUsageParams) {
  try {
    await trackAIUsage(params);
  } catch (err) {
    // Already handled internally, but extra safety
    console.error('[Tracking] Unexpected error:', err);
  }
}
```

### Pattern 3: Retry on Failure (Backend Only)

```python
def track_with_retry(params, max_retries=2):
    for attempt in range(max_retries):
        try:
            return track_ai_usage(**params)
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"[Tracking] All retries failed: {e}")
                return None
            time.sleep(0.5 * (attempt + 1))  # Exponential backoff
```

---

## Performance Best Practices

### 1. Fire-and-Forget for Non-Critical Paths

```typescript
// DON'T await tracking in user-facing flows
async function generateContent(prompt: string) {
  const response = await gemini.generateContent(prompt);

  // Fire-and-forget (non-blocking)
  trackAIUsage({...});

  return response.text();
}
```

### 2. Batch Tracking for Bulk Operations

```typescript
import { trackAIUsageBatch } from '@/services/aiUsageTrackingService';

async function processBulkGeneration(items: Item[]) {
  const trackingOps: TrackAIUsageParams[] = [];

  for (const item of items) {
    const response = await generateForItem(item);

    // Collect tracking data
    trackingOps.push({
      operation_type: 'text_generation',
      ai_model: 'gemini-2.0-flash',
      input_tokens: response.usage.input,
      output_tokens: response.usage.output,
      module_id: item.id
    });
  }

  // Track all at once (parallel)
  await trackAIUsageBatch(trackingOps);
}
```

### 3. Deferred Tracking for Streaming Responses

```typescript
async function streamGeneration(prompt: string) {
  const stream = await gemini.generateContentStream(prompt);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for await (const chunk of stream) {
    // Yield chunks to user
    yield chunk.text();

    // Accumulate usage
    if (chunk.usageMetadata) {
      totalInputTokens = chunk.usageMetadata.promptTokenCount;
      totalOutputTokens += chunk.usageMetadata.candidatesTokenCount;
    }
  }

  // Track AFTER stream completes
  trackAIUsage({
    operation_type: 'text_generation',
    ai_model: 'gemini-2.0-flash',
    input_tokens: totalInputTokens,
    output_tokens: totalOutputTokens
  });
}
```

### 4. Local Cost Calculation (Avoid Extra DB Calls)

```typescript
// If you already calculated costs locally, pass them directly
trackAIUsage({
  operation_type: 'text_generation',
  ai_model: 'gemini-2.0-flash',
  input_tokens: 1500,
  output_tokens: 800,
  input_cost_usd: 0.0,    // Pre-calculated
  output_cost_usd: 0.0,   // Pre-calculated
  total_cost_usd: 0.0     // Pre-calculated
});

// vs letting DB calculate (extra RPC call)
trackAIUsage({
  operation_type: 'text_generation',
  ai_model: 'gemini-2.0-flash',
  input_tokens: 1500,
  output_tokens: 800
  // Costs calculated by calculate_token_cost RPC
});
```

---

## Summary Checklist

When integrating AI tracking into a new service:

- [ ] Import `trackAIUsage` or `withAITracking`
- [ ] Extract usage metadata from AI response
- [ ] Call tracking AFTER operation succeeds
- [ ] Use fire-and-forget (no await) in critical paths
- [ ] Include module context (module_type, module_id)
- [ ] Add useful metadata (prompt preview, use case)
- [ ] Handle streaming responses correctly
- [ ] Never let tracking errors break functionality
- [ ] Test with missing/invalid tokens gracefully
- [ ] Monitor tracking errors via `ai_usage_tracking_errors` table

---

**Last Updated:** 2025-12-09
**Maintainer:** Aica Backend Architect
