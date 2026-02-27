# LifeRPG Engine Gaps — Design Document

**Date:** 2026-02-27
**Session:** feat-liferpg-engine-gaps
**Issue:** #518

## Context

The LifeRPG Engine was analyzed and found to be ~85% complete. The initial issue #518 listed 8 gaps, but deep code exploration revealed most gaps have code implementations that just need verification or minor completion.

## Revised Gap Status

| Gap | Original Status | Real Status | Action Needed |
|-----|----------------|-------------|---------------|
| 1. Badge Evaluation | "Incomplete" | Code COMPLETE (all 16 condition types handled) | Verify table references |
| 2. HP Decay Cron | "Missing scheduling" | Edge Function COMPLETE (413 LOC) | Add pg_cron scheduling |
| 3. CP Transaction History | "Not populated" | Table + service + insert logic EXISTS | Verify e2e, possibly add UI |
| 4. Compound Badge Conditions | "Incomplete" | Code COMPLETE (AND/OR at lines 341-363) | Merged with Gap 1 |
| 5. Health Score → CP | "Needs verification" | Integration EXISTS (healthScoreService:191) | Verify e2e flow |
| 6. Black Hat Badges opt-in | "UI not connected" | Backend COMPLETE (toggleBlackHatBadges) | Add UI toggle |
| 7. Weekly Bonus CP trigger | "Not active" | Function EXISTS but NEVER CALLED | Add trigger |
| 8. Leaderboard optimized | "Basic implementation" | Works + RPC exists | Optimize if needed |

## Approach: Audit-First

### Phase 1 — Build Audit
- Run `npm run build && npm run typecheck`
- Fix any compilation errors in gamification services

### Phase 2 — Verification per Gap

**Gap 1+4 (Badge Evaluation)**
- Verify `evaluateCondition` handles all types
- Check that referenced tables exist: `tasks` (should be `work_items`?), `life_events`, `cp_transactions`, `contact_health_history`
- If table names are wrong, fix the queries

**Gap 2 (HP Decay Cron)**
- Verify Edge Function is deployed
- Create migration with pg_cron for weekly execution
- Fallback: trigger on login if pg_cron unavailable

**Gap 3 (CP Transaction History)**
- Verify `awardCP()` inserts into `cp_transactions`
- Verify `getCPHistory()` returns data
- Check if UI component for history exists

**Gap 5 (Health Score → CP)**
- Trace: `healthScoreService:191` → `awardRelationshipCareCP` → `awardCP` → `cp_transactions`
- Verify `contact_health_history` table exists

**Gap 6 (Black Hat opt-in)**
- Backend complete
- Create toggle switch in badges panel or settings

**Gap 7 (Weekly Bonus CP)**
- `checkWeeklyBonus()` is never called
- Add trigger: call during dashboard load or weekly via cron

**Gap 8 (Leaderboard)**
- Verify `getLeaderboard()` and `get_cp_leaderboard` RPC work
- Migrate to RPC if in-memory approach is problematic

### Phase 3 — Implementation

Only implement what fails verification or is genuinely missing:

| Gap | Likely Action | Files |
|-----|--------------|-------|
| 1+4 | Fix table references if wrong | `badgeEvaluationService.ts` |
| 2 | pg_cron migration | `supabase/migrations/` (new) |
| 3 | UI component if missing | `src/modules/journey/components/` |
| 6 | UI toggle | `src/components/` or settings |
| 7 | Add trigger call | `src/hooks/useConsciousnessPoints.ts` |
| 8 | Optimize if needed | `gamificationService.ts` |

### Phase 4 — Update Issue #518
Update with reality, close resolved gaps.

## Agent Team Composition

| Role | Agent Type | Responsibility |
|------|-----------|---------------|
| Lead | Coordinator | Phase 1 (build), coordination, issue update |
| Auditor | general-purpose | Phase 2 (verify each gap, trace code paths) |
| Implementer | general-purpose | Phase 3 (fix failures + real gaps) |
| Reviewer | general-purpose | Validate each fix, final build/typecheck |

## Key Files

| File | LOC | Purpose |
|------|-----|---------|
| `src/services/badgeEvaluationService.ts` | 793 | Badge unlock evaluation |
| `src/services/gamificationService.ts` | 1173 | XP, levels, streaks, leaderboard |
| `src/services/consciousnessPointsService.ts` | 503 | CP awards, balance, weekly bonus |
| `src/services/streakRecoveryService.ts` | 541 | Grace periods, recovery |
| `src/types/badges.ts` | 794 | 27-badge catalog |
| `src/types/consciousnessPoints.ts` | 406 | CP rewards, config |
| `src/services/healthScoreService.ts` | ~200 | Health Score → CP integration |
| `supabase/functions/calculate-entity-decay/index.ts` | 413 | HP decay logic |
| `supabase/migrations/20260124000000_consciousness_points.sql` | 231 | CP table + RPCs |

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes
- [ ] All 8 gaps verified or fixed
- [ ] Issue #518 updated with reality
- [ ] PR created with all changes
