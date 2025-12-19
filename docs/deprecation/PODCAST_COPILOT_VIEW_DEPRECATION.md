# PodcastCopilotView Deprecation Notice

## Summary
`PodcastCopilotView.tsx` and related legacy views have been deprecated in favor of the new Studio Module architecture.

## Deprecated Files
- src/views/PodcastCopilotView.tsx (809 lines)
- src/modules/podcast/views/PreparationMode.tsx
- src/modules/podcast/views/StudioMode.tsx
- src/modules/podcast/views/ProductionMode.tsx

## Replacement Files
- src/modules/studio/views/StudioMainView.tsx
- src/modules/studio/context/StudioContext.tsx
- src/modules/studio/views/StudioLibrary.tsx
- src/modules/studio/views/StudioWizard.tsx
- src/modules/studio/views/StudioWorkspace.tsx

## Reason for Deprecation
The old architecture suffered from:
- Race conditions causing infinite redirect loops
- 150+ lines of defensive guard logic
- useEffect-based navigation (fragile)
- Tight coupling between views

The new Studio Module uses:
- Finite State Machine (FSM) for predictable state transitions
- Explicit callback-based navigation (no useEffect)
- Separation of concerns (Library, Wizard, Workspace)
- Zero race conditions

## Migration Timeline
- **v1.x**: Both architectures coexist, /podcast redirects to /studio
- **v2.0**: PodcastCopilotView and related files will be removed

## How to Migrate
See: docs/architecture/STUDIO_REFACTORING_PLAN.md
