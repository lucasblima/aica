# ProductionStage - Testing Guide

## Test Cases for Track 4 Implementation

### 1. Layout & UI Tests

#### Test Case 1.1: Header Rendering
**Preconditions:**
- ProductionStage is mounted
- Guest name is set in setup state

**Steps:**
1. Navigate to production stage
2. Verify header shows "Gravação do Episódio"
3. Verify guest name is displayed below header
4. Verify orange Mic icon is visible

**Expected Result:**
- Header displays correctly with all elements
- Guest name matches setup state

#### Test Case 1.2: Central Control Area Rendering
**Steps:**
1. Verify timer display area is centered
2. Verify progress bar section is visible (if topics exist)
3. Verify buttons area is properly styled
4. Verify all controls are responsive

**Expected Result:**
- All UI elements render correctly
- Layout is responsive on different screen sizes

### 2. Recording Control Tests

#### Test Case 2.1: Start Recording
**Steps:**
1. Click "Iniciar Gravação" button
2. Verify button changes to show Pause/Resume and Stop buttons
3. Verify recording status indicator shows "GRAVANDO"
4. Verify red pulsing dot appears

**Expected Result:**
- `production.isRecording` = true
- `production.isPaused` = false
- `production.startedAt` is set to current date/time
- State is marked as dirty for auto-save

#### Test Case 2.2: Pause Recording
**Preconditions:**
- Recording is active and running

**Steps:**
1. Click Pause button (yellow)
2. Verify button changes to "Retomar" (Resume)
3. Verify status shows "PAUSADO"

**Expected Result:**
- `production.isPaused` = true
- Timer stops incrementing
- Duration remains at last value
- State is marked as dirty

#### Test Case 2.3: Resume Recording
**Preconditions:**
- Recording is paused

**Steps:**
1. Click Resume button (green)
2. Verify button changes back to "Pausar"
3. Verify status shows "GRAVANDO" again

**Expected Result:**
- `production.isPaused` = false
- Timer resumes incrementing
- State is marked as dirty

#### Test Case 2.4: Stop Recording
**Preconditions:**
- Recording is active (paused or running)

**Steps:**
1. Click "Finalizar" button (blue)
2. Verify buttons return to initial state with only "Iniciar Gravação"
3. Verify status indicator disappears
4. Verify timer shows final duration

**Expected Result:**
- `production.isRecording` = false
- `production.finishedAt` is set to current date/time
- Duration is preserved
- State is marked as dirty

### 3. Timer Tests

#### Test Case 3.1: Timer Initialization
**Steps:**
1. Navigate to production stage (no recording started)
2. Verify timer displays "00:00:00"

**Expected Result:**
- Timer shows correct initial value

#### Test Case 3.2: Timer Increments Correctly
**Preconditions:**
- Recording is started

**Steps:**
1. Start recording
2. Wait 5 seconds
3. Verify timer shows approximately "00:00:05"
4. Wait another 5 seconds
5. Verify timer shows approximately "00:00:10"

**Expected Result:**
- Timer increments every 1 second
- Accuracy is within 100ms

#### Test Case 3.3: Timer Format HH:MM:SS
**Preconditions:**
- Recording is running

**Steps:**
1. Set duration to 3661 seconds (1 hour, 1 minute, 1 second) manually for testing
2. Verify format displays as "01:01:01"
3. Set duration to 123 seconds
4. Verify format displays as "00:02:03"
5. Set duration to 5 seconds
6. Verify format displays as "00:00:05"

**Expected Result:**
- All durations format correctly as HH:MM:SS
- Padding with zeros works for all positions

#### Test Case 3.4: Timer Pauses Correctly
**Preconditions:**
- Recording is running for 5 seconds

**Steps:**
1. Verify timer shows "00:00:05"
2. Pause recording
3. Wait 3 seconds
4. Verify timer still shows "00:00:05"
5. Resume recording
6. Wait 2 more seconds
7. Verify timer shows "00:00:07"

**Expected Result:**
- Timer stops when paused
- Timer continues from correct value when resumed
- Pause/resume doesn't affect total duration

### 4. Topics Checklist Tests

#### Test Case 4.1: Topics Display
**Preconditions:**
- Pauta stage completed with 3 topics created

**Steps:**
1. Navigate to production stage
2. Verify all 3 topics appear in checklist
3. Verify topic order matches pauta order
4. Verify topics show category emojis
5. Verify topic counter shows "Tópico X de 3"

**Expected Result:**
- All topics display correctly
- Order is preserved
- Category indicators are visible

#### Test Case 4.2: Topic Selection
**Steps:**
1. Click on second topic
2. Verify topic gets orange highlight with left border
3. Verify `production.currentTopicId` matches clicked topic
4. Click on third topic
5. Verify highlight moves to third topic

**Expected Result:**
- Current topic visually highlighted
- State updates correctly
- Only one topic highlighted at a time

#### Test Case 4.3: Topic Completion
**Preconditions:**
- Recording is active with current topic selected

**Steps:**
1. Verify checkbox is unchecked for current topic
2. Click "Concluir" button on current topic
3. Verify checkbox becomes checked
4. Verify topic gets strikethrough styling
5. Verify progress bar increments
6. Verify current topic automatically moves to next uncompleted topic

**Expected Result:**
- Topic completion works correctly
- State updates: `topic.completed` = true
- Progress bar shows correct count
- Auto-advances to next topic
- State marked as dirty for auto-save

#### Test Case 4.4: Manual Checkbox Toggle
**Preconditions:**
- Recording not active

**Steps:**
1. Click checkbox for a topic
2. Verify topic completion handler runs
3. Click checkbox again to uncheck
4. Verify topic completion is undone
5. Verify progress bar updates

**Expected Result:**
- Manual checkbox control works
- State updates correctly
- Progress bar reflects changes

#### Test Case 4.5: Auto-scroll to Current Topic
**Preconditions:**
- Topics list is scrolled to top
- Topic at bottom of list is created

**Steps:**
1. Click on topic at bottom of list
2. Verify list auto-scrolls to show current topic
3. Verify smooth scroll animation
4. Verify topic remains visible without requiring manual scroll

**Expected Result:**
- Auto-scroll works smoothly
- Current topic always visible
- Scroll behavior is smooth and natural

#### Test Case 4.6: Next Topic Button
**Steps:**
1. Verify "Próximo Tópico" button is enabled
2. Click button
3. Verify topic index increments
4. Verify current topic visually changes
5. Repeat until last topic
6. Verify button becomes disabled on last topic

**Expected Result:**
- Navigation between topics works
- Button disables appropriately
- Current topic updates with button click

### 5. Progress Bar Tests

#### Test Case 5.1: Progress Bar Display
**Preconditions:**
- Topics created in pauta

**Steps:**
1. Navigate to production stage
2. Verify progress bar is visible
3. Verify progress text shows "0 de 3 tópicos"
4. Verify progress bar width is 0%

**Expected Result:**
- Progress bar displays correctly
- Completion counter accurate

#### Test Case 5.2: Progress Bar Updates
**Steps:**
1. Complete first topic
2. Verify progress shows "1 de 3 tópicos"
3. Verify progress bar width ~33%
4. Complete second topic
5. Verify progress shows "2 de 3 tópicos"
6. Verify progress bar width ~66%
7. Complete third topic
8. Verify progress shows "3 de 3 tópicos"
9. Verify progress bar width 100%

**Expected Result:**
- Progress bar updates smoothly
- Percentages calculated correctly
- Visual feedback matches state

### 6. Teleprompter Integration Tests

#### Test Case 6.1: Teleprompter Opens
**Preconditions:**
- Topics exist in pauta

**Steps:**
1. Click "Abrir Teleprompter" button
2. Verify TeleprompterWindow component renders fullscreen
3. Verify first topic displays
4. Verify button has focus/active state

**Expected Result:**
- Teleprompter opens without errors
- Content displays correctly
- UI transitions smoothly

#### Test Case 6.2: Teleprompter Navigation
**Preconditions:**
- Teleprompter is open with 3 topics

**Steps:**
1. Verify topic 1 is displayed
2. Click down arrow or "Próximo" control
3. Verify topic 2 displays
4. Verify `production.currentTopicId` updates
5. Click up arrow or "Anterior"
6. Verify topic 1 displays again
7. Navigate through all topics

**Expected Result:**
- Navigation controls work correctly
- Topic switching is smooth
- State syncs with workspace state
- Auto-scroll still works after teleprompter changes

#### Test Case 6.3: Teleprompter Closes
**Preconditions:**
- Teleprompter is open

**Steps:**
1. Click X/close button
2. Verify TeleprompterWindow unmounts
3. Verify ProductionStage re-renders
4. Verify current topic selection is preserved
5. Verify timer continues running if recording

**Expected Result:**
- Teleprompter closes cleanly
- State is preserved
- No errors on close
- Recording state unaffected

#### Test Case 6.4: Teleprompter Button Disabled
**Preconditions:**
- No topics created in pauta

**Steps:**
1. Verify "Abrir Teleprompter" button is disabled
2. Verify button visual indicates disabled state
3. Verify clicking button does nothing

**Expected Result:**
- Button is properly disabled
- No errors when clicking disabled button

### 7. State & Auto-Save Tests

#### Test Case 7.1: State Updates on Recording
**Steps:**
1. Start recording
2. Verify `state.production.isRecording` = true
3. Verify `state.production.startedAt` is set
4. Pause recording
5. Verify `state.production.isPaused` = true
6. Resume recording
7. Verify `state.production.isPaused` = false
8. Stop recording
9. Verify `state.production.finishedAt` is set
10. Verify `state.isDirty` = true

**Expected Result:**
- All state changes trigger correctly
- State reflects current recording state

#### Test Case 7.2: Auto-Save After Recording Changes
**Preconditions:**
- useAutoSave is integrated in parent component
- Supabase is connected

**Steps:**
1. Start recording
2. Wait 2+ seconds for auto-save debounce
3. Check Supabase database for updated episode
4. Verify recording_started_at is saved
5. Stop recording
6. Wait 2+ seconds
7. Verify recording_finished_at is saved in database
8. Verify recording_duration matches state

**Expected Result:**
- Auto-save triggers after debounce period
- Database is updated correctly
- All production fields persist

### 8. Completion Calculator Tests

#### Test Case 8.1: Completion Status - None
**Preconditions:**
- Fresh production state with no recording

**Steps:**
1. Check `state.stageCompletions.production`
2. Verify value is 'none'

**Expected Result:**
- Status returns 'none' when no recording initiated

#### Test Case 8.2: Completion Status - Partial
**Preconditions:**
- Recording is active

**Steps:**
1. Start recording and record for 5 seconds
2. Check `state.stageCompletions.production`
3. Verify value is 'partial'

**Expected Result:**
- Status returns 'partial' when duration > 0

#### Test Case 8.3: Completion Status - Partial (Finished but No Recording)
**Preconditions:**
- Recording started but immediately stopped without duration

**Steps:**
1. Start recording (startedAt set)
2. Stop recording (finishedAt set)
3. Check duration
4. If duration = 0, verify status is still 'none'

**Expected Result:**
- Status requires duration > 0 for any completion

#### Test Case 8.4: Completion Status - Complete
**Preconditions:**
- Recording completed with duration > 0

**Steps:**
1. Start recording
2. Let run for 5+ seconds
3. Stop recording
4. Verify `state.production.finishedAt` is set
5. Verify `state.production.duration` > 0
6. Check `state.stageCompletions.production`
7. Verify value is 'complete'

**Expected Result:**
- Status returns 'complete' when finishedAt AND duration > 0

### 9. Edge Cases & Error Handling

#### Test Case 9.1: Multiple Start Attempts
**Steps:**
1. Click start recording
2. Immediately click start again
3. Verify recording only starts once
4. Verify state is not duplicated

**Expected Result:**
- Only one recording session starts
- No state duplication

#### Test Case 9.2: Stop Without Starting
**Preconditions:**
- No recording started

**Steps:**
1. Attempt to stop recording (shouldn't be possible from UI)
2. If state is manually triggered, verify graceful handling

**Expected Result:**
- UI prevents this action
- No errors if state is manually corrupted

#### Test Case 9.3: Long Recording Duration
**Steps:**
1. Simulate 1+ hour recording
2. Set duration to 3661+ seconds
3. Verify timer displays correctly (HH:MM:SS format)
4. Verify no overflow or visual issues

**Expected Result:**
- Long durations format correctly
- No UI breaks or visual glitches

#### Test Case 9.4: Rapid Topic Selection
**Steps:**
1. Rapidly click different topics
2. Verify current topic tracking remains accurate
3. Verify auto-scroll handles rapid changes
4. Verify no performance degradation

**Expected Result:**
- UI remains responsive
- State stays consistent
- No visual glitches

#### Test Case 9.5: Recording + Teleprompter Switch
**Steps:**
1. Start recording
2. Verify timer is running
3. Open teleprompter
4. Verify recording continues (timer keeps running)
5. Navigate topics in teleprompter
6. Close teleprompter
7. Verify recording is still active
8. Verify current topic matches teleprompter navigation

**Expected Result:**
- Recording state preserved across teleprompter toggle
- Timer continues running
- Topic state syncs correctly

### 10. Browser Compatibility Tests

#### Test Case 10.1: Desktop Chrome
**Steps:**
1. Open application in Chrome (latest)
2. Run through all test cases 1-9
3. Verify no console errors
4. Verify all animations smooth

**Expected Result:**
- All features work correctly
- No console errors
- Smooth performance

#### Test Case 10.2: Desktop Firefox
**Steps:**
1. Open application in Firefox (latest)
2. Run subset of critical tests (2, 3, 4, 7)
3. Verify no compatibility issues

**Expected Result:**
- Core features work correctly
- No CSS/JS compatibility issues

#### Test Case 10.3: Safari
**Steps:**
1. Open application in Safari
2. Test timer formatting
3. Test animations
4. Verify no vendor-specific issues

**Expected Result:**
- Features work without Safari-specific issues

#### Test Case 10.4: Mobile Responsiveness
**Steps:**
1. Open on iPhone/iPad (iOS Safari)
2. Verify layout is readable
3. Verify buttons are touch-friendly
4. Verify timer is visible
5. Verify topics list scrolls properly

**Expected Result:**
- Layout adapts to mobile
- Controls are usable on touch devices
- No horizontal scrolling needed

## Test Execution Summary

### Quick Test Checklist
- [ ] Recording controls change state correctly
- [ ] Timer increments and formats properly
- [ ] Topics display and highlight correctly
- [ ] Topic completion updates progress bar
- [ ] Auto-scroll works when selecting topics
- [ ] Teleprompter opens/closes without errors
- [ ] Teleprompter navigation syncs with state
- [ ] Completion calculator returns correct status
- [ ] Auto-save persists to database
- [ ] No console errors during normal operation

### Known Good Test Paths
1. **Basic Recording Flow:**
   - Start → Wait 5s → Pause → Wait 2s → Resume → Wait 3s → Stop
   - Verify final duration is ~10s

2. **Topic Workflow:**
   - Create 3 topics in pauta
   - Start recording
   - Select topic 1 → Mark complete
   - Auto-advances to topic 2
   - Mark topic 2 complete
   - Progress shows 2/3
   - Mark topic 3 complete
   - Progress shows 3/3
   - Stop recording

3. **Teleprompter + Recording:**
   - Start recording
   - Open teleprompter
   - Navigate topics
   - Close teleprompter
   - Continue recording
   - Stop recording

## Performance Benchmarks

| Metric | Target | Actual |
|--------|--------|--------|
| Timer Update Frequency | 1 second | 1 second |
| Auto-scroll Latency | <200ms | TBD |
| Topic Selection Response | <100ms | TBD |
| Completion Calculation | <50ms | TBD |
| Auto-save Debounce | 2 seconds | 2 seconds |

## Regression Testing

After any changes to ProductionStage, run:
1. All timer tests (3.1-3.4)
2. All recording control tests (2.1-2.4)
3. Completion calculator tests (8.1-8.4)
4. State/Auto-save tests (7.1-7.2)

## Notes

- Timer accuracy depends on system clock - may vary by ±100ms
- Auto-save timing depends on network latency
- Topic count can vary - tests should work with any number
- Category field is optional - tests should handle missing categories
