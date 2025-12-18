# Next Task Roadmap

## Current Status

**Task 2.2 Complete:** ✅ Migrar PodcastLibrary para StudioLibrary

### What Was Accomplished

- ✅ Created `StudioLibrary` component with generic project interface
- ✅ Episode-to-project conversion via `episodeToProject()` function
- ✅ Props-based callbacks (no internal navigation)
- ✅ Full Ceramic design system integration
- ✅ Responsive grid layout (2-4 columns)
- ✅ Episode caching and lazy loading
- ✅ 5 comprehensive documentation files
- ✅ Build passing with zero TypeScript errors

### Component Location

```
src/modules/studio/views/StudioLibrary.tsx (401 lines)
```

### Import Path

```typescript
import { StudioLibrary } from '@modules/studio';
import type { StudioProject, StudioLibraryProps } from '@modules/studio';
```

---

## Next Tasks in Refactoring Plan

Follow these in order for proper dependency resolution:

### Task 2.1: Implement StudioMainView ⬅️ NEXT

**Status:** READY TO START (depends on Task 2.2 ✅)

**Purpose:** Create FSM wrapper component for Studio modes

**Components Needed:**
```
src/modules/studio/views/StudioMainView.tsx
```

**Key Responsibilities:**
- Manage mode state: 'LOADING' | 'LIBRARY' | 'WIZARD' | 'WORKSPACE'
- Initialize data loading via useStudioData hook
- Route to StudioLibrary when mode is 'LIBRARY'
- Wire up callbacks from StudioLibrary to FSM transitions
- Handle LOADING mode with loading screen

**Integration Pattern:**
```typescript
export default function StudioMainView() {
  const [state, setState] = useState<StudioState>({
    mode: 'LOADING',
    currentShowId: null,
    currentProject: null,
    error: null
  });

  // Effect: Resolve initial loading state
  useEffect(() => {
    if (!isLoading && state.mode === 'LOADING') {
      setState(prev => ({
        ...prev,
        mode: currentProject ? 'WORKSPACE' : 'LIBRARY',
        currentProject
      }));
    }
  }, [isLoading, currentProject, state.mode]);

  return (
    <>
      {state.mode === 'LIBRARY' && (
        <StudioLibrary
          onSelectShow={(showId) => {
            setState(prev => ({
              ...prev,
              mode: 'WIZARD',
              currentShowId: showId
            }));
          }}
          onSelectProject={(project) => {
            setState(prev => ({
              ...prev,
              mode: 'WORKSPACE',
              currentProject: project
            }));
          }}
          onCreateNew={() => {
            setState(prev => ({ ...prev, mode: 'WIZARD' }));
          }}
        />
      )}
      {state.mode === 'WIZARD' && <StudioWizard ... />}
      {state.mode === 'WORKSPACE' && <StudioWorkspace ... />}
      {state.mode === 'LOADING' && <LoadingScreen />}
    </>
  );
}
```

**Resources:**
- Type definitions: `src/modules/studio/types/studio.ts`
- Plan details: `docs/architecture/STUDIO_REFACTORING_PLAN.md` (Task 2.1)

**Estimated Time:** 4 hours

---

### Task 2.3: Create StudioWizard

**Status:** READY TO START (depends on Task 2.2 ✅)

**Purpose:** Multi-step wizard for creating new projects

**Components Needed:**
```
src/modules/studio/views/StudioWizard.tsx
```

**Key Responsibilities:**
- Step 1: Select project type (podcast, video, article)
- Step 2: Enter basic info (title, description)
- Step 3: Type-specific configuration
- Create project in database
- Call `onComplete(project)` with created project
- Support cancellation via `onCancel()`

**Reuse Patterns:**
- Leverage existing `GuestIdentificationWizard` for podcast setup
- Use same step progression pattern
- Return created `StudioProject` object

**Integration:** Called when:
- `StudioMainView` transitions to 'WIZARD' mode
- User creates new show from `StudioLibrary`

**Resources:**
- Wizard pattern: `src/modules/podcast/components/GuestIdentificationWizard.tsx`
- Types: `src/modules/studio/types/studio.ts`
- Plan: `docs/architecture/STUDIO_REFACTORING_PLAN.md` (Task 2.3)

**Estimated Time:** 4 hours

---

### Task 2.4: Implement StudioWorkspace

**Status:** READY TO START (depends on Task 2.2 ✅)

**Purpose:** Router component for type-specific workspaces

**Components Needed:**
```
src/modules/studio/views/StudioWorkspace.tsx
```

**Key Responsibilities:**
- Route based on `project.type`:
  - 'podcast' → PodcastWorkspace
  - 'video' → VideoWorkspace (future)
  - 'article' → ArticleWorkspace (future)
- Pass project metadata to workspace
- Handle back navigation

**Simple Router Pattern:**
```typescript
export default function StudioWorkspace({ project, onBack }: Props) {
  switch (project.type) {
    case 'podcast':
      return (
        <PodcastWorkspace
          episodeId={project.id}
          showId={project.showId!}
          showTitle={project.showTitle!}
          onBack={onBack}
        />
      );
    default:
      return <div>Unsupported project type</div>;
  }
}
```

**Integration:** Called when:
- `StudioMainView` transitions to 'WORKSPACE' mode
- User selects episode from `StudioLibrary`

**Resources:**
- Existing workspace: `src/modules/podcast/views/PodcastWorkspace.tsx`
- Types: `src/modules/studio/types/studio.ts`
- Plan: `docs/architecture/STUDIO_REFACTORING_PLAN.md` (Task 2.4)

**Estimated Time:** 2 hours

---

## Phase 2: Integration

### Task 3.1: Update Rotas

**Status:** AFTER Phase 2 complete

**Purpose:** Update app routing to use new Studio components

**Changes Required:**
- Create route `/studio` → `StudioMainView`
- Keep `/podcast` as temporary alias
- Update pillar data if needed

---

### Task 3.2: Preserve Workspace Components

**Status:** AFTER Phase 2 complete

**Purpose:** Verify existing podcast workspace still works

**Checklist:**
- [ ] SetupStage functions
- [ ] ResearchStage generates dossier
- [ ] PautaStage drag-and-drop works
- [ ] ProductionStage records episodes
- [ ] Auto-save persists data
- [ ] Navigation between stages works

---

## Dependencies Graph

```
Task 2.2 ✅ COMPLETE
  ├── Task 2.1 ⬅️ START HERE
  │   ├── Task 2.3
  │   └── Task 2.4
  │       └── Task 3.1
  │           └── Task 3.2
  │               └── Task 4.1 (Testing)
```

---

## Implementation Checklist for Task 2.1

### Setup

- [ ] Create file: `src/modules/studio/views/StudioMainView.tsx`
- [ ] Review existing StudioLibrary component
- [ ] Review StudioState and StudioAction types
- [ ] Study FSM pattern from plan doc

### Implementation

- [ ] Define StudioState interface (mode, currentShowId, currentProject, etc.)
- [ ] Create useEffect for initial loading
- [ ] Create mode transition handlers (goToLibrary, goToWizard, etc.)
- [ ] Implement switch statement for rendering based on mode
- [ ] Wire StudioLibrary callbacks to FSM transitions
- [ ] Add placeholder components for WIZARD and WORKSPACE modes
- [ ] Add LoadingScreen for LOADING mode

### Testing

- [ ] Verify FSM transitions work
- [ ] Check callbacks fire correctly
- [ ] Test mode switches don't cause rerenders
- [ ] Verify no race conditions with network throttling
- [ ] Test responsive design

### Documentation

- [ ] Add JSDoc comments explaining FSM pattern
- [ ] Document each mode and transition
- [ ] Add examples of callback usage

---

## Provided Resources

All the resources needed for next tasks:

### Documentation

1. **Implementation Guide:** `docs/STUDIO_LIBRARY_IMPLEMENTATION.md`
2. **API Reference:** `docs/STUDIO_LIBRARY_API.md`
3. **Quick Start:** `STUDIO_LIBRARY_QUICK_START.md`
4. **Refactoring Plan:** `docs/architecture/STUDIO_REFACTORING_PLAN.md`
5. **Migration Summary:** `STUDIO_LIBRARY_MIGRATION_COMPLETE.md`

### Code Templates

1. **FSM Pattern:** See StudioMainView section in refactoring plan
2. **Props Pattern:** See StudioLibrary component
3. **Episode Conversion:** See episodeToProject() function

### Type Definitions

1. **StudioState:** `src/modules/studio/types/studio.ts`
2. **StudioProject:** `src/modules/studio/types/studio.ts`
3. **StudioLibraryProps:** `src/modules/studio/types/studio.ts`

---

## Quick Reference

### Key Files to Know

```
src/modules/studio/
├── types/studio.ts              ← Types definitions
├── views/
│   ├── StudioLibrary.tsx       ← DONE ✅
│   ├── StudioMainView.tsx      ← TODO (Task 2.1)
│   ├── StudioWizard.tsx        ← TODO (Task 2.3)
│   └── StudioWorkspace.tsx     ← TODO (Task 2.4)
├── context/
│   └── StudioContext.tsx       ← TODO (Plan Task 1.3)
└── index.ts                    ← Module exports

src/modules/podcast/views/
├── PodcastLibrary.tsx          ← Original (preserved)
├── PodcastWorkspace.tsx        ← Reuse for workspace router
└── ...stages/                  ← Keep as-is
```

### Important Patterns

**FSM Transition Pattern:**
```typescript
const handleMode = () => {
  setState(prev => ({
    ...prev,
    mode: 'NEW_MODE',
    // Update related state
    currentShowId: showId
  }));
};
```

**Callback Pattern:**
```typescript
const handleSelectProject = (project: StudioProject) => {
  // Update state based on project
  setState(prev => ({
    ...prev,
    mode: 'WORKSPACE',
    currentProject: project
  }));
};
```

**Rendering Pattern:**
```typescript
switch (state.mode) {
  case 'LIBRARY':
    return <StudioLibrary ... />;
  case 'WIZARD':
    return <StudioWizard ... />;
  case 'WORKSPACE':
    return <StudioWorkspace ... />;
  case 'LOADING':
  default:
    return <LoadingScreen />;
}
```

---

## Git Workflow for Next Tasks

### Create Feature Branch
```bash
git checkout -b feat/studio-main-view
```

### Follow Commit Convention
```bash
git commit -m "feat(studio): Implement StudioMainView with FSM

Description of changes...

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
"
```

### Create PR for Review
```bash
gh pr create --title "feat: Implement StudioMainView" \
  --body "Task 2.1 implementation...PR details..."
```

---

## Success Criteria

### Task 2.1 (StudioMainView)

- [ ] FSM works without race conditions
- [ ] All mode transitions smooth
- [ ] Callbacks wire correctly
- [ ] No unnecessary re-renders
- [ ] TypeScript strict compliance
- [ ] Build passes
- [ ] Responsive design verified
- [ ] Documentation complete

---

## Support Resources

### For Questions About StudioLibrary

- Check: `STUDIO_LIBRARY_QUICK_START.md` (developer guide)
- Check: `docs/STUDIO_LIBRARY_API.md` (technical reference)
- Check: `docs/STUDIO_LIBRARY_IMPLEMENTATION.md` (architecture)

### For Questions About FSM Pattern

- Check: `docs/architecture/STUDIO_REFACTORING_PLAN.md`
- Review: Task 2.1 section (has full example)
- Study: Existing FSM implementations in codebase

### For Questions About Types

- Check: `src/modules/studio/types/studio.ts`
- Reference: `docs/STUDIO_LIBRARY_API.md` (StudioProject structure)

---

## Timeline Estimate

- Task 2.1 (StudioMainView): 4 hours
- Task 2.3 (StudioWizard): 4 hours
- Task 2.4 (StudioWorkspace): 2 hours
- **Phase 2 Total: 10 hours**

- Task 3.1 (Routing): 2 hours
- Task 3.2 (Verification): 3 hours
- **Phase 3 Total: 5 hours**

- Task 4.1 (E2E Tests): 4 hours
- Task 4.2 (Regression): 3 hours
- **Phase 4 Total: 7 hours**

**Grand Total: ~22 hours** to complete full refactoring

---

**Last Updated:** 2025-12-18
**Current Task:** Task 2.2 ✅ COMPLETE
**Next Task:** Task 2.1 ⬅️ READY TO START
**Status:** Ready for next phase implementation
