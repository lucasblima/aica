# Studio Workspace Migration Plan

**Status**: 🟡 Pending
**Priority**: Medium
**Effort**: 2-3 days
**Created**: 2025-12-19
**Last Updated**: 2025-12-19

---

## 📋 Executive Summary

The PodcastWorkspace component and its dependencies currently live in `_deprecated/modules/podcast/` but are actively used in production. This document outlines the migration plan to move this critical functionality into the modern `src/modules/studio/` architecture.

**Current State**: ⚠️ _deprecated folder is temporarily included in builds
**Target State**: ✅ All workspace code migrated to `src/modules/studio/`
**Impact**: ~2000+ lines of code, 4 stages, multiple hooks and context

---

## 🎯 Migration Goals

1. **Preserve Functionality**: Zero feature loss during migration
2. **Improve Architecture**: Align with Studio FSM pattern
3. **Code Quality**: Apply Ceramic Design System, fix TypeScript errors
4. **Remove Technical Debt**: Eliminate _deprecated dependency
5. **Better Maintainability**: Clear separation of concerns

---

## 📊 Current Architecture Analysis

### Files to Migrate

#### **Core Components** (~453 lines)
```
_deprecated/modules/podcast/components/workspace/
├── PodcastWorkspace.tsx         (171 lines) - Main container
├── WorkspaceHeader.tsx          (~100 lines) - Header with save status
├── StageStepper.tsx             (~80 lines) - Stage navigation
└── StageRenderer.tsx            (~102 lines) - Stage router
```

#### **Stage Components** (~800+ lines)
```
_deprecated/modules/podcast/components/stages/
├── SetupStage.tsx              (~200 lines) - Guest setup & scheduling
├── ResearchStage.tsx           (~180 lines) - Dossier & AI research
├── PautaStage.tsx              (~300 lines) - Script & topics
└── ProductionStage.tsx         (~120 lines) - Recording interface
```

#### **Context & State Management** (~400 lines)
```
_deprecated/modules/podcast/context/
└── PodcastWorkspaceContext.tsx  (~400 lines) - Reducer-based state
```

#### **Hooks** (~300 lines)
```
_deprecated/modules/podcast/hooks/
├── useWorkspaceState.tsx       (~100 lines) - Load initial state
├── useAutoSave.tsx             (~80 lines) - Auto-save logic
├── useGeminiLive.ts            (~50 lines) - Gemini integration
├── usePodcastFileSearch.ts     (~30 lines) - File search
├── useSavedPauta.ts            (~20 lines) - Pauta persistence
└── useStudioData.ts            (~20 lines) - Studio data fetching
```

#### **Types** (~200 lines)
```
_deprecated/modules/podcast/types/
└── workspace.ts                (~200 lines) - TypeScript definitions
```

**Total Estimated Lines**: ~2150+

---

## 🏗️ Target Architecture

### Directory Structure

```
src/modules/studio/
├── components/
│   └── workspace/              # NEW: Workspace components
│       ├── PodcastWorkspace.tsx
│       ├── WorkspaceHeader.tsx
│       ├── StageStepper.tsx
│       ├── StageRenderer.tsx
│       └── stages/             # NEW: Stage components
│           ├── SetupStage.tsx
│           ├── ResearchStage.tsx
│           ├── PautaStage.tsx
│           └── ProductionStage.tsx
├── context/
│   ├── StudioContext.tsx       # Existing: Main FSM
│   └── WorkspaceContext.tsx    # NEW: Workspace-specific state
├── hooks/
│   ├── useWorkspaceState.ts    # NEW: Migrated hook
│   ├── useAutoSave.ts          # NEW: Migrated hook
│   └── useWorkspaceAI.ts       # NEW: Consolidated AI hooks
├── types/
│   ├── studio.ts               # Existing
│   └── workspace.ts            # NEW: Workspace types
└── views/
    ├── StudioMainView.tsx      # Existing
    ├── StudioLibrary.tsx       # Existing
    ├── StudioWizard.tsx        # Existing
    └── StudioWorkspace.tsx     # UPDATE: Remove _deprecated import
```

---

## 📝 Migration Tasks

### Phase 1: Preparation (1-2 hours)

- [ ] **Create migration branch** from `refach/architecture`
- [ ] **Audit dependencies**: Map all imports and exports
- [ ] **Identify breaking changes**: TypeScript errors, missing types
- [ ] **Create backup**: Tag current working state

### Phase 2: Core Migration (4-6 hours)

#### Step 1: Types & Interfaces
- [ ] Copy `_deprecated/modules/podcast/types/workspace.ts` → `src/modules/studio/types/workspace.ts`
- [ ] Resolve type conflicts with existing `studio.ts`
- [ ] Update import paths in dependent files

#### Step 2: Context & State
- [ ] Migrate `PodcastWorkspaceContext.tsx` → `src/modules/studio/context/WorkspaceContext.tsx`
- [ ] Update reducer patterns to match StudioContext conventions
- [ ] Integrate with existing StudioContext FSM

#### Step 3: Hooks
- [ ] Migrate `useWorkspaceState.tsx` → `src/modules/studio/hooks/`
- [ ] Migrate `useAutoSave.tsx` → `src/modules/studio/hooks/`
- [ ] Consolidate AI hooks (`useGeminiLive`, `usePodcastFileSearch`) → `useWorkspaceAI.ts`
- [ ] Update Supabase service calls

#### Step 4: Components
- [ ] Migrate workspace components to `src/modules/studio/components/workspace/`
- [ ] Update `WorkspaceHeader.tsx` with Ceramic Design System classes
- [ ] Migrate all 4 stage components to `stages/` subfolder
- [ ] Update all imports to new paths

### Phase 3: Integration (2-3 hours)

#### Step 5: Update StudioWorkspace.tsx
```typescript
// BEFORE (temporary)
import PodcastWorkspace from '../../../../_deprecated/modules/podcast/components/workspace/PodcastWorkspace';

// AFTER (migrated)
import { PodcastWorkspace } from '../components/workspace/PodcastWorkspace';
```

#### Step 6: Wire up AI Services
- [ ] Implement `onGenerateDossier` callback
- [ ] Implement `onSearchGuestProfile` callback
- [ ] Connect to Gemini API service layer

#### Step 7: Testing
- [ ] Manual testing: Create episode workflow
- [ ] Test all 4 stages (Setup → Research → Pauta → Production)
- [ ] Verify auto-save functionality
- [ ] Test Gemini AI integrations
- [ ] Cross-browser testing

### Phase 4: Cleanup (1 hour)

- [ ] **Remove _deprecated imports**: Verify no references remain
- [ ] **Re-enable .gitignore exclusion**: Uncomment `_deprecated/` line
- [ ] **Build validation**: `npm run build` must pass
- [ ] **TypeScript validation**: Fix all errors in migrated code
- [ ] **Update documentation**: README.md, architecture docs

### Phase 5: Deployment (30 min)

- [ ] **Create PR**: Detailed description with screenshots
- [ ] **Code review**: Team review of migration
- [ ] **Merge to main**: After approval
- [ ] **Deploy to production**: Verify Cloud Build succeeds
- [ ] **Monitor**: Check error logs for 24 hours

---

## 🚨 Breaking Changes & Risks

### High Priority
- **Import path changes**: All files importing from `_deprecated` will break
- **Type conflicts**: Workspace types may conflict with existing Studio types
- **State shape changes**: WorkspaceContext vs StudioContext integration

### Medium Priority
- **AI service integration**: Gemini callbacks may need refactoring
- **Auto-save logic**: Database schema changes may be needed
- **Stage navigation**: FSM transitions need careful testing

### Low Priority
- **CSS classes**: Ceramic Design System updates may affect styling
- **Component props**: Minor prop interface changes

---

## ✅ Success Criteria

1. ✅ **Build passes**: `npm run build` completes without errors
2. ✅ **TypeScript clean**: Zero TS errors in workspace code
3. ✅ **Functionality preserved**: All 4 stages work identically
4. ✅ **No _deprecated imports**: All imports from `src/modules/studio/`
5. ✅ **.gitignore restored**: `_deprecated/` excluded again
6. ✅ **Cloud Build succeeds**: Google Cloud deployment works
7. ✅ **No regressions**: Existing Studio features still work

---

## 📚 Reference Documents

- [Studio Refactoring Plan](./STUDIO_REFACTORING_PLAN.md)
- [Studio Phase 3-4 Execution](./STUDIO_PHASE_3_4_EXECUTION_PLAN.md)
- [Ceramic Design System](../design/CERAMIC_DESIGN_SYSTEM_GUIDANCE.md)
- [StudioContext FSM Pattern](../../src/modules/studio/context/StudioContext.tsx)

---

## 🔗 Related Issues

- **GitHub Issue**: [To be created]
- **Commit introducing temporary fix**: `6fbcb75`
- **Original workspace implementation**: See `_deprecated/` folder

---

## 👥 Team Notes

**Estimated Effort**: 2-3 full days
**Skill Level Required**: Senior (TypeScript, React Context, State Management)
**Can be parallelized**: No - sequential migration required
**Blocking**: No - temporary solution allows other work to continue

**Recommended Approach**:
1. Schedule dedicated sprint for this migration
2. Assign single developer to maintain consistency
3. Use feature branch with frequent commits
4. Test thoroughly before merging

---

## 📅 Timeline Proposal

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Preparation | 1-2 hours | Migration branch, dependency map |
| 2. Core Migration | 4-6 hours | All files migrated, imports updated |
| 3. Integration | 2-3 hours | StudioWorkspace working, AI wired |
| 4. Cleanup | 1 hour | _deprecated removed, docs updated |
| 5. Deployment | 30 min | PR merged, production deployed |
| **Total** | **2-3 days** | **Complete migration** |

---

**Status Legend**:
- 🟢 **Complete**: Task finished
- 🟡 **Pending**: Not started
- 🔴 **Blocked**: Dependency required

**Last Updated**: 2025-12-19
**Next Review**: When scheduling next sprint
