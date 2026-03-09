# Studio Module — Sprint Plan

**Date**: 2026-03-09
**Session**: sprint-studio-audit
**Status**: Studio ~80% feature-complete | 46 components | 12 hooks | 8 services | 12 Edge Functions | 22+ DB tables

---

## Consolidated Audit Summary

### Strengths
- **Core podcast workflow production-ready**: setup → research → pauta → production → post-production → distribution
- **12 Edge Functions** all follow consistent patterns (CORS, JWT, extractJSON, success boolean)
- **Gemini integration solid**: Flash + Pro models, Google Search Grounding, File Search RAG
- **FSM state management**: well-architected context + reducer pattern
- **95% Ceramic compliance** in frontend
- **Auto-save with 2s debounce** prevents data loss
- **410 aria- attributes** — good accessibility foundation
- **Strong TypeScript types** with discriminated unions

### Critical Issues
| ID | Issue | Layer | Impact |
|----|-------|-------|--------|
| C1 | 3 orphaned table references (podcast_briefings, podcast_research, podcast_news_articles) — indexes exist, CREATE TABLE missing | DB | Migration failures on deploy |
| C2 | 12 studio_* tables missing Foreign Key constraints on project_id | DB | Data integrity violations |
| C3 | podcast_episodes has 31+ columns — needs normalization | DB | Schema bloat, maintenance burden |
| C4 | 0% test coverage (only 1 test file) | Frontend | No regression detection |

### High Impact Gaps
| ID | Gap | Layer | Status |
|----|-----|-------|--------|
| H1 | Interview question generation — Edge Function exists, no frontend UI | Frontend+Backend | 40% done |
| H2 | Guest approval link — Edge Function exists, no UI to trigger it | Frontend | 0% UI |
| H3 | Brand kit management — types + DB exist, 0% frontend | Full-stack | 0% |
| H4 | Team collaboration — types + DB exist, 0% functional frontend | Full-stack | 0% |
| H5 | Newsletter creation — types + DB exist, no frontend or Edge Functions | Full-stack | 0% |
| H6 | gemini-live-token Edge Function called by frontend but doesn't exist | Backend | Missing |
| H7 | 8 studio_* tables missing updated_at triggers | DB | Data tracking gap |
| H8 | Health tracking (withHealthTracking) not used by any Studio Edge Function | Backend | Observability gap |

### Medium Gaps
| ID | Gap | Layer |
|----|-----|-------|
| M1 | Ceramic token cleanup — 5-10 files with bg-white instead of bg-ceramic-base | Frontend |
| M2 | Mobile responsiveness — 70% ready, SetupStage/PautaStage need sm: breakpoints | Frontend |
| M3 | Loading skeletons missing in 8+ components | Frontend |
| M4 | Error recovery UI — missing retry buttons in distribution/postproduction | Frontend |
| M5 | Logout not implemented in StudioMainView | Frontend |
| M6 | ResearchStage.tsx deprecated (1,190 LOC) but still in codebase | Frontend |
| M7 | SetupStage too large (1,040 LOC) — needs splitting | Frontend |
| M8 | TypeScript ↔ DB type mismatches (PodcastShow, DeepResearchResult, outlines) | Cross-layer |
| M9 | Inconsistent logging — console.error() instead of createNamespacedLogger() | Backend |
| M10 | RLS pattern issue — podcast_topic_categories uses FOR ALL instead of granular | DB |
| M11 | Semantic duplication — ice_breakers/biography in multiple tables | DB |
| M12 | Cross-module integrations missing (Connections→guests, Agenda→calendar, Journey→CP) | Architecture |

---

## Sprint Plan

### Sprint 1 — Foundation & Quick Wins (3-5 days)
**Objective**: Fix critical DB issues, wire up existing backend to frontend, cleanup dead code.

| # | Task | Tier | Est | IDs |
|---|------|------|-----|-----|
| 1.1 | Investigate & remove orphaned table references (briefings, research, news_articles) | Micro | 1h | C1 |
| 1.2 | Add Foreign Key constraints to 12 studio_* tables (project_id, clip_id, asset_id) | Standard | 3h | C2 |
| 1.3 | Add updated_at triggers to 8 studio_* tables | Standard | 2h | H7 |
| 1.4 | Fix RLS on podcast_topic_categories (FOR ALL → granular) | Micro | 30m | M10 |
| 1.5 | Wire generate-interview-questions to ResearchStage UI | Standard | 2h | H1 |
| 1.6 | Wire send-guest-approval-link to GuestInfoForm UI | Standard | 1h | H2 |
| 1.7 | Implement logout in StudioMainView | Micro | 30m | M5 |
| 1.8 | Remove deprecated ResearchStage.tsx | Micro | 15m | M6 |
| 1.9 | Ceramic token cleanup (bg-white → bg-ceramic-base, 5-10 files) | Standard | 1.5h | M1 |
| 1.10 | Fix TypeScript ↔ DB type mismatches (PodcastShow, outline types) | Standard | 2h | M8 |

**Definition of Done**: Zero critical DB issues, interview questions + guest approval working, no dead code.

---

### Sprint 2 — UX Polish & Testing Foundation (3-5 days)
**Objective**: Improve UX quality, add test coverage for core hooks/services, mobile readiness.

| # | Task | Tier | Est | IDs |
|---|------|------|-----|-----|
| 2.1 | Add unit tests for PodcastWorkspaceContext reducer | Standard | 3h | C4 |
| 2.2 | Add unit tests for useAutoSave hook | Standard | 2h | C4 |
| 2.3 | Add unit tests for podcastAIService | Standard | 3h | C4 |
| 2.4 | Add unit tests for pautaGeneratorService | Standard | 3h | C4 |
| 2.5 | Add unit tests for guestScoring service | Standard | 2h | C4 |
| 2.6 | Add loading skeletons (CeramicLoadingState) to 8 components | Standard | 3h | M3 |
| 2.7 | Add error recovery UI (retry buttons) to postproduction + distribution | Standard | 2h | M4 |
| 2.8 | Mobile responsiveness — SetupStage + PautaStage sm: breakpoints | Standard | 3h | M2 |
| 2.9 | Split SetupStage (1,040 LOC) into sub-components | Standard | 3h | M7 |
| 2.10 | Add missing aria-labels to 8+ icon buttons | Micro | 1h | — |

**Definition of Done**: >50% test coverage on hooks/services, mobile-ready key workflows, no missing loading states.

---

### Sprint 3 — Schema Normalization & Backend Hardening (3-5 days)
**Objective**: Normalize podcast_episodes, add observability, centralize logging.

| # | Task | Tier | Est | IDs |
|---|------|------|-----|-----|
| 3.1 | Normalize podcast_episodes: extract podcast_episode_production table | Complex | 6h | C3 |
| 3.2 | Normalize podcast_episodes: extract podcast_episode_publication table | Complex | 4h | C3 |
| 3.3 | Deconflict ice_breakers/biography semantic duplication | Standard | 2h | M11 |
| 3.4 | Add withHealthTracking() to all 12 Studio Edge Functions | Standard | 3h | H8 |
| 3.5 | Adopt createNamespacedLogger() in all Studio Edge Functions | Standard | 2h | M9 |
| 3.6 | Create gemini-live-token Edge Function | Standard | 3h | H6 |
| 3.7 | Add composite indexes (episode_id+order_index, user_id+created_at) | Micro | 1h | — |
| 3.8 | Update frontend services to use normalized schema | Standard | 4h | C3 |

**Definition of Done**: podcast_episodes ≤15 columns, all Edge Functions with health tracking + namespaced logging, no semantic duplication.

---

### Sprint 4 — Brand Kit & Newsletter (5-7 days)
**Objective**: Implement brand kit management and newsletter creation end-to-end.

| # | Task | Tier | Est | IDs |
|---|------|------|-----|-----|
| 4.1 | Design brand kit UI (brainstorm + plan) | Standard | 2h | H3 |
| 4.2 | Implement BrandKitEditor component | Standard | 4h | H3 |
| 4.3 | Implement BrandKitPreview component | Standard | 3h | H3 |
| 4.4 | Wire brand kit to caption generation (apply colors, tone, intro/outro) | Standard | 3h | H3 |
| 4.5 | Design newsletter UI (brainstorm + plan) | Standard | 2h | H5 |
| 4.6 | Create studio-newsletter-generate Edge Function | Standard | 4h | H5 |
| 4.7 | Implement NewsletterEditor component | Standard | 4h | H5 |
| 4.8 | Implement NewsletterPreview component | Standard | 3h | H5 |
| 4.9 | Wire newsletter to content calendar | Standard | 2h | H5 |

**Definition of Done**: Users can create/manage brand kits, generate newsletters with AI, schedule in content calendar.

---

### Sprint 5 — Team Collaboration (5-7 days)
**Objective**: Enable multi-user collaboration on Studio projects.

| # | Task | Tier | Est | IDs |
|---|------|------|-----|-----|
| 5.1 | Design collaboration UX (brainstorm + plan) | Standard | 3h | H4 |
| 5.2 | Implement TeamInvitePanel (email invite, role selection) | Standard | 4h | H4 |
| 5.3 | Implement TeamMemberList (manage roles, remove members) | Standard | 3h | H4 |
| 5.4 | Create studio-team-invite Edge Function (SendGrid) | Standard | 3h | H4 |
| 5.5 | Implement CommentThread (threaded comments, resolve/unresolve) | Standard | 4h | H4 |
| 5.6 | Implement CommentInput (with @mentions, timestamp linking) | Standard | 3h | H4 |
| 5.7 | Add real-time subscriptions for comments (Supabase Realtime) | Standard | 3h | H4 |
| 5.8 | Add RLS policies for team member access (shared projects) | Standard | 3h | H4 |
| 5.9 | E2E test: invite → accept → comment → resolve flow | Standard | 3h | H4 |

**Definition of Done**: Users can invite team members, assign roles, comment on projects, resolve threads in real-time.

---

### Sprint 6 — Cross-Module Integration & Video (5-7 days)
**Objective**: Connect Studio to other AICA modules, advance video support.

| # | Task | Tier | Est | IDs |
|---|------|------|-----|-----|
| 6.1 | Connections → Studio: auto-populate guest research from contact dossier | Complex | 6h | M12 |
| 6.2 | Agenda → Studio: sync recording dates to Google Calendar | Standard | 4h | M12 |
| 6.3 | Journey → Studio: award CP for episode completion | Standard | 3h | M12 |
| 6.4 | Complete VideoUploadPanel (file upload, format validation) | Standard | 4h | — |
| 6.5 | Complete VideoTranscriptionPanel (reuse TranscriptionPanel logic) | Standard | 3h | — |
| 6.6 | Implement VideoClipPanel (clip extraction from video) | Standard | 4h | — |
| 6.7 | E2E test: full video project workflow | Standard | 3h | — |

**Definition of Done**: Guest data flows from Connections, recordings sync to Calendar, CP awarded for episodes, basic video workflow functional.

---

## Sprint Backlog (Future)

| Feature | Effort | Priority | Sprint |
|---------|--------|----------|--------|
| Publishing pipeline (Instagram, YouTube, LinkedIn APIs) | Complex (2w) | Medium | 7+ |
| Platform analytics fetcher (real metrics from APIs) | Complex (2w) | Medium | 7+ |
| Advanced content calendar (drag-drop, bulk scheduling) | Standard | Low | 8+ |
| Storybook stories for all Studio components | Standard | Low | 8+ |
| Video recording in-browser (MediaRecorder API) | Complex | Low | 9+ |

---

## Priority Matrix

```
                    HIGH IMPACT
                        │
     Sprint 1           │           Sprint 4-5
  (DB fixes, wiring,    │        (Brand kit, Newsletter,
   quick wins)          │         Team collaboration)
                        │
  LOW EFFORT ───────────┼─────────── HIGH EFFORT
                        │
     Sprint 2           │           Sprint 6
  (Tests, UX polish,    │        (Cross-module,
   mobile)              │         Video)
                        │
                    LOW IMPACT
```

Sprint 1 & 2 are **highest ROI** — fix foundations and polish with minimal effort.
Sprint 3 is **technical debt** — prevents future problems.
Sprint 4-6 are **feature expansion** — new capabilities for users.

---

## Metrics

| Metric | Current | After Sprint 2 | After Sprint 6 |
|--------|---------|----------------|----------------|
| Feature completeness | ~80% | ~85% | ~95% |
| Test coverage | ~5% | ~50% | ~70% |
| Ceramic compliance | 95% | 100% | 100% |
| Mobile readiness | 70% | 90% | 95% |
| DB integrity (FKs) | 40% | 90% | 100% |
| Accessibility (WCAG AA) | 75% | 85% | 90% |

---

*Generated by Agent Team sprint-studio-audit — 4 parallel explorers (frontend, backend, database, PRD)*
