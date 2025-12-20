# ProductionStage - Complete Implementation Guide

## Overview

ProductionStage is the fourth and final stage of the podcast workspace, handling the complete recording interface with real-time controls, topic tracking, and teleprompter integration.

## Architecture

### Component Structure

```
ProductionStage.tsx
├── Header Section (Recording Status + Guest Info)
├── Main Control Area
│   ├── Timer Display (HH:MM:SS format)
│   ├── Recording Controls (Start/Pause/Resume/Stop)
│   ├── Teleprompter Toggle Button
│   └── Progress Bar (Topics Completion)
└── Topics Checklist Panel
    ├── Topics List with Auto-scroll
    ├── Current Topic Highlighting
    └── Navigation Controls
```

## Features Implemented

### 1. Layout Base (Task 1)
- Clean ceramic design with orange accent color
- Header with episode title and recording status indicator
- Central control area for recording interface
- Side panel showing topics checklist
- Responsive grid layout

**Files:**
- `ProductionStage.tsx` (Lines 165-434)

### 2. Recording Controls (Task 2)
- Start Recording button (Red, Mic icon) - initiates recording
- Pause button (Yellow, Pause icon) - appears when recording
- Resume button (Green, Play icon) - appears when paused
- Stop button (Blue, Stop icon) - finishes recording

**State Management:**
- `actions.startRecording()` - Sets `isRecording=true`, `isPaused=false`, `startedAt=now`
- `actions.pauseRecording()` - Sets `isPaused=true`
- `actions.resumeRecording()` - Sets `isPaused=false`
- `actions.stopRecording()` - Sets `isRecording=false`, `finishedAt=now`

**Implementation:**
- Lines 86-103: Handler functions
- Lines 210-252: UI buttons with state-based rendering

### 3. Timer Display (Task 3)
- **Format:** HH:MM:SS (e.g., "01:23:45")
- **Update Frequency:** Every 1 second
- **Calculation:** `elapsed = (now - startedAt) / 1000`
- **Precision:** Accurately tracks elapsed time even during pauses

**Implementation:**
- Lines 42-62: Timer effect using setInterval
- Lines 76-84: formatDuration function
- Lines 201-207: Display component

**Technical Details:**
```typescript
// Timer calculates elapsed seconds from startedAt timestamp
const elapsedSeconds = Math.floor(
  (Date.now() - production.startedAt!.getTime()) / 1000
);
actions.updateDuration(elapsedSeconds);

// formatDuration converts seconds to HH:MM:SS
const hrs = Math.floor(seconds / 3600);
const mins = Math.floor((seconds % 3600) / 60);
const secs = seconds % 60;
```

### 4. Topics Checklist (Task 4)
- Displays all topics from `state.pauta.topics`
- Shows topic order, text, and category
- Checkbox to mark topics as completed
- Current topic highlighting with orange border
- Auto-scroll to current topic
- Progress counter (X of Y topics completed)

**Features:**
- Click topic to select and set as current
- Auto-scroll to current topic when changed
- Disabled checkboxes for future topics when recording
- Visual indicators: completed (strikethrough), current (border + pulse)
- Category badges with emojis

**Implementation:**
- Lines 65-74: Auto-scroll effect
- Lines 303-420: Topics list rendering
- Lines 106-119: Topic completion handler

### 5. Teleprompter Integration (Task 5)
- Reuses existing `TeleprompterWindow` component
- Toggle button to open/close teleprompter
- Passes topics array and current index
- Handles topic navigation from teleprompter
- Full-screen display when active

**Implementation:**
- Lines 153-163: Conditional rendering of TeleprompterWindow
- Lines 255-263: Toggle button
- Lines 138-147: Teleprompter navigation handlers

**Integration Points:**
```typescript
<TeleprompterWindow
  topics={pauta.topics}
  currentIndex={currentTopicIndex}
  onIndexChange={handleTeleprompterIndexChange}
  onClose={handleCloseTeleprompter}
/>
```

### 6. Logic Migration from ProductionMode (Task 6)
Migrated from `src/modules/podcast/views/ProductionMode.tsx`:

#### Migrated Features:
- Recording state management (start/pause/resume/stop)
- Timer calculation and display
- Topic completion tracking
- Current topic highlighting
- Progress bar calculation

#### Key Differences:
- Uses workspace context instead of local state
- Integrates with workspace reducer for persistence
- Auto-save via useAutoSave hook
- Simplified UI focused on recording workflow

#### Code Mapping:
| ProductionMode | ProductionStage |
|---|---|
| Local `isRecording` state | `state.production.isRecording` |
| Local `recordingTime` state | `state.production.duration` (calculated from startedAt) |
| setInterval timer | useEffect-based timer with interval |
| handleToggleRecording | handleTogglePause |
| Topic array state | `state.pauta.topics` |
| Chat panel | (Removed - focus on recording) |
| Co-Host panel | (Removed - can be added in phase 2) |

### 7. Completion Calculator (Task 7)

The completion calculator is implemented in `PodcastWorkspaceContext.tsx` (Lines 436-450):

```typescript
function calculateProductionCompletion(state: PodcastWorkspaceState): StageCompletionStatus {
  const { duration, finishedAt, isRecording } = state.production;

  // Complete: recording finished with duration
  if (finishedAt && duration > 0) {
    return 'complete';
  }

  // Partial: recording started or in progress
  if (isRecording || duration > 0) {
    return 'partial';
  }

  return 'none';
}
```

**States:**
- ✅ **Complete:** `finishedAt` exists AND `duration > 0`
  - Recording has been completed and saved
  - Ready to move to next stage or publish

- 🟡 **Partial:** `isRecording` is true OR `duration > 0`
  - Recording in progress or has recorded some content
  - Can be continued or finished

- ⭕ **None:** No recording started
  - Initial state
  - No duration recorded yet

**Validation Logic:**
```typescript
// In context: calculateProductionCompletion
state.stageCompletions.production // Returns 'complete' | 'partial' | 'none'

// In workspace UI can check:
if (state.production.finishedAt && state.production.duration > 0) {
  // Recording is complete
}
```

## State Management

### Production State Structure
```typescript
production: {
  isRecording: boolean;      // Currently recording
  isPaused: boolean;         // Recording is paused
  duration: number;          // Total elapsed seconds
  startedAt: Date | null;    // When recording started
  finishedAt: Date | null;   // When recording finished
  currentTopicId: string | null;  // Currently selected topic
  recordingFilePath: string | null;  // Path to saved recording
}
```

### Reducer Actions
- `START_RECORDING` - Begin recording session
- `PAUSE_RECORDING` - Pause active recording
- `RESUME_RECORDING` - Resume paused recording
- `STOP_RECORDING` - Finish recording
- `UPDATE_DURATION` - Update elapsed seconds
- `SET_CURRENT_TOPIC` - Change current topic
- `UPDATE_PRODUCTION` - Generic update

## Auto-Save Integration

The `useAutoSave` hook automatically saves production state changes:

```typescript
// In parent component (PodcastWorkspace):
useAutoSave({
  state,
  enabled: true,
  debounceMs: 2000,
  onSaveSuccess: () => console.log('Auto-saved'),
  onSaveError: (error) => console.error('Save failed', error)
});
```

**Saves to Database:**
- `recording_duration` - Total elapsed seconds
- `recording_started_at` - ISO timestamp of start
- `recording_finished_at` - ISO timestamp of finish
- `recording_file_path` - Path to audio file
- Topics with completion status

## UI/UX Features

### Visual Design
- **Color Scheme:** Orange primary (action buttons), gray secondary
- **Button States:**
  - Red for Start
  - Yellow for Pause
  - Green for Resume
  - Blue for Stop
- **Progress Indicators:** Animated progress bar, completion counter
- **Responsive:** Works on desktop and tablet

### Accessibility
- Proper ARIA labels on buttons
- Semantic HTML structure
- Disabled states for unavailable actions
- Keyboard support (Tab navigation)

### Real-time Feedback
- Live timer updates every 1 second
- Recording status indicator (pulsing dot)
- Current topic highlighting with auto-scroll
- Progress bar animation
- Visual feedback on button hover/click

## Performance Optimizations

### Timer Management
```typescript
// Cleanup interval on unmount to prevent memory leaks
useEffect(() => {
  // ... timer setup
  return () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };
}, [production.isRecording, production.isPaused, production.startedAt, actions]);
```

### Auto-scroll Optimization
- Only scrolls when `currentTopicId` changes
- Uses `scrollIntoView` with smooth behavior
- Minimal DOM queries

### Re-render Optimization
- useCallback for handler functions
- Memoized formatDuration function
- Conditional rendering of controls

## Testing Checklist

### Unit Tests (Can be added)
- [ ] formatDuration function with various seconds
- [ ] Timer calculations with startedAt timestamps
- [ ] Topic completion handler logic
- [ ] Completion calculator with different states

### Integration Tests
- [ ] Start/pause/resume/stop recording flow
- [ ] Topic selection and completion
- [ ] Teleprompter open/close
- [ ] Auto-save triggers on state changes
- [ ] Timer accuracy

### Manual Testing
- [ ] Timer starts at 00:00:00 and increments correctly
- [ ] Pause stops timer, resume continues from paused time
- [ ] Stop finalizes recording and updates state
- [ ] Topics auto-scroll when selected
- [ ] Completion status updates correctly
- [ ] Teleprompter opens/closes without errors
- [ ] Progress bar updates as topics complete

## Known Limitations & Future Enhancements

### Current Limitations
1. **No Audio Recording:** Timer and UI only, no actual audio capture
2. **No File Storage:** recordingFilePath not populated (requires audio implementation)
3. **No Co-Host Integration:** Co-Host Aica UI removed (can be added in phase 2)
4. **No Real-time Sync:** Local timer, no server synchronization

### Future Enhancements
- Add actual audio recording with Web Audio API
- Integrate audio file upload to Supabase Storage
- Add Co-Host Aica with Gemini Live API
- Add real-time chat with AI
- Add audio level indicators
- Add guest indicator (connected/disconnected)
- Add session metadata (bitrate, quality)
- Add automatic silence detection
- Add transcription live preview

## Files Affected

### Modified
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\modules\podcast\components\stages\ProductionStage.tsx`

### Not Modified (Already Complete)
- `src/modules/podcast/context/PodcastWorkspaceContext.tsx` - Context and reducer
- `src/modules/podcast/types/workspace.ts` - Type definitions
- `src/modules/podcast/hooks/useAutoSave.tsx` - Auto-save functionality
- `src/modules/podcast/components/TeleprompterWindow.tsx` - Teleprompter component

## Integration in Workspace

The ProductionStage is integrated into the main workspace navigation:

```typescript
// In PodcastWorkspaceView.tsx
<StageRouter currentStage={state.currentStage}>
  <Route stage="setup" component={SetupStage} />
  <Route stage="research" component={ResearchHub} />
  <Route stage="pauta" component={PautaStage} />
  <Route stage="production" component={ProductionStage} />  {/* ← Here */}
</StageRouter>
```

## API Endpoints Required (Future)

When implementing actual audio recording, these endpoints will be needed:

```typescript
// Start recording session
POST /api/podcast/start-recording
{
  episodeId: string;
  guestName: string;
}

// Finish recording and process
POST /api/podcast/finish-recording
{
  episodeId: string;
  duration: number;
  audioData: Blob;
}
```

## References

- Context: `src/modules/podcast/context/PodcastWorkspaceContext.tsx`
- Types: `src/modules/podcast/types/workspace.ts`
- Original: `src/modules/podcast/views/ProductionMode.tsx`
- Teleprompter: `src/modules/podcast/components/TeleprompterWindow.tsx`
- Hook: `src/modules/podcast/hooks/useAutoSave.tsx`
