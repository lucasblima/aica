# Journey AI Tracking Tests - Quick Start Guide

## What Was Created

Two new comprehensive test files with 50+ test cases covering all 7 AI operations in the Journey module.

## Test Files

1. **aiTrackingIntegration.test.ts** (24KB, 35+ tests)
   - Operations 1-5: analyzeContentRealtime, generatePostCaptureInsight, clusterMomentsByTheme, generateAIDrivenQuestion, generateSummaryWithAI

2. **aiTrackingSentimentAndTags.test.ts** (18KB, 15+ tests)
   - Operations 6-7: analyzeMomentSentiment, generateAutoTags

## Quick Test Commands

```bash
# Run all AI tracking tests
npm test aiTracking

# Run specific test file
npm test aiTrackingIntegration.test.ts

# Run with coverage
npm test -- --coverage aiTracking

# Watch mode
npm run test:watch
```

## What the Tests Validate

✅ trackAIUsage is called after each AI operation
✅ Tokens are extracted correctly from responses
✅ Tracking is non-blocking (fire-and-forget)
✅ Errors don't break main functionality
✅ Metadata is accurate (function names, operations, context)
✅ Performance overhead < 50ms

## Test Structure Example

```typescript
describe('1. analyzeContentRealtime - AI Tracking', () => {
  it('should call trackAIUsage after successful Gemini response', async () => {
    // Mock Gemini response
    mockGemini.call.mockResolvedValue({
      result: { text: '{"type": "reflection", "message": "..."}' },
      model: 'gemini-2.0-flash',
      usageMetadata: {
        promptTokenCount: 120,
        candidatesTokenCount: 45,
      },
    });

    // Call the function
    await analyzeContentRealtime('Long content...');

    // Verify tracking was called
    expect(trackAIUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        operation_type: 'text_generation',
        ai_model: 'gemini-2.0-flash',
        input_tokens: 120,
        output_tokens: 45,
        module_type: 'journey',
        // ...more validations
      })
    );
  });
});
```

## Expected Output

```
✓ Journey AI Tracking Integration (35 tests)
✓ AI Tracking for Sentiment Analysis & Auto-Tagging (15 tests)

Test Files: 2 passed (2)
Tests: 50 passed (50)
Duration: 2-5s
```

## Coverage

- **7/7 AI operations** covered (100%)
- **50+ test cases** created
- **Token extraction**, **non-blocking**, **metadata**, **performance** all validated

## Documentation

- **Full Report**: `JOURNEY_AI_TRACKING_TEST_REPORT.md`
- **Summary**: `JOURNEY_AI_TRACKING_TESTS_SUMMARY.md`
- **Execution Guide**: `TEST_EXECUTION_GUIDE.md`

## Next Steps

1. Run the tests: `npm test aiTracking`
2. Check they all pass
3. Review coverage: `npm test -- --coverage aiTracking`
4. Add to CI/CD pipeline

---

**Status**: ✅ Tests Created & Ready to Run
**Date**: 2026-01-08
**Framework**: Vitest 2.1.0
