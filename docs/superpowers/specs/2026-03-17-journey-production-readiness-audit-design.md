# Journey Module — Production-Readiness Audit Report

**Date:** 2026-03-17
**Module:** `src/modules/journey/` (94 files, ~23k LOC)
**Approach:** Systematic layer-by-layer (types → services → hooks → components → views → edge functions → cross-cutting)
**Auditors:** 3 parallel Explore agents covering all 7 layers

## Executive Summary

| Severity | Count | Key Themes |
|----------|-------|------------|
| **P0** | 4 | Race conditions (CP, rate limit), unmount state leak, unvalidated AI JSON |
| **P1** | 11 | Missing validation, infinite loop risk, memory growth, CORS, silent failures, AI fallback masking |
| **P2** | 15 | Dead code, test gaps (60% untested), Ceramic tokens, accessibility, logging, dual creation paths |
| **Total** | 30 | |

### What's Working Well
- All Gemini calls proxied through Edge Functions (secure)
- RLS queries properly filter by user_id throughout
- GeminiClient singleton pattern consistently used
- PatternDashboard + InterviewCategoryPicker hooks violations recently fixed
- Comprehensive fallback mechanisms for AI failures
- Strong TypeScript typing throughout

---

## P0 Findings (Must Fix)

### P0-1: Unmount Race Condition in JourneyFullScreen
- **File:** `src/modules/journey/views/JourneyFullScreen.tsx:298`
- **Issue:** `generatePostCaptureInsight()` can call `setCurrentInsight()` after component unmounts via `navigate('/')`
- **Impact:** Memory leak, potential stale closure bugs
- **Fix:** Add AbortController to cancel pending insights on unmount

### P0-2: CP Award Race Condition
- **File:** `src/modules/journey/services/momentService.ts:70-79`
- **Issue:** Concurrent moment submissions call `award_consciousness_points` RPC without locking. Both RPCs may execute before either completes.
- **Impact:** Inconsistent CP totals, level-up logic may trigger twice
- **Fix:** Add `FOR UPDATE` lock in the RPC function

### P0-3: Rate Limit Race Condition in momentPersistenceService
- **File:** `src/modules/journey/services/momentPersistenceService.ts`
- **Issue:** Rate limit check (query + insert) is not atomic. Two concurrent requests can both pass.
- **Impact:** Users bypass 1-second rate limit, inflate CP
- **Fix:** Database-level constraint or advisory lock in RPC

### P0-4: Unvalidated AI JSON Parsing in questionGenerationService
- **File:** `src/modules/journey/services/questionGenerationService.ts:~500`
- **Issue:** Edge Function response parsed with direct `.result` access without structure validation
- **Impact:** Uncaught crash if Gemini returns malformed JSON, question generation fails
- **Fix:** Add response shape validation before accessing fields

### ~~P0-5~~ → P1-NEW: AI Fallback Summary Masking
- **File:** `src/modules/journey/services/weeklySummaryService.ts:~311`
- **Issue:** When Gemini fails, `generateFallbackSummary()` returns a generic summary that gets upserted as if AI-generated. User cannot distinguish real AI summaries from fallback ones.
- **Impact:** Users receive lower-quality summaries without knowing AI generation failed
- **Fix:** Add `source: 'ai' | 'fallback'` field to summary response; show subtle indicator in UI
- **Note:** Spec review confirmed: the `.upsert()` itself throws on error (not swallowed). The real issue is fallback masking, not persistence failure. Reclassified from P0 to P1.

---

## P1 Findings (Should Fix)

### P1-1: Infinite Loop Risk in questionService.getDailyQuestion()
- **File:** `src/modules/journey/services/questionService.ts:~60-80`
- **Issue:** `triggerQuestionGeneration()` has no timeout. If generation takes >30s (circuit breaker open), function blocks.
- **Fix:** Add 5s timeout via `Promise.race()`

### P1-2: Unbounded Memory in unifiedTimelineService
- **File:** `src/modules/journey/services/unifiedTimelineService.ts:~600-700`
- **Issue:** Fetches from 7 sources in parallel without per-source limits. 1000+ WhatsApp messages loaded into memory.
- **Fix:** Apply `limit / 7` per source before merging

### P1-3: Missing Validation in assessmentInstruments.scoreAssessment()
- **File:** `src/modules/journey/services/assessmentInstruments.ts:~150`
- **Issue:** No validation that all required items are present or values are within valid ranges
- **Fix:** Add item presence + range validation before scoring

### P1-4: Missing Rate Limit on aiAnalysisService
- **File:** `src/modules/journey/services/aiAnalysisService.ts`
- **Issue:** `analyzeContentRealtime()` called without debounce, could fire 10+ Gemini calls on rapid typing
- **Fix:** Add 1s debounce wrapper

### P1-5: Silent Interview Response Failure
- **File:** `src/modules/journey/services/interviewerService.ts:~180`
- **Issue:** Fallback to local processing doesn't return same shape as Edge Function response. CP award missing in fallback path.
- **Fix:** Ensure fallback returns identical `ProcessedInterviewResponse` shape

### P1-6: Stale User Context in questionGenerationService
- **File:** `src/modules/journey/services/questionGenerationService.ts:~450`
- **Issue:** `getUserContextBank()` has no freshness check. 30-day-old context used for question generation.
- **Fix:** Add 7-day context refresh trigger

### P1-7: CORS Fallback Returns Empty String
- **File:** `supabase/functions/reanalyze-moments/index.ts:~20`
- **Issue:** When origin not in ALLOWED_ORIGINS, returns empty string instead of rejecting the request
- **Fix:** Return early 403 for unknown origins: `if (!ALLOWED_ORIGINS.includes(origin)) return new Response('Forbidden', { status: 403 })`
- **Note:** Spec review corrected: falling back to `ALLOWED_ORIGINS[0]` (which may be localhost) is also wrong. Reject unknown origins entirely.

### P1-8: Backfill Error Recovery Missing in useJourneyPatterns
- **File:** `src/modules/journey/hooks/useJourneyPatterns.ts:171-289`
- **Issue:** If backfill crashes mid-way, no recovery path. User sees stuck "analyzing" banner.
- **Fix:** Add `isBackfillFailed` state, catch errors, show retry

### ~~P1-9~~ REMOVED: False Positive
- **Note:** Spec review verified `user?.id` IS in the dependency array. The `eslint-disable` suppresses a false positive about `fetchStats` not being in the useEffect deps, but `fetchStats` already guards on `user?.id` internally. No issue exists.

### P1-10: InterviewCategoryPicker Missing Error UI
- **File:** `src/modules/journey/components/interviewer/InterviewCategoryPicker.tsx:59-67`
- **Issue:** `getCategoryCompletion()` RPC failure silently leaves completions as null. UI shows 0/0 with no error.
- **Fix:** Add `completionError` state, show error + retry button

### ~~P1-11~~ → P2-NEW: Defensive Hook Ordering in JourneyFullScreen
- **File:** `src/modules/journey/views/JourneyFullScreen.tsx:166`
- **Issue:** `useAuth()` called after other hook declarations. No active violation today (no early returns between hooks), but fragile if code changes.
- **Fix:** Move `useAuth()` and `useNavigate()` to very top of component
- **Note:** Spec review confirmed: preventive measure, not active bug. Downgraded to P2.

### P1-12: Fire-and-Forget Streak Failure Silent
- **File:** `src/modules/journey/services/momentService.ts:85-97`
- **Issue:** If both streak RPCs fail, only `log.warn()`. No metric, no alert. User's streak silently lost.
- **Fix:** Log as `error` level, add telemetry counter for monitoring

### ~~P1-13~~ → P2-NEW: RealtimeChannel Import Consistency
- **File:** `src/modules/journey/hooks/useWhatsAppMessagesRealtime.ts:16`
- **Issue:** Imports `RealtimeChannel` type from `@supabase/supabase-js` instead of `@supabase/ssr`
- **Fix:** Change import source for consistency
- **Note:** Spec review confirmed: this is a type-only import. `@supabase/ssr` re-exports it from `@supabase/supabase-js`. No security risk, but violates project convention. Downgraded to P2.

---

## P2 Findings (Nice to Have)

### P2-1: Dead Code — useMultipleJourneyValidation
- **File:** `src/modules/journey/hooks/useJourneyValidation.ts:240-270`
- **Issue:** Hook calls other hooks inside `.map()` (rules violation), but never imported anywhere. Dead code.
- **Fix:** Delete entire function

### P2-2: console.warn() in InterviewSession
- **File:** `src/modules/journey/components/interviewer/InterviewSession.tsx:142`
- **Issue:** Direct `console.warn()` bypasses structured logger
- **Fix:** Replace with `log.warn()`

### P2-3: Ceramic Token Inconsistencies
- **Files:** PatternDashboard.tsx, ActivityHeatmap.tsx, UnifiedTimelineView.tsx, DailyQuestionCarousel.tsx
- **Issue:** Hardcoded `text-[#5C554B]`, `text-[#948D82]` instead of `text-ceramic-text-primary/secondary`
- **Fix:** Replace with semantic ceramic tokens

### P2-4: Missing Accessibility in DailyQuestionCarousel
- **File:** `src/modules/journey/components/insights/DailyQuestionCarousel.tsx`
- **Issue:** No keyboard navigation on arrows, dot indicators lack position aria-labels
- **Fix:** Add keyboard handlers, improve aria-labels

### P2-5: File Search Error Not Displayed
- **File:** `src/modules/journey/views/JourneyFullScreen.tsx:244-254`
- **Issue:** `initializeFileSearch()` error silently logged. Search tab appears empty.
- **Fix:** Show error badge on search tab

### ~~P2-6~~ REMOVED: False Positive
- **Note:** Spec review verified: line 30 already has `stats ? LEVEL_COLORS[stats.level] : '#94a3b8'` — the ternary guard prevents null access. No issue exists.

### P2-7: Missing Test Coverage (Critical Gap)
- **Untested services (11):** momentService, momentPersistenceService, consciousnessPointsService, dailyQuestionService, interviewerService, momentIndexingService, qualityEvaluationService, questionGenerationService, questionService, unifiedTimelineService, assessmentInstruments
- **Untested hooks (15):** All hooks
- **Untested components (30+):** All components
- **Current coverage:** ~25% (4 test files for 94 source files)

### P2-8: No Expiration Logic for Interview Sessions
- **File:** `src/modules/journey/services/interviewerService.ts`
- **Issue:** Paused sessions never expire. Zombie sessions accumulate.
- **Fix:** Add 30-day session expiration

### P2-9: Missing Logging in weeklySummaryService
- **File:** `src/modules/journey/services/weeklySummaryService.ts`
- **Issue:** No structured logging for Gemini request/response. Hard to debug inaccurate summaries.
- **Fix:** Add request/response logging with timing

### P2-10: Inconsistent Pagination
- **Files:** momentService.ts vs momentPersistenceService.ts
- **Issue:** Different pagination logic (`.range()` vs different offset/limit)
- **Fix:** Standardize in shared utility

### P2-11: useEMACheckin Auth Guard
- **File:** `src/modules/journey/hooks/useEMACheckin.ts:159-163`
- **Issue:** `fetchToday()` runs on mount before auth is ready, won't refetch when user becomes available
- **Fix:** Add `user?.id` to dependency array

### P2-12: InterviewSession Answer Lost on Reload
- **File:** `src/modules/journey/components/interviewer/InterviewSession.tsx:41-49`
- **Issue:** `localAnswer` state not persisted to localStorage
- **Fix:** Add sessionStorage persistence keyed by sessionId

### P2-13: UnifiedTimeline Fallback for Unknown Event Types
- **File:** `src/modules/journey/services/unifiedTimelineService.ts`
- **Issue:** No default case in event type mapping. Unknown types return undefined.
- **Fix:** Add fallback display data

### P2-14: No Per-User Gemini Rate Limiting in Edge Functions
- **File:** `supabase/functions/reanalyze-moments/index.ts`
- **Issue:** User can spam endpoint (up to 100 Gemini calls per request). No rate limit.
- **Fix:** Add per-user rate limit (5 req/min)

### P2-15: Dual Moment Creation Paths (Architecture Debt)
- **Files:** `momentService.ts` (createMoment) vs `momentPersistenceService.ts` (createMomentEntry)
- **Issue:** Two separate moment creation paths doing overlapping work. One runs sentiment analysis before insert (parallel), the other after insert as fire-and-forget. Risk of inconsistency.
- **Fix:** Audit which path is active, consolidate or clearly document when each is used
- **Note:** Added by spec review — architectural blind spot from original audit.

---

## Sentry Status

| Issue | Status | Resolution |
|-------|--------|------------|
| JAVASCRIPT-REACT-2 | Fix committed, not yet verified in production | Error at 14:56 UTC, fix at 18:13 UTC. Deploy happened after. Monitor for recurrence. |
| JAVASCRIPT-REACT-1 | Fix committed, not yet verified in production | Same root cause, older build hash |
| JAVASCRIPT-REACT-3 | Unrelated | Supabase auth lock issue, not Journey-specific |
| JAVASCRIPT-REACT-4 | Out of scope | Flux TemplateLibraryView bgColor bug |

---

## Implementation Priority

### Sprint 1 (This Session) — P0 Frontend Fixes + Quick Wins
1. P0-1: AbortController for unmount race condition in JourneyFullScreen
2. P0-4: Validate AI JSON responses in questionGenerationService
3. P1-7: Fix CORS — reject unknown origins with 403 in reanalyze-moments
4. P2-1: Delete dead code useMultipleJourneyValidation
5. P2-2: Replace console.warn with log.warn in InterviewSession
6. P2-NEW: Move useAuth to top of JourneyFullScreen (defensive)
7. P2-NEW: Fix RealtimeChannel import consistency

### Sprint 2 (Future Session) — Database-Level Fixes
8. P0-2: CP award race condition (requires RPC modification with FOR UPDATE)
9. P0-3: Rate limit race condition (requires RPC/constraint)
10. P1-3: Assessment validation
11. P1-12: Streak failure telemetry

### Sprint 3 (Future Session) — UX + Resilience
12. P1-1: Daily question timeout
13. P1-2: Timeline memory limits
14. P1-4: AI analysis debounce
15. P1-5: Interview response fallback shape
16. P1-8: Backfill error recovery
17. P1-10: InterviewCategoryPicker error UI
18. P1-NEW: AI fallback summary masking indicator

### Sprint 4 (Future Session) — Quality + Tests
19-30: P2 items (test coverage, Ceramic tokens, accessibility, dual creation paths, etc.)

---

## Out of Scope
- Flux module bugs (JAVASCRIPT-REACT-4)
- Scoring Engine providers (#732 — separate session, issue updated)
- Visual/UX redesign
