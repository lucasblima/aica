# Journey Audit Sprint 1 — P0 Frontend Fixes + Quick Wins

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 2 frontend P0s from the production-readiness audit, plus 5 quick-win fixes that improve code quality and security.

**Architecture:** All changes are in existing files — no new files created. Fixes are isolated per-file with no cross-dependencies, so tasks can execute in parallel.

**Tech Stack:** React 18, TypeScript, Deno Edge Functions, Supabase

**Spec:** `docs/superpowers/specs/2026-03-17-journey-production-readiness-audit-design.md`

---

## File Map

| Task | Action | File | Lines |
|------|--------|------|-------|
| 1 | Modify | `src/modules/journey/views/JourneyFullScreen.tsx` | ~155-166, ~289-307 |
| 2 | Modify | `src/modules/journey/services/questionGenerationService.ts` | ~413-423 |
| 3 | Modify | `supabase/functions/reanalyze-moments/index.ts` | ~27-36 |
| 4 | Modify | `src/modules/journey/hooks/useJourneyValidation.ts` | ~233-275 (delete) |
| 5 | Modify | `src/modules/journey/components/interviewer/InterviewSession.tsx` | ~142 |
| 6 | Modify | `src/modules/journey/hooks/useWhatsAppMessagesRealtime.ts` | ~16 |

---

## Chunk 1: P0 Fixes

### Task 1: Fix unmount race condition in JourneyFullScreen (P0-1)

**Files:**
- Modify: `src/modules/journey/views/JourneyFullScreen.tsx:155-166, 289-307`

**Context:** `generatePostCaptureInsight()` runs as fire-and-forget after moment creation. If user navigates away before it completes, `setCurrentInsight()` and `setShowInsight()` are called on an unmounted component. Fix: use `isMountedRef` to guard the setState calls.

**Design note:** The spec mentioned AbortController, but `generatePostCaptureInsight()` doesn't accept an AbortSignal (it's a fire-and-forget Gemini call via GeminiClient). Adding AbortSignal support would require modifying the function signature and GeminiClient chain — scope creep for Sprint 1. The `isMountedRef` approach prevents the setState calls, which is the actual bug. The network request still completes harmlessly in the background.

- [ ] **Step 1: Add isMounted ref and guard setState calls**

Move `useAuth()` and `useNavigate()` to the very top of the component (before other hooks), then add an `isMountedRef` to guard the insight callback:

```tsx
// At the top of JourneyFullScreen component (line ~144-145):
export function JourneyFullScreen({ onBack }: JourneyFullScreenProps) {
  // -- Hooks MUST be at the very top, before all other logic --
  const navigate = useNavigate()
  const { user } = useAuth()

  useTourAutoStart('journey-first-visit');
```

Remove the old `const navigate = useNavigate()` from line 155 and `const { user } = useAuth()` from line 166.

Then add isMounted ref after the existing refs (~line 180):

```tsx
const isMountedRef = useRef(true)

useEffect(() => {
  return () => { isMountedRef.current = false }
}, [])
```

Guard the insight callback (~line 298-307):

```tsx
generatePostCaptureInsight(input.content || '', recentMoments)
  .then((insight) => {
    if (isMountedRef.current && insight && insight.message) {
      setCurrentInsight(insight)
      setShowInsight(true)
    }
  })
  .catch((error) => {
    log.warn('Failed to generate post-capture insight (non-critical):', error)
  })
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build && npm run typecheck`
Expected: Exit 0, no new errors

- [ ] **Step 3: Commit**

```bash
git add src/modules/journey/views/JourneyFullScreen.tsx
git commit -m "fix(journey): guard setState after unmount in JourneyFullScreen

Fixes P0-1: generatePostCaptureInsight could call setCurrentInsight/setShowInsight
after component unmounts via navigate(). Added isMountedRef guard.
Also moved useAuth/useNavigate to top of component for defensive hook ordering (P2).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Validate AI JSON responses in questionGenerationService (P0-4)

**Files:**
- Modify: `src/modules/journey/services/questionGenerationService.ts:413-423`

**Context:** `callEdgeFunction()` casts `response.data` directly to `GenerationResult` without validating the shape. If Gemini returns malformed JSON or the Edge Function changes its response shape, the code crashes with undefined access. Fix: add runtime validation before accessing fields.

- [ ] **Step 1: Add response validation in callEdgeFunction**

Replace the raw cast block (lines ~413-423) with validated access:

```typescript
  const raw = response.data as Record<string, unknown> | null

  if (!raw || typeof raw !== 'object') {
    throw new EdgeFunctionError(502, 'INVALID_RESPONSE', 'Edge Function returned non-object response')
  }

  if (raw.success === false) {
    throw new EdgeFunctionError(
      500,
      'GENERATION_FAILED',
      (raw.error as string) || 'Question generation failed on server'
    )
  }

  return {
    success: Boolean(raw.success),
    questionsGenerated: (raw.questionsGenerated as number) || (raw.questions_generated as number) || 0,
    questions: Array.isArray(raw.questions) ? raw.questions : [],
    contextUpdated: Boolean(raw.contextUpdated ?? raw.context_updated),
    processingTimeMs: (raw.processingTimeMs as number) || (raw.processing_time_ms as number),
    error: raw.error as string | undefined,
  }
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build && npm run typecheck`
Expected: Exit 0, no new errors

- [ ] **Step 3: Commit**

```bash
git add src/modules/journey/services/questionGenerationService.ts
git commit -m "fix(journey): validate AI JSON responses in questionGenerationService

Fixes P0-4: callEdgeFunction cast response.data directly to GenerationResult
without runtime validation. Now checks for non-object, success=false, and safely
extracts fields with fallbacks.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 2: P1 + P2 Quick Wins

### Task 3: Fix CORS — reject unknown origins with 403 (P1-7)

**Files:**
- Modify: `supabase/functions/reanalyze-moments/index.ts:27-36`

**Context:** `getCorsHeaders()` returns empty string for unknown origins. Should return 403 for non-allowed origins. The OPTIONS preflight must still work for allowed origins.

- [ ] **Step 1: Update getCorsHeaders to reject unknown origins**

Replace the `getCorsHeaders` function (lines 27-36):

```typescript
function getCorsHeaders(request: Request): Record<string, string> | null {
  const origin = request.headers.get('origin') || ''
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return null  // Signal to caller: reject this request
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }
}
```

Then in the `serve()` handler, add an early rejection after the CORS headers call:

```typescript
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    if (!corsHeaders) return new Response('Forbidden', { status: 403 })
    return new Response('ok', { headers: corsHeaders })
  }

  if (!corsHeaders) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ... rest of handler uses corsHeaders
```

**Note:** Spec review explicitly overruled falling back to `ALLOWED_ORIGINS[0]` because `ALLOWED_ORIGINS[0]` is `http://localhost:3000` — sending that as CORS origin to production requests is a misconfiguration. Requests without origin header (same-origin) don't need CORS headers at all.

- [ ] **Step 2: Verify Edge Function syntax**

Run: `npx supabase functions serve reanalyze-moments --no-verify-jwt` (quick syntax check, Ctrl+C after startup)
Expected: Function starts without syntax errors

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/reanalyze-moments/index.ts
git commit -m "fix(journey): fix CORS fallback in reanalyze-moments Edge Function

Fixes P1-7: getCorsHeaders returned empty string for unknown origins.
Now rejects unknown origins with 403. Requests without origin header
(same-origin) don't need CORS headers.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Delete dead code useMultipleJourneyValidation (P2-1)

**Files:**
- Modify: `src/modules/journey/hooks/useJourneyValidation.ts:233-275` (delete)

**Context:** `useMultipleJourneyValidation` calls hooks inside `.map()` (React rules violation) but is never imported anywhere. Dead code that should be removed.

- [ ] **Step 1: Delete the function and its JSDoc**

Delete lines 233-275 (from the JSDoc comment `/** * Hook to validate multiple journeys at once` through the closing `}`).

- [ ] **Step 2: Remove unused imports if any**

Check if `useMemo` import is still needed after deletion (it's used by `useJourneyValidation` above, so likely still needed).

- [ ] **Step 3: Verify build passes**

Run: `npm run build && npm run typecheck`
Expected: Exit 0, no new errors

- [ ] **Step 4: Commit**

```bash
git add src/modules/journey/hooks/useJourneyValidation.ts
git commit -m "fix(journey): remove dead code useMultipleJourneyValidation

Fixes P2-1: This hook called other hooks inside .map() (React rules violation)
but was never imported anywhere. Removing to prevent accidental future use.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Replace console.warn with logger in InterviewSession (P2-2)

**Files:**
- Modify: `src/modules/journey/components/interviewer/InterviewSession.tsx:142`

**Context:** Line 142 uses `console.warn()` directly instead of the structured logger.

- [ ] **Step 1: Add logger import (required — not present in file)**

Add after the existing imports at the top of the file:
```tsx
import { createNamespacedLogger } from '@/lib/logger'
const log = createNamespacedLogger('InterviewSession')
```

- [ ] **Step 2: Replace console.warn**

Replace line 142:
```tsx
// OLD:
console.warn('Adaptive insight generation failed:', err)

// NEW:
log.warn('Adaptive insight generation failed:', err)
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build && npm run typecheck`
Expected: Exit 0

- [ ] **Step 4: Commit**

```bash
git add src/modules/journey/components/interviewer/InterviewSession.tsx
git commit -m "fix(journey): replace console.warn with structured logger in InterviewSession

Fixes P2-2: Direct console.warn() bypasses structured logging, making
production debugging harder.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Fix RealtimeChannel import consistency (P2)

**Files:**
- Modify: `src/modules/journey/hooks/useWhatsAppMessagesRealtime.ts:16`

**Context:** Imports `RealtimeChannel` from `@supabase/supabase-js`. While the project convention prefers `@supabase/ssr`, the `RealtimeChannel` type is NOT exported by `@supabase/ssr`. The fix is to add the `type` keyword to make it a type-only import (no runtime dependency on the wrong package).

- [ ] **Step 1: Add `type` keyword to import**

Replace line 16:
```tsx
// OLD:
import { RealtimeChannel } from '@supabase/supabase-js'

// NEW:
import type { RealtimeChannel } from '@supabase/supabase-js'
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build && npm run typecheck`
Expected: Exit 0

- [ ] **Step 3: Commit**

```bash
git add src/modules/journey/hooks/useWhatsAppMessagesRealtime.ts
git commit -m "fix(journey): use type-only import for RealtimeChannel

RealtimeChannel is not exported by @supabase/ssr, so keeping @supabase/supabase-js
but adding 'type' keyword to ensure no runtime dependency.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Final Verification

- [ ] **Run full build + typecheck**

```bash
npm run build && npm run typecheck
```
Expected: Exit 0, no new errors

- [ ] **Run tests**

```bash
npm run test
```
Expected: No new failures (pre-existing failures acceptable)

- [ ] **Create GitHub issues for Sprints 2-4**

Create 3 issues from the audit report for future sessions:
- Sprint 2: Database-level race condition fixes (P0-2, P0-3, P1-3, P1-12)
- Sprint 3: UX + Resilience improvements (P1-1, P1-2, P1-4, P1-5, P1-8, P1-10, P1-NEW)
- Sprint 4: Test coverage + code quality (P2-7 through P2-15)
