# Test Execution Guide - Journey AI Tracking

## Quick Start

Run all Journey AI tracking tests:
```bash
npm test aiTracking
```

## Individual Test Files

### 1. Core AI Tracking Integration
Tests for 5 main AI operations (analyzeContentRealtime, generatePostCaptureInsight, clusterMomentsByTheme, generateAIDrivenQuestion, generateSummaryWithAI):

```bash
npm test aiTrackingIntegration.test.ts
```

### 2. Sentiment & Auto-Tagging
Tests for internal AI helpers (analyzeMomentSentiment, generateAutoTags):

```bash
npm test aiTrackingSentimentAndTags.test.ts
```

### 3. Existing Tests
```bash
# Previously created tests
npm test aiAnalysisService.test.ts
npm test weeklySummaryService.test.ts
```

## Watch Mode (Interactive)

```bash
npm run test:watch
# Then press 'p' and type: aiTracking
```

## Coverage Report

```bash
npm test -- --coverage aiTracking
```

## Run All Journey Tests

```bash
npm test -- src/modules/journey/services/__tests__
```

## Debugging Failed Tests

If tests fail:

1. Check mocks are properly configured
2. Verify import paths
3. Check Vitest version compatibility
4. Run with verbose output:
```bash
npm test aiTracking -- --reporter=verbose
```

## Expected Output

```
✓ Journey AI Tracking Integration (35 tests)
  ✓ 1. analyzeContentRealtime - AI Tracking
  ✓ 2. generatePostCaptureInsight - AI Tracking  
  ✓ 3. clusterMomentsByTheme - AI Tracking
  ✓ 4. generateAIDrivenQuestion - AI Tracking
  ✓ 5. generateSummaryWithAI - AI Tracking
  ✓ Performance & Non-Blocking Behavior
  ✓ Token Extraction Edge Cases
  ✓ Model Name Validation
  ✓ Metadata Accuracy

✓ AI Tracking for Sentiment Analysis & Auto-Tagging (15 tests)
  ✓ 6. analyzeMomentSentiment - AI Tracking
  ✓ 7. generateAutoTags - AI Tracking
  ✓ Combined Operations: Full Moment Creation Flow
  ✓ Error Recovery & Fallbacks

Test Files: 2 passed (2)
Tests: 50 passed (50)
Duration: 2-5s
```

## Troubleshooting

### "Module not found" errors
```bash
npm install
npm run typecheck
```

### "Cannot find name 'vi'" errors
```bash
# Check vitest is installed
npm list vitest

# Should show vitest@2.1.0 or later
```

### Tests hanging
```bash
# Kill hanging processes
taskkill /F /IM node.exe

# Re-run with timeout
npm test aiTracking -- --testTimeout=10000
```

## CI/CD Integration

Add to GitHub Actions workflow:
```yaml
- name: Run Journey AI Tracking Tests
  run: npm test -- aiTracking --coverage
```

---

**Quick Reference**: `npm test aiTracking`
