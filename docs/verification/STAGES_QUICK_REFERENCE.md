# Podcast Stages - Quick Reference

## Overview
All 4 podcast workspace stages preserved and functional after Studio Refactoring.

## Stage Files
- **Setup**: `src/modules/podcast/components/stages/SetupStage.tsx` (562 lines)
- **Research**: `src/modules/podcast/components/stages/ResearchStage.tsx` (528 lines)
- **Pauta**: `src/modules/podcast/components/stages/PautaStage.tsx` (630 lines)
- **Production**: `src/modules/podcast/components/stages/ProductionStage.tsx` (436 lines)

## Workspace Integration
- **Wrapper**: `src/modules/podcast/components/workspace/PodcastWorkspace.tsx`
- **Router**: `src/modules/podcast/components/workspace/StageRenderer.tsx`
- **Navigation**: `src/modules/podcast/components/workspace/StageStepper.tsx`
- **Entry Point**: `src/views/PodcastCopilotView.tsx` (workspace view at line 485-526)

## Critical Functions by Stage

### SetupStage
- `handleGuestTypeSelect()` - Select public figure or common person
- `handleSearchProfile()` - AI-powered profile search
- `handleConfirmProfile()` - Confirm and save profile data

### ResearchStage
- `handleGenerateDossier()` - Generate complete dossier
- `handleAddCustomSource()` - Add text/URL/file sources
- `handleRegenerateDossier()` - Regenerate with new context
- `handleSendChatMessage()` - Chat with Aica

### PautaStage
- `handleAddTopic()` - Add new topic
- `handleDragStart/Over/End()` - Drag-and-drop reordering
- `handleToggleTopic()` - Mark topic complete/incomplete
- `handleGeneratePauta()` - AI-powered pauta generation
- `handleSwapVersion()` - Load previous pauta version

### ProductionStage
- `handleStartRecording()` - Start recording session
- `handleTogglePause()` - Pause/resume recording
- `handleStopRecording()` - Finish recording
- `handleTopicComplete()` - Mark topic discussed
- `handleSelectTopic()` - Jump to topic
- `handleNextTopic()` - Move to next topic

## Context & State Management
- **Context**: `src/modules/podcast/context/PodcastWorkspaceContext.tsx`
- **Hook**: `usePodcastWorkspace()` - Access state and actions
- **Types**: `src/modules/podcast/types/workspace.ts`

## Key Features by Stage

| Feature | Setup | Research | Pauta | Production |
|---------|-------|----------|-------|------------|
| Auto-save | ✅ | ✅ | ✅ | ✅ |
| AI Integration | ✅ | ✅ | ✅ | - |
| Drag-and-drop | - | - | ✅ | - |
| Chat Interface | - | ✅ | - | - |
| Timer | - | - | - | ✅ |
| Completion Badge | ✅ | ✅ | ✅ | ✅ |
| Version History | - | - | ✅ | - |

## Completion Badge States
- **None** (⭕): Not started
- **Partial** (🟡): In progress
- **Complete** (✅): Finished

## Data Flow
```
PodcastCopilotView
  → Dashboard (episode selection)
    → PodcastWorkspace
      → PodcastWorkspaceProvider
        → StageRenderer
          → SetupStage
          → ResearchStage
          → PautaStage
          → ProductionStage
```

## Auto-Save Configuration
- **Debounce**: 2000ms
- **Trigger**: Any state change
- **Storage**: Supabase (podcast_episodes table)
- **Location**: useAutoSave hook in PodcastWorkspace

## Navigation Rules
- **Permeable**: Can navigate to any stage in any order
- **Backward Compatible**: Old views still work (legacy)
- **Guard Effect**: Prevents unwanted redirects during transitions

## Testing Checklist

### Setup Stage
- [ ] Select guest type
- [ ] Search guest profile
- [ ] Fill theme and schedule
- [ ] Verify data saves

### Research Stage
- [ ] Generate dossier
- [ ] View all 3 tabs (Bio, Ficha, Notícias)
- [ ] Add custom sources
- [ ] Chat with Aica

### Pauta Stage
- [ ] Generate pauta with AI
- [ ] Drag topics between categories
- [ ] Edit topics
- [ ] Mark complete
- [ ] View version history

### Production Stage
- [ ] Start/pause/resume recording
- [ ] Verify timer accuracy
- [ ] Mark topics complete
- [ ] Open teleprompter
- [ ] Stop recording

## Common Issues & Solutions

### Issue: State not persisting
**Solution**: Check auto-save is enabled and no errors in console

### Issue: Drag-drop not working
**Solution**: Ensure @dnd-kit libraries imported correctly

### Issue: Badge not updating
**Solution**: Verify stageCompletions calculated in context

### Issue: Navigation not working
**Solution**: Check view state in PodcastCopilotView matches expected values

## Debug Tips

1. Check console for [PodcastCopilot] logs
2. Verify episodeId and showId in state
3. Use React DevTools to inspect context
4. Check Supabase for data persistence
5. Monitor network tab for auto-save requests

## Key Improvements Made
- ✅ Unified workspace with all stages in one view
- ✅ Improved navigation with stage stepper
- ✅ Auto-save with visual feedback
- ✅ Completion tracking with badges
- ✅ Better error handling
- ✅ Mobile responsive design
- ✅ Performance optimizations

## Known Limitations
- Chat with Aica uses placeholder responses (to be integrated with Gemini Live API)
- AI profile search requires service key configuration
- Dossier generation depends on Gemini Deep Research API
- File upload in custom sources not yet fully implemented

## Next Steps for Enhancement
1. Integrate Gemini Live API for real chat
2. Add more AI capabilities
3. Implement full file upload support
4. Add transcription support (roadmap)
5. Add content cut generation for TikTok/Reels (roadmap)
6. Add auto blog post generation (roadmap)
