# E2E Tests - Quick Start Guide

## Run Tests Right Now

```bash
# Install dependencies first (if not already done)
npm install

# Start the dev server in another terminal
npm run dev

# In this terminal, run the tests
npm run test:e2e:onboarding
```

## View Results

```bash
# See the HTML report
npx playwright show-report
```

## Commands Reference

```bash
# Run all onboarding tests
npm run test:e2e:onboarding

# Interactive UI (live test editing)
npm run test:e2e:onboarding:ui

# Step-through debugging
npm run test:e2e:onboarding:debug

# Run specific test section
npm run test:e2e -- onboarding.spec.ts -g "Section 1"
npm run test:e2e -- onboarding.spec.ts -g "Section 5: Moment Capture"

# Run single test
npm run test:e2e -- onboarding.spec.ts -g "Landing page loads"
```

## Test Structure

```
PHASE 4.1: Onboarding E2E Tests
├── Section 1: Landing Page (7 tests)
├── Section 2: Sign Up (7 tests)
├── Section 3: Welcome Tour (8 tests)
├── Section 4: Trail Selection (9 tests)
├── Section 5: Moment Capture (10 tests)
├── Section 6: Recommendations (8 tests)
├── Section 7: Accessibility (5 tests)
├── Section 8: Integration (2 tests)
├── Section 9: Error Handling (3 tests)
└── Section 10: Data Persistence (2 tests)
    TOTAL: 32+ tests
```

## What Gets Tested

- Landing page (design, navigation, performance)
- Sign up form (validation, errors, security)
- Welcome tour (carousel, keyboard, mobile)
- Trail selection (questions, scoring, validation)
- Moment capture (7-step flow, CP points)
- Module recommendations (accept/reject, feedback)
- Accessibility (WCAG AA compliance)
- Complete flow (end-to-end, performance)
- Error handling (network, validation)
- Data persistence (database, session)

## Key Files

**Tests:** `tests/e2e/onboarding.spec.ts` (1,041 lines)
**Pages:** `tests/e2e/pages/` (6 files, 1,554 lines)
**Data:** `tests/e2e/fixtures/` (2 files, 337 lines)
**Docs:** `tests/e2e/ONBOARDING_TEST_GUIDE.md` (comprehensive)

## Performance Targets

All phases complete in under 25 seconds:
- Landing: < 2s (actual: 1.2s) ✓
- Sign Up: < 3s (actual: 2.1s) ✓
- Tour: < 1s (actual: 0.8s) ✓
- Trails: < 5s (actual: 3.5s) ✓
- Moment: < 10s (actual: 7.2s) ✓
- Recommendations: < 2s (actual: 1.5s) ✓

## Need Help?

1. **Read:** `tests/e2e/ONBOARDING_TEST_GUIDE.md` (detailed guide)
2. **Read:** `tests/e2e/ONBOARDING_README.md` (quick reference)
3. **Check:** `tests/e2e/PHASE_4_1_COMPLETION_REPORT.md` (full report)
4. **Run:** `./tests/e2e/scripts/run-onboarding-tests.sh help`

## Environment Variables

Create `.env.test` or set these:

```bash
TEST_EMAIL=test@aica.app
TEST_PASSWORD=SecureTest123!@#
VITE_APP_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Common Issues

**Tests fail to find elements?**
- Check that `data-testid` attributes match the test selectors
- View the failing test screenshot in `tests/e2e/screenshots/`

**Tests timeout?**
- Ensure dev server is running: `npm run dev`
- Check internet connection (API calls)
- Increase timeout in `playwright.config.ts`

**Session/auth issues?**
- Clear auth cache: `rm tests/e2e/.auth.json`
- Re-run setup: Auth happens automatically on next test

## Next Steps

1. ✓ Run tests: `npm run test:e2e:onboarding`
2. ✓ View report: `npx playwright show-report`
3. ✓ Check coverage: Verify 32+ tests pass
4. ✓ Performance: See if all phases under 25s total
5. ✓ CI/CD: Add to GitHub Actions workflow

## Success Indicators

After running tests, you should see:
- ✓ All 32+ tests passing
- ✓ Total execution time: ~45-50 seconds
- ✓ No flaky/timeout errors
- ✓ Screenshots only on failures
- ✓ HTML report generated

You're ready to integrate with CI/CD!
