---
globs: src/lib/gemini/**,supabase/functions/**
---
# AI Integration Guide

## Gemini Models

| Model | Use | Cost |
|-------|-----|------|
| `gemini-2.5-flash` | Fast tasks, streaming | Low |
| `gemini-2.5-pro` | Complex analysis, reasoning | Medium |
| `gemini-2.5-flash-native-audio` | Live API, voice | Medium |
| `text-embedding-004` | Semantic embeddings | Very low |

**CRITICAL — Sunset models**: `gemini-2.0-flash-exp`, `gemini-1.5-flash`, `gemini-1.5-pro` are ALL obsolete. Never use them.

## Gemini 2.5 Flash — Thinking Token Warning

- `maxOutputTokens` includes THINKING tokens on Gemini 2.5 Flash
- With `maxOutputTokens: 1024`, thinking uses ~960 tokens → only ~60 left for output → TRUNCATED JSON
- **ALWAYS use `maxOutputTokens: 4096`** for structured JSON output
- **NEVER use `responseMimeType: 'application/json'`** with thinking models — produces minimal output
- Few-shot examples in Portuguese are essential for emotion detection

## extractJSON() Helper

All Edge Functions must use `extractJSON()` for robust Gemini response parsing:
- Strip code fences FIRST: `.replace(/```(?:json)?\s*\n?/g, '')`
- Handle preamble text, trailing content
- `gemini-chat` has the reference robust implementation

## Model Router (OpenClaw)

`_shared/model-router.ts` — `callAI()` with complexity cascade:
- Low → Flash, Medium → Flash (escalate to Pro if confidence < 0.6), High → Pro
- `assessConfidence()` checks JSON validity, uncertainty signals, repetition
- Frontend: `USE_CASE_TO_COMPLEXITY` map in `models.ts`

## File Search API (RAG)

```typescript
// Edge Function pattern
const store = await client.fileSearchStores.create({
  config: { display_name: 'aica-module-knowledge' }
});
// max_tokens_per_chunk: 400 (optimized for Portuguese)
```

Cost: $0.15/1M tokens to index, storage and queries FREE.

## Grounding with Google Search

```typescript
const response = await client.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: query,
  tools: [{ googleSearch: {} }]
});
// response.groundingMetadata.groundingChunks has sources
```

## New AI Features Checklist

1. **Always** use Edge Functions for Gemini calls
2. **Never** expose API keys in frontend
3. Check if File Search or Grounding solves the problem before custom RAG
4. Use `aiUsageTrackingService` for tracking
5. Implement retry with exponential backoff
6. Use `withHealthTracking()` wrapper from `_shared/health-tracker.ts`
7. Write failing tests first (`superpowers:test-driven-development`)
8. Verify with evidence before claiming complete (`superpowers:verification-before-completion`)
