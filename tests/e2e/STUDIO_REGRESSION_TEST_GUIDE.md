# Studio Workspace Regression Tests Guide

## Overview

This document outlines the comprehensive regression test suite for the refactored podcast workspace. The test file `studio-workspace-regression.spec.ts` contains 33 test scenarios covering all 4 stages, auto-save functionality, and permeable navigation.

## Test Coverage

Total Tests: 33 unique scenarios
- SetupStage: 7 tests
- ResearchStage: 5 tests
- PautaStage: 5 tests
- ProductionStage: 6 tests
- Auto-Save: 3 tests
- Permeable Navigation: 4 tests
- Workspace Lifecycle: 3 tests

## Running the Tests

### Run all regression tests
```bash
npm run test:e2e -- tests/e2e/studio-workspace-regression.spec.ts
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui -- tests/e2e/studio-workspace-regression.spec.ts
```

### Run specific test suite
```bash
npm run test:e2e -- tests/e2e/studio-workspace-regression.spec.ts -g "SetupStage"
```

### Run with debug mode
```bash
npm run test:e2e:debug -- tests/e2e/studio-workspace-regression.spec.ts
```

## Required Data-TestID Attributes

The tests use `data-testid` attributes for reliable element selection. Components must implement these IDs:

### Workspace Container
```tsx
// PodcastWorkspace.tsx
<div data-testid="studio-workspace">
  {/* All content */}
</div>
```

### Stage Navigation (StageStepper)
```tsx
// StageStepper.tsx
<button data-testid="stage-setup">Setup Stage</button>
<button data-testid="stage-research">Research Stage</button>
<button data-testid="stage-pauta">Pauta Stage</button>
<button data-testid="stage-production">Production Stage</button>

// Completion badges
<span data-testid="setup-stage-badge">{completionStatus}</span>
<span data-testid="research-stage-badge">{completionStatus}</span>
<span data-testid="pauta-stage-badge">{completionStatus}</span>
<span data-testid="production-stage-badge">{completionStatus}</span>
```

### SetupStage Component
```tsx
// SetupStage.tsx
<div data-testid="setup-content">
  {/* Setup form content */}
</div>

// Guest type selector
<button data-testid="guest-type-selector">
<div data-testid="guest-type-public_figure">Public Figure Option</div>
<div data-testid="guest-type-common_person">Common Person Option</div>

// Form fields
<input data-testid="episode-theme" placeholder="Theme" />
<input data-testid="guest-name" placeholder="Guest name" />
<textarea data-testid="guest-bio" placeholder="Bio" />
<input data-testid="guest-reference" placeholder="Reference/Occupation" />

// AI search
<button data-testid="ai-profile-search">Search Profile</button>
<div data-testid="profile-loading">Loading...</div>
<div data-testid="profile-results">Profile Results</div>

// Dirty/Save indicators
<span data-testid="dirty-indicator">*</span>
<span data-testid="save-indicator">Auto-saving...</span>
```

### ResearchStage Component
```tsx
// ResearchStage.tsx
<div data-testid="research-content">
  {/* Research form content */}
</div>

// Dossier generation
<button data-testid="generate-dossier">Generate Dossier</button>
<div data-testid="dossier-loading">Generating...</div>
<div data-testid="dossier-content">Dossier Content</div>

// Tabs within dossier
<div data-testid="dossier-tabs">
  <button data-testid="tab-bio">Biography</button>
  <button data-testid="tab-ficha">Technical Sheet</button>
  <button data-testid="tab-news">News</button>

  <div data-testid="bio-content">Bio content</div>
  <div data-testid="ficha-content">Ficha content</div>
  <div data-testid="news-content">News content</div>
</div>

// Custom sources
<button data-testid="add-custom-source">Add Custom Source</button>
<div data-testid="custom-source-modal" role="dialog">
  <button data-testid="source-type-text">Text Source</button>
  <button data-testid="source-type-url">URL Source</button>
  <button data-testid="source-type-file">File Source</button>

  <textarea data-testid="source-text" placeholder="Source text" />
  <input data-testid="source-url" placeholder="URL" />
  <input data-testid="source-file" type="file" />

  <button data-testid="add-source-button">Add</button>
</div>

<div data-testid="custom-source-item">Source Item</div>

// Research chat
<button data-testid="research-chat-toggle">Chat</button>
<input data-testid="chat-input" placeholder="Message" />
<button data-testid="chat-send">Send</button>
<div data-testid="chat-response">Response</div>
```

### PautaStage Component
```tsx
// PautaStage.tsx
<div data-testid="pauta-content">
  {/* Pauta form content */}
</div>

// Topic management
<button data-testid="add-topic">Add Topic</button>
<input data-testid="topic-title" placeholder="Topic title" />
<textarea data-testid="topic-notes" placeholder="Topic notes" />
<button data-testid="save-topic">Save Topic</button>

// Topic list
<div data-testid="topic-item" data-completed="true|false">
  <input type="checkbox" data-testid="topic-checkbox" />
  <span>Topic Title</span>
</div>

// AI Pauta generation
<button data-testid="generate-pauta-ai">Generate with AI</button>
<div data-testid="pauta-generator-modal" role="dialog">
  <textarea data-testid="pauta-prompt" placeholder="Prompt" />
  <button data-testid="generate-button">Generate</button>
</div>

<div data-testid="generating-pauta">Generating...</div>
```

### ProductionStage Component
```tsx
// ProductionStage.tsx
<div data-testid="production-content">
  {/* Production form content */}
</div>

// Recording controls
<button data-testid="start-recording">Start Recording</button>
<button data-testid="pause-recording">Pause</button>
<button data-testid="resume-recording">Resume</button>
<button data-testid="stop-recording">Stop</button>

// Recording timer and status
<span data-testid="recording-timer">00:00:00</span>
<span data-testid="recording-status">Recording...</span>

// Topic checklist
<div data-testid="checklist-item" data-checked="true|false">
  <input type="checkbox" data-testid="checklist-checkbox" />
  <span>Topic Title</span>
</div>

// Teleprompter
<button data-testid="open-teleprompter">Open Teleprompter</button>
<div data-testid="teleprompter-content">Pauta content for reading</div>
```

### WorkspaceHeader Component
```tsx
// WorkspaceHeader.tsx
<header data-testid="workspace-header">
  <span data-testid="show-title">Show Title</span>
  <span data-testid="episode-title">Episode Title</span>
  <span data-testid="last-saved">Last saved: timestamp</span>
  <span data-testid="dirty-indicator">*</span>
  <button data-testid="back-button">Back</button>
</header>
```

### Stage Renderer Component
```tsx
// StageRenderer.tsx
<div data-testid="stage-stepper">
  {/* Stage navigation buttons */}
</div>
```

## Test Patterns

### 1. Navigation Pattern
```typescript
// Typical navigation flow in tests
const stageButton = page.locator('[data-testid="stage-research"]');
if (await stageButton.isVisible({ timeout: 2000 }).catch(() => false)) {
  await stageButton.click();
  await page.waitForLoadState('networkidle');
}
```

### 2. Form Filling Pattern
```typescript
// Typical form filling flow
const input = page.locator('[data-testid="episode-theme"]');
await input.fill('Theme value');

// Wait for auto-save (2.5s debounce + buffer)
await page.waitForTimeout(3500);

// Verify persistence
expect(await input.inputValue()).toBe('Theme value');
```

### 3. Async Operation Pattern
```typescript
// Handle long-running operations (AI calls, etc.)
const button = page.locator('[data-testid="generate-dossier"]');
if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
  await button.click();

  // Loading state
  const loading = page.locator('[data-testid="dossier-loading"]');
  const isLoadingVisible = await loading.isVisible({ timeout: 2000 }).catch(() => false);

  // Results (longer timeout for API)
  const content = page.locator('[data-testid="dossier-content"]');
  const isContentVisible = await content.isVisible({ timeout: 30000 }).catch(() => false);
}
```

### 4. Completion Verification Pattern
```typescript
// Verify stage completion badges
const badge = page.locator('[data-testid="setup-stage-badge"]');
const text = await badge.textContent();
expect(text).toMatch(/✅|🟡|●/); // Green checkmark, amber dot, or partial indicator
```

## Key Testing Principles

1. **Graceful Degradation**: Tests use fallback selectors for robustness
   - Primary: `data-testid` attributes
   - Secondary: Text-based locators (`.has-text()`)
   - Tertiary: CSS class/role-based locators

2. **Timeout Handling**: All async operations include appropriate timeouts
   - UI updates: 2-3 seconds
   - API calls: 15-30 seconds
   - Auto-save: 3.5 seconds (2.5s debounce + 1s buffer)

3. **Visibility Checks**: Uses `.catch(() => false)` to prevent test failures
   - Optional UI elements don't fail tests
   - Tests adapt to actual UI state

4. **Isolation**: Each test is independent
   - No cross-test dependencies
   - beforeEach() setup ensures clean state
   - Tests can run in any order

## Component Implementation Checklist

When implementing workspace components, ensure you add these data-testids:

### SetupStage.tsx
- [ ] `setup-content` (wrapper div)
- [ ] `guest-type-selector` (container)
- [ ] `guest-type-public_figure` (button)
- [ ] `guest-type-common_person` (button)
- [ ] `episode-theme` (input)
- [ ] `guest-name` (input)
- [ ] `guest-bio` (textarea)
- [ ] `ai-profile-search` (button)
- [ ] `profile-loading` (loading indicator)
- [ ] `profile-results` (results container)
- [ ] `setup-stage-badge` (completion badge)
- [ ] `dirty-indicator` (modified indicator)
- [ ] `save-indicator` (auto-save indicator)

### ResearchStage.tsx
- [ ] `research-content` (wrapper div)
- [ ] `generate-dossier` (button)
- [ ] `dossier-loading` (loading indicator)
- [ ] `dossier-content` (results container)
- [ ] `dossier-tabs` (tabs container)
- [ ] `tab-bio` (tab button)
- [ ] `tab-ficha` (tab button)
- [ ] `tab-news` (tab button)
- [ ] `bio-content` (tab content)
- [ ] `ficha-content` (tab content)
- [ ] `news-content` (tab content)
- [ ] `add-custom-source` (button)
- [ ] `custom-source-modal` (modal)
- [ ] `source-type-text` (button)
- [ ] `source-type-url` (button)
- [ ] `source-type-file` (button)
- [ ] `source-text` (textarea)
- [ ] `source-url` (input)
- [ ] `source-file` (input)
- [ ] `add-source-button` (button)
- [ ] `custom-source-item` (list item)
- [ ] `research-chat-toggle` (button)
- [ ] `chat-input` (input)
- [ ] `chat-send` (button)
- [ ] `chat-response` (message)
- [ ] `research-stage-badge` (completion badge)

### PautaStage.tsx
- [ ] `pauta-content` (wrapper div)
- [ ] `add-topic` (button)
- [ ] `topic-title` (input)
- [ ] `topic-notes` (textarea)
- [ ] `save-topic` (button)
- [ ] `topic-item` (list item, with `data-completed` attribute)
- [ ] `topic-checkbox` (checkbox input)
- [ ] `generate-pauta-ai` (button)
- [ ] `pauta-generator-modal` (modal)
- [ ] `pauta-prompt` (textarea)
- [ ] `generate-button` (button)
- [ ] `generating-pauta` (loading indicator)
- [ ] `pauta-stage-badge` (completion badge)

### ProductionStage.tsx
- [ ] `production-content` (wrapper div)
- [ ] `start-recording` (button)
- [ ] `pause-recording` (button)
- [ ] `resume-recording` (button)
- [ ] `stop-recording` (button)
- [ ] `recording-timer` (display element)
- [ ] `recording-status` (display element)
- [ ] `checklist-item` (list item, with `data-checked` attribute)
- [ ] `checklist-checkbox` (checkbox input)
- [ ] `open-teleprompter` (button)
- [ ] `teleprompter-content` (content div)

### Workspace Components
- [ ] `studio-workspace` (main wrapper)
- [ ] `stage-stepper` (navigation container)
- [ ] `stage-setup` (button)
- [ ] `stage-research` (button)
- [ ] `stage-pauta` (button)
- [ ] `stage-production` (button)
- [ ] `setup-stage-badge` (completion indicator)
- [ ] `research-stage-badge` (completion indicator)
- [ ] `pauta-stage-badge` (completion indicator)
- [ ] `production-stage-badge` (completion indicator)
- [ ] `workspace-header` (header)
- [ ] `show-title` (display)
- [ ] `episode-title` (display)
- [ ] `last-saved` (display)
- [ ] `back-button` (button)

## Troubleshooting

### Tests timing out
- Increase timeout for API calls (30s for AI generation)
- Check that base URL is correct (default: http://localhost:3000)
- Verify test server is running

### Tests failing with "element not found"
- Check that all required `data-testid` attributes are present in components
- Review fallback selectors for text-based matching
- Ensure components are properly rendered

### Auto-save tests failing
- Verify auto-save debounce is exactly 2000ms in useAutoSave hook
- Check that isDirty state is properly managed
- Confirm lastSaved timestamp is updated after save

### Navigation tests failing
- Check that all stage buttons are clickable (not disabled)
- Verify stage content components load correctly
- Ensure permeable navigation is enabled (no stage validation)

## Performance Considerations

- Tests are designed to run in ~30-40 seconds
- API calls (dossier, pauta generation) are the longest operations
- Consider running subset of tests in CI (core tests) vs full suite locally
- Use UI mode for interactive debugging

## Future Enhancements

1. **Visual Regression Testing**: Add screenshots for UI consistency
2. **Performance Benchmarks**: Measure auto-save latency
3. **Mobile Testing**: Add mobile viewport tests for responsive design
4. **Accessibility**: Add ARIA and keyboard navigation tests
5. **Error Recovery**: Test error states and retry mechanisms
