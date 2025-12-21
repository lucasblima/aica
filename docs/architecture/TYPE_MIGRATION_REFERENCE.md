# Type Migration Reference Guide

Quick reference for updating imports during Wave 3-5 migrations.

---

## Import Mappings

### Before (Deprecated)
```typescript
import type {
  PodcastWorkspaceState,
  WorkspaceAction,
  SetupState,
  ResearchState,
  PautaState,
  ProductionState,
  PodcastStageId,
  PodcastStage,
  PODCAST_STAGES,
  WorkspaceActions,
  StageCompletionStatus,
  StageCompletionMap
} from '../../../_deprecated/modules/podcast/types/workspace'

import type {
  Dossier,
  Topic,
  TopicCategory,
  SavedPauta
} from '../../../_deprecated/modules/podcast/types'
```

### After (New Structure)
```typescript
import type {
  PodcastWorkspaceState,
  WorkspaceAction,
  SetupState,
  ResearchState,
  PautaState,
  ProductionState,
  PodcastStageId,
  PodcastStage,
  WorkspaceActions,
  StageCompletionStatus,
  StageCompletionMap,
  Dossier,
  Topic,
  TopicCategory,
  SavedPauta
} from '@/modules/studio/types'

import { PODCAST_STAGES } from '@/modules/studio/types'
```

---

## Type Renames

### CustomSource → WorkspaceCustomSource

**Before:**
```typescript
import type { CustomSource } from '../types/workspace'

const source: CustomSource = {
  id: '123',
  type: 'url',
  content: 'https://example.com',
  label: 'Example',
  createdAt: new Date()
}
```

**After:**
```typescript
import type { WorkspaceCustomSource } from '@/modules/studio/types'

const source: WorkspaceCustomSource = {
  id: '123',
  type: 'url',
  content: 'https://example.com',
  label: 'Example',
  createdAt: new Date()
}
```

**Search & Replace Pattern:**
- Search: `CustomSource` (in workspace context files only)
- Replace: `WorkspaceCustomSource`
- Files: Context, hooks, components using workspace custom sources

**DO NOT replace in:**
- `src/modules/studio/services/podcastAIService.ts` (uses its own `CustomSource`)

---

## State Access Patterns

### Workspace State (Child)

**Before:**
```typescript
const { state } = usePodcastWorkspace()
// state is PodcastWorkspaceState
```

**After:**
```typescript
const { state } = usePodcastWorkspace()
// state is still PodcastWorkspaceState (unchanged)
```

### Studio State (Parent)

**Before:**
```typescript
const { state } = useStudio()
// state.mode: StudioMode
// state.currentProject: StudioProject | null
```

**After:**
```typescript
const { state } = useStudio()
// state.mode: StudioMode (unchanged)
// state.currentProject: StudioProject | null (unchanged)
```

---

## Action Type Updates

### Workspace Actions

**Before:**
```typescript
import type { WorkspaceAction } from '../types/workspace'

const action: WorkspaceAction = {
  type: 'SET_STAGE',
  payload: 'research'
}
```

**After:**
```typescript
import type { WorkspaceAction } from '@/modules/studio/types'

const action: WorkspaceAction = {
  type: 'SET_STAGE',
  payload: 'research'
}
```

---

## Context Files to Update (Wave 3)

### Files Requiring Import Updates

1. **`_deprecated/modules/podcast/context/PodcastWorkspaceContext.tsx`**
   - Migrate to: `src/modules/studio/context/PodcastWorkspaceContext.tsx`
   - Update: All type imports
   - Rename: `CustomSource` → `WorkspaceCustomSource`

2. **Context Provider Components**
   - Update imports to use new paths
   - No logic changes needed

---

## Component Files to Update (Wave 5)

### Stage Components

1. **Setup Stage**
   - Update: `SetupState` import
   - No type changes

2. **Research Stage**
   - Update: `ResearchState`, `WorkspaceCustomSource` imports
   - Rename: `CustomSource` → `WorkspaceCustomSource`

3. **Pauta Stage**
   - Update: `PautaState`, `Topic`, `TopicCategory`, `SavedPauta` imports
   - No type changes

4. **Production Stage**
   - Update: `ProductionState` import
   - No type changes

### Workspace Components

1. **Workspace Container**
   - Update: `PodcastWorkspaceState`, `PodcastStageId` imports
   - No type changes

2. **Stage Navigation**
   - Update: `PODCAST_STAGES`, `PodcastStage` imports
   - No type changes

---

## Service Layer (DO NOT UPDATE YET)

### Keep Existing Imports

**DO NOT update these files in Waves 2-5:**

```typescript
// src/modules/studio/services/podcastAIService.ts
// Keep existing CustomSource definition
export interface CustomSource {
  id: string
  url: string
  title: string
  type: 'article' | 'video' | 'social' | 'other'
}
```

**Reason:** Service layer uses different CustomSource shape for AI operations. Will be reconciled in future service layer migration.

---

## Hook Files to Update (Wave 4)

### Hooks Requiring Import Updates

1. **`useStudioData`**
   - Update: All workspace type imports
   - Update: `WorkspaceCustomSource` rename

2. **`useSavedPauta`**
   - Update: `SavedPauta`, `Topic` imports
   - No type changes

3. **Auto-save hooks**
   - Update: `PodcastWorkspaceState` import
   - Add: `AutoSaveConfig` type usage

---

## Validation Checklist

After updating each file:

- ✅ TypeScript compilation succeeds (`npx tsc --noEmit`)
- ✅ All imports use `@/modules/studio/types`
- ✅ `CustomSource` renamed to `WorkspaceCustomSource` (except in service layer)
- ✅ No direct imports from `podcast-workspace.ts` (use index)
- ✅ Type guards used where appropriate (`isPodcastProject`)

---

## Common Pitfalls

### ❌ WRONG: Direct File Imports
```typescript
import type { PodcastWorkspaceState } from '@/modules/studio/types/podcast-workspace'
```

### ✅ CORRECT: Index Imports
```typescript
import type { PodcastWorkspaceState } from '@/modules/studio/types'
```

---

### ❌ WRONG: Mixed Old/New Imports
```typescript
import type { PodcastWorkspaceState } from '@/modules/studio/types'
import type { Dossier } from '../../../_deprecated/modules/podcast/types'
```

### ✅ CORRECT: All from New Location
```typescript
import type { PodcastWorkspaceState, Dossier } from '@/modules/studio/types'
```

---

### ❌ WRONG: Updating Service Layer CustomSource
```typescript
// podcastAIService.ts
import type { WorkspaceCustomSource } from '@/modules/studio/types'
```

### ✅ CORRECT: Keep Service Layer Separate
```typescript
// podcastAIService.ts
export interface CustomSource {
  id: string
  url: string
  title: string
  type: 'article' | 'video' | 'social' | 'other'
}
```

---

## Quick Search & Replace Commands

### For Context/Component Files

```bash
# Update import paths (workspace types)
Find:    from '../../../_deprecated/modules/podcast/types/workspace'
Replace: from '@/modules/studio/types'

# Update import paths (general types)
Find:    from '../../../_deprecated/modules/podcast/types'
Replace: from '@/modules/studio/types'

# Rename CustomSource in workspace context
Find:    CustomSource
Replace: WorkspaceCustomSource
Files:   Context, hooks, components (NOT podcastAIService.ts)
```

---

## Testing After Migration

### Unit Tests
```typescript
import type { PodcastWorkspaceState } from '@/modules/studio/types'

// Test state shape
const mockState: PodcastWorkspaceState = {
  currentStage: 'setup',
  visitedStages: [],
  setup: { /* ... */ },
  research: { /* ... */ },
  pauta: { /* ... */ },
  production: { /* ... */ },
  // ...
}
```

### Integration Tests
- Verify context providers work with new types
- Verify reducer handles all actions
- Verify auto-save hooks work

---

**Last Updated:** 2025-12-20 (Wave 2 Complete)
**Status:** Ready for Wave 3
