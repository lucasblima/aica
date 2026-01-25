# Organic Onboarding - Phase 3: Data-Tour Attributes Report

**Generated:** 2026-01-25
**Status:** Phase 2 Complete ✅ | Phase 3 In Progress 🚧

---

## Executive Summary

Phase 2 integrated `TourProvider` and `useTourAutoStart` hooks across all 5 modules. Phase 3 requires implementing `data-tour` HTML attributes on UI elements to enable the tooltip tours.

**Current Progress (After Sprint 1):**
- **Atlas:** 9/9 (100%) ✅ **COMPLETE**
- **Journey:** 7/7 (100%) ✅ **COMPLETE**
- **Finance:** 0/8 (0%) ❌ Not started
- **Grants:** 0/8 (0%) ❌ Not started
- **Studio:** 0/8 (0%) ❌ Not started

**Total:** 16/40 attributes implemented (40%)

---

## Module-by-Module Breakdown

### 1. Atlas (Meu Dia) - Task Management

**Status:** 9/9 implemented (100%) ✅ **COMPLETE**

**Tour Configuration:** `src/config/tours/atlasFirstVisitTour.ts`

| # | data-tour attribute | Component Location | Status | Notes |
|---|---------------------|-------------------|--------|-------|
| 1 | `atlas-header` | `src/views/AgendaView.tsx` | ✅ Implemented | Header section |
| 2 | `eisenhower-matrix` | `src/views/AgendaView.tsx` | ✅ Implemented | Matrix container |
| 3 | `quadrant-1` | `src/components/domain/PriorityMatrix.tsx` | ✅ Implemented | Urgent & Important |
| 4 | `quadrant-2` | `src/components/domain/PriorityMatrix.tsx` | ✅ Implemented | Important |
| 5 | `quadrant-3` | `src/components/domain/PriorityMatrix.tsx` | ✅ Implemented | Urgent |
| 6 | `quadrant-4` | `src/components/domain/PriorityMatrix.tsx` | ✅ Implemented | Neither |
| 7 | `add-task-button` | `src/views/AgendaView.tsx` | ✅ Implemented | New task button |
| 8 | `task-filters` | `src/components/domain/PriorityMatrix.tsx` | ✅ Implemented | Filter controls |
| 9 | `xp-badge` | `src/views/AgendaView.tsx` | ✅ **Implemented (Sprint 1)** | GamificationWidget in header |

**Implementation (Sprint 1):**
- ✅ Imported `GamificationWidget` from `@/components/features`
- ✅ Added widget to header with `data-tour="xp-badge"` wrapper
- ✅ Used `compact` mode for space efficiency

---

### 2. Journey (Conscientização) - Consciousness & Moments

**Status:** 7/7 implemented (100%) ✅ **COMPLETE**

**Tour Configuration:** `src/config/tours/journeyFirstVisitTour.ts`

| # | data-tour attribute | Component Location | Status | Notes |
|---|---------------------|-------------------|--------|-------|
| 1 | `journey-header` | `src/modules/journey/views/JourneyFullScreen.tsx` | ✅ Implemented | Header section |
| 2 | `consciousness-score` | `src/modules/journey/components/gamification/ConsciousnessScore.tsx` | ✅ **Implemented (Sprint 1)** | Root div |
| 3 | `consciousness-points` | `src/modules/journey/views/JourneyFullScreen.tsx` | ✅ **Implemented (Sprint 1)** | Wrapper div added |
| 4 | `moments-timeline` | `src/modules/journey/components/timeline/UnifiedTimelineView.tsx` | ✅ **Implemented (Sprint 1)** | Root div |
| 5 | `add-moment-button` | `src/modules/journey/views/JourneyFullScreen.tsx` | ✅ Implemented | New moment button |
| 6 | `emotion-picker` | `src/modules/journey/components/capture/EmotionPicker.tsx` | ✅ **Implemented (Sprint 1)** | Root div |
| 7 | `growth-insights` | `src/modules/journey/components/insights/WeeklySummaryCard.tsx` | ✅ **Implemented (Sprint 1)** | Insights section |

**Implementation (Sprint 1):**
- ✅ Added `data-tour="consciousness-score"` to ConsciousnessScore root element
- ✅ Wrapped ConsciousnessScore in JourneyFullScreen with `consciousness-points` attribute
- ✅ Added `data-tour="moments-timeline"` to UnifiedTimelineView root
- ✅ Added `data-tour="emotion-picker"` to EmotionPicker root
- ✅ Added `data-tour="growth-insights"` to WeeklySummaryCard insights section

---

### 3. Finance - Budget & Tracking

**Status:** 0/8 implemented (0%) ❌

**Tour Configuration:** `src/config/tours/financeFirstVisitTour.ts`

**Comment Found:** `src/modules/finance/views/FinanceDashboard.tsx` line 63:
```tsx
/* data-tour markers: finance-header, balance-overview, income-expenses, budget-categories, transaction-list, upload-statement, ai-insights, goals-tracking */
```

| # | data-tour attribute | Expected Location | Status | Notes |
|---|---------------------|-------------------|--------|-------|
| 1 | `finance-header` | `FinanceDashboard.tsx` header | ❌ **Missing** | Main header section |
| 2 | `balance-overview` | Balance widget/card | ❌ **Missing** | Current balance display |
| 3 | `income-expenses` | Income vs expenses chart | ❌ **Missing** | Revenue/expense comparison |
| 4 | `budget-categories` | Category breakdown widget | ❌ **Missing** | Budget by category |
| 5 | `transaction-list` | Transaction table/list | ❌ **Missing** | Transaction history |
| 6 | `upload-statement` | Upload button/area | ❌ **Missing** | Statement upload feature |
| 7 | `ai-insights` | Insights panel | ❌ **Missing** | AI recommendations |
| 8 | `goals-tracking` | Financial goals widget | ❌ **Missing** | Goals progress display |

**Next Steps:**
- [ ] Analyze `FinanceDashboard.tsx` component structure
- [ ] Identify and map all 8 UI elements
- [ ] Add all 8 `data-tour` attributes to respective components

**Files to Modify:**
- `src/modules/finance/views/FinanceDashboard.tsx` (main view)
- Child components as needed (charts, widgets, forms)

---

### 4. Grants - Discovery & Tracking

**Status:** 0/8 implemented (0%) ❌

**Tour Configuration:** `src/config/tours/grantsFirstVisitTour.ts`

**Comment Found:** `src/modules/grants/views/GrantsModuleView.tsx` line 63:
```tsx
/* data-tour markers: grants-header, opportunities-list, opportunity-filter, edital-parser, opportunity-detail, saved-opportunities, application-tracking, ai-briefing */
```

| # | data-tour attribute | Expected Location | Status | Notes |
|---|---------------------|-------------------|--------|-------|
| 1 | `grants-header` | `GrantsModuleView.tsx` header | ❌ **Missing** | Main header section |
| 2 | `opportunities-list` | Opportunities list/grid | ❌ **Missing** | Grant opportunities display |
| 3 | `opportunity-filter` | Filter controls | ❌ **Missing** | Search/filter UI |
| 4 | `edital-parser` | PDF upload button | ❌ **Missing** | Upload edital PDF feature |
| 5 | `opportunity-detail` | Detail view | ❌ **Missing** | Opportunity detail panel |
| 6 | `saved-opportunities` | Saved/favorites list | ❌ **Missing** | Bookmarked grants |
| 7 | `application-tracking` | Application status tracker | ❌ **Missing** | Application status widget |
| 8 | `ai-briefing` | AI briefing panel | ❌ **Missing** | AI-generated summary |

**Next Steps:**
- [ ] Analyze `GrantsModuleView.tsx` component structure
- [ ] Map view states and identify UI elements
- [ ] Add all 8 `data-tour` attributes to respective components

**Files to Modify:**
- `src/modules/grants/views/GrantsModuleView.tsx` (main view)
- Child components as needed

---

### 5. Studio - Podcast Production

**Status:** 0/8 implemented (0%) ❌

**Tour Configuration:** `src/config/tours/studioFirstVisitTour.ts`

**Comment Found:** `src/modules/studio/views/StudioMainView.tsx` line 52:
```tsx
/* data-tour markers: studio-header, studio-shows-list, create-show-button, wizard-button, guest-management, episode-production, studio-library, workspace-view */
```

| # | data-tour attribute | Expected Location | Status | Notes |
|---|---------------------|-------------------|--------|-------|
| 1 | `studio-header` | `StudioMainView.tsx` header | ❌ **Missing** | Main header section |
| 2 | `studio-shows-list` | Shows list/grid | ❌ **Missing** | Podcast shows display |
| 3 | `create-show-button` | New show button | ❌ **Missing** | Create podcast button |
| 4 | `wizard-button` | Wizard launch button | ❌ **Missing** | Episode wizard button |
| 5 | `guest-management` | Guest section | ❌ **Missing** | Guest database/list |
| 6 | `episode-production` | Episodes list | ❌ **Missing** | Episode status tracker |
| 7 | `studio-library` | Library/assets section | ❌ **Missing** | Audio library |
| 8 | `workspace-view` | Workspace button/area | ❌ **Missing** | Editing workspace |

**Next Steps:**
- [ ] Analyze `StudioMainView.tsx` component structure
- [ ] Map view states (dashboard, wizard, production)
- [ ] Add all 8 `data-tour` attributes to respective components

**Files to Modify:**
- `src/modules/studio/views/StudioMainView.tsx` (main view)
- Studio wizard components
- Child components as needed

---

## Implementation Priority Recommendation

### High Priority (Complete first)
1. **Atlas** - Only 1 attribute missing, easy win
2. **Journey** - Partially started, 5 attributes to add

### Medium Priority (Core features)
3. **Finance** - Critical user feature, 8 attributes
4. **Grants** - Critical user feature, 8 attributes

### Lower Priority (Advanced feature)
5. **Studio** - Podcast production, 8 attributes

---

## Phase 3 Completion Checklist

### Sprint 1: Complete Near-Finished Modules ✅ **DONE**
- [x] **Atlas:** Add `xp-badge` attribute (1 file)
- [x] **Journey:** Add 5 missing attributes (2-3 files)

### Sprint 2: Finance Module
- [ ] Analyze FinanceDashboard structure
- [ ] Add 8 `data-tour` attributes
- [ ] Test tour flow

### Sprint 3: Grants Module
- [ ] Analyze GrantsModuleView structure
- [ ] Add 8 `data-tour` attributes
- [ ] Test tour flow

### Sprint 4: Studio Module
- [ ] Analyze StudioMainView structure
- [ ] Add 8 `data-tour` attributes
- [ ] Test tour flow

### Sprint 5: E2E Testing & Polish
- [ ] Test all tours end-to-end
- [ ] Fix any broken targets or missing elements
- [ ] Adjust placements for better UX
- [ ] Update tour content if needed

---

## Technical Notes

### Finding Components
```bash
# Find where specific UI elements are rendered
grep -r "balance\|saldo" src/modules/finance/ --include="*.tsx"
grep -r "opportunity\|oportunidade" src/modules/grants/ --include="*.tsx"
grep -r "episode\|episódio" src/modules/studio/ --include="*.tsx"
```

### Adding Data-Tour Attributes
```tsx
// Example: Add to a div or button
<div className="..." data-tour="finance-header">
  {/* Header content */}
</div>

<button
  onClick={handleClick}
  data-tour="add-moment-button"
  className="..."
>
  Add Moment
</button>
```

### Testing Tours Locally
1. Clear browser storage to reset tour progress
2. Navigate to module (e.g., `/journey`)
3. Tour should auto-start on first visit
4. Click through all steps and verify:
   - Target elements are highlighted
   - Tooltips appear with correct content
   - Placement is appropriate (not covering target)

---

## Related Files

**Phase 1 (Foundation):**
- `src/contexts/TourContext.tsx` - Tour state management
- `src/hooks/useTour.ts` - Tour hooks
- `src/hooks/useTourAutoStart.ts` - Auto-start logic
- `supabase/migrations/20260125_user_tour_progress.sql` - Database schema
- `supabase/migrations/20260125_tour_functions_security.sql` - RLS + RPC functions

**Phase 2 (Integration):**
- `src/router/AppRouter.tsx` - TourProvider wrapper
- All module main views - `useTourAutoStart` hook calls

**Phase 3 (This Phase):**
- `src/config/tours/*.ts` - Tour step configurations
- Module component files - Data-tour attributes

**PRs:**
- PR #155: Phase 1 - Foundation
- PR #156: Phase 2 - Module Integration
- PR #157 (This PR): Phase 3 - Data-Tour Attributes Sprint 1

---

**Last Updated:** 2026-01-25 (Updated after Sprint 1 completion)
**Report Generated By:** Claude Sonnet 4.5

🤖 Generated with [Claude Code](https://claude.com/claude-code)
