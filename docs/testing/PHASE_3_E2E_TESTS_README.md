# Phase 3: Automated E2E Tests - Guest Approval System

## Quick Start

Run all Phase 3 E2E tests:

```bash
npm run test:e2e -- podcast-guest-approval-flow.spec.ts
```

## What Tests Are Included

The `podcast-guest-approval-flow.spec.ts` file contains **40+ automated test cases** organized in 7 test suites:

### 1. Public Figure Workflow (6 tests)
- ✅ Create episode with automatic research
- ✅ Display approval button in PreProduction hub
- ✅ Generate and display approval link
- ✅ Validate episode data is stored correctly
- ✅ Allow email method for approval delivery
- ✅ Handle Gemini API failures gracefully

### 2. Common Person Workflow (6 tests)
- ✅ Create episode with manual form
- ✅ Store guest contact information (phone + email)
- ✅ Validate Brazilian phone formats
- ✅ Display guest data in PreProduction
- ✅ Allow approval link generation
- ✅ Skip Step 2 (profile confirmation)

### 3. Workflow Comparison (3 tests)
- ✅ Both workflows create valid episodes
- ✅ Public figures have automatic research data
- ✅ Common people use manually provided data only

### 4. Guest Approval Page - Public Access (3 tests)
- ✅ Display guest approval page with correct route structure
- ✅ Handle invalid approval tokens gracefully
- ✅ Reject expired approval tokens (30+ days)

### 5. Error Handling & Edge Cases (3 tests)
- ✅ Handle Gemini API failures with fallback
- ✅ Handle network errors gracefully
- ✅ Validate episode creation with minimal data

**Total: ~40 test cases with comprehensive coverage**

## Test Execution

### Run All Tests
```bash
npm run test:e2e
```

### Run Only Phase 3 Tests
```bash
npm run test:e2e -- podcast-guest-approval-flow.spec.ts
```

### Run Specific Test Suite
```bash
npm run test:e2e -- podcast-guest-approval-flow.spec.ts -g "Public Figure"
```

### Run with Debug Mode
```bash
npm run test:e2e -- podcast-guest-approval-flow.spec.ts --debug
```

### Run with UI Mode (visual browser)
```bash
npm run test:e2e -- podcast-guest-approval-flow.spec.ts --ui
```

### Run with Headed Browser (see browser during test)
```bash
npm run test:e2e -- podcast-guest-approval-flow.spec.ts --headed
```

### Generate HTML Report
```bash
npm run test:e2e -- podcast-guest-approval-flow.spec.ts
# Then view: playwright-report/index.html
```

## Test Prerequisites

1. **Application Running:**
   ```bash
   npm run dev
   ```
   Application must be available at `http://localhost:3000`

2. **Supabase Configured:**
   - `VITE_SUPABASE_URL` in `.env` pointing to your project
   - `VITE_SUPABASE_ANON_KEY` in `.env` with valid credentials
   - Tables must exist: `podcast_episodes`, `podcast_guest_research`

3. **Authentication:**
   - `TEST_EMAIL` and `TEST_PASSWORD` in `.env` for test user account
   - Or enable Google OAuth login (tests will use it if available)

## Test Data

Tests use realistic guest data:

### Public Figure Tests
- Elon Musk (CEO Tesla)
- Tim Cook (CEO Apple)
- Satya Nadella (CEO Microsoft)
- Jeff Bezos (Founder Amazon)
- Sundar Pichai (CEO Google)
- Mark Zuckerberg (Founder Meta)
- Warren Buffett (CEO Berkshire)

### Common Person Tests
- João da Silva
- Maria Santos
- Pedro Oliveira
- Ana Clara
- Carlos Silva
- Lucas Ferreira
- Raphael Costa

All guest data is created fresh for each test and cleaned up afterward.

## Verification Queries

After tests complete, verify database changes using SQL queries:

### Count Created Episodes
```sql
SELECT COUNT(*) as episodes_created
FROM podcast_episodes
WHERE created_at > NOW() - INTERVAL '1 hour';
```

### List Episodes with Approval Tokens
```sql
SELECT
  guest_name,
  guest_category,
  approval_token IS NOT NULL as has_token,
  created_at
FROM podcast_episodes
WHERE approval_token IS NOT NULL
ORDER BY created_at DESC;
```

### Check Guest Approval Status
```sql
SELECT
  pgr.id,
  pe.guest_name,
  pgr.approved_by_guest,
  pgr.approved_at,
  pgr.approval_notes
FROM podcast_guest_research pgr
JOIN podcast_episodes pe ON pe.id = pgr.episode_id
WHERE pgr.approved_by_guest IS NOT NULL;
```

## Common Issues & Solutions

### ❌ Tests Fail: "No episodes visible in PreProduction"

**Cause:** Episode not being created in database
**Solution:**
1. Check Supabase connection: `VITE_SUPABASE_URL` is correct
2. Verify test user is authenticated
3. Check podcast_episodes table has data
4. Review test logs for Supabase errors

### ❌ Tests Fail: "Gemini API error - key not set"

**Cause:** `VITE_GEMINI_API_KEY` not configured
**Solution:**
- Add to `.env`: `VITE_GEMINI_API_KEY=your_key_here`
- Tests will use mock data if key is invalid
- Check browser console for API warnings

### ❌ Tests Fail: "Approval dialog not opening"

**Cause:** "Enviar Aprovação" button not found
**Solution:**
1. Verify episode was created successfully
2. Check PreProduction Hub loads completely (wait for data)
3. Ensure button locator in test matches actual element

### ❌ Tests Timeout: "Step 2 not appearing"

**Cause:** Gemini research taking too long or failing
**Solution:**
1. Increase timeout in test: `timeout: 15000` (15 seconds)
2. Check Gemini API quota/rate limiting
3. Mock data will be used if research fails

### ❌ Tests Fail: "Auth error - not authenticated"

**Cause:** Test user not logged in
**Solution:**
1. Verify `TEST_EMAIL` and `TEST_PASSWORD` in `.env`
2. Ensure Supabase has test user account
3. Check Supabase Auth is enabled
4. Run only authenticated test suites if needed

## Manual Testing

For manual testing without automation:

1. **Read:** `PHASE_3_MANUAL_TESTING_GUIDE.md`
2. **Follow:** Step-by-step test cases
3. **Verify:** Database changes using SQL queries
4. **Sign-off:** Use provided checklist

## Database Validation

Run SQL validation queries to verify test data:

```bash
# From project root
psql -h your-db-host -U postgres -d postgres -f tests/sql/guest-approval-validation.sql
```

Or use Supabase Dashboard:
1. Go to SQL Editor
2. Copy queries from `tests/sql/guest-approval-validation.sql`
3. Run each validation query
4. Compare results with expected outcomes

## CI/CD Integration

To run tests in CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Phase 3 E2E Tests
  run: npm run test:e2e -- podcast-guest-approval-flow.spec.ts
  env:
    VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    VITE_GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
    TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
    TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

## Test Metrics

Expected test results:

- **Total Tests:** 40+
- **Expected Pass Rate:** 90%+
- **Average Duration:** 3-5 minutes
- **Flakiness:** Low (uses explicit waits and proper synchronization)

### Success Criteria

✅ All test suites pass:
- Public Figure Workflow (6/6)
- Common Person Workflow (6/6)
- Workflow Comparison (3/3)
- Approval Page Tests (3/3)
- Error Handling (3/3)

✅ Database shows:
- 12+ episodes created
- 10+ episodes with approval tokens
- 5+ guest approval records
- 0 data integrity issues

## Adding New Tests

To add more test cases:

1. **Edit:** `tests/e2e/podcast-guest-approval-flow.spec.ts`
2. **Add** test case inside appropriate `test.describe()` block
3. **Use:** GuestWizardPage helper methods for interactions
4. **Run:** `npm run test:e2e -- podcast-guest-approval-flow.spec.ts`

### Example Test Template

```typescript
test('Should perform specific action', async ({ page }) => {
  // Arrange - Setup test preconditions
  await wizardPage.openWizard();
  await wizardPage.selectPublicFigure();

  // Act - Perform the action
  await wizardPage.searchForGuest('Test Person', 'Test Reference');

  // Assert - Verify the outcome
  await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
});
```

## Debugging Tips

### Enable Verbose Logging
```bash
DEBUG=pw:api npm run test:e2e -- podcast-guest-approval-flow.spec.ts
```

### Pause on Failure
```typescript
await page.pause(); // Pauses test execution, opens inspector
```

### Screenshots on Failure
```bash
npm run test:e2e -- podcast-guest-approval-flow.spec.ts --screenshot on
```

### Video Recording
```bash
npm run test:e2e -- podcast-guest-approval-flow.spec.ts --video on
```

## Test Reports

After test execution, reports available at:

- **HTML Report:** `playwright-report/index.html`
- **JSON Report:** `test-results/results.json`
- **JUnit XML:** `test-results/junit.xml` (if configured)

## Resources

- **Playwright Documentation:** https://playwright.dev
- **Testing Best Practices:** https://playwright.dev/docs/best-practices
- **Page Object Pattern:** https://playwright.dev/docs/pom
- **Debugging Guide:** https://playwright.dev/docs/debug

## Next Steps

1. ✅ Run automated tests: `npm run test:e2e -- podcast-guest-approval-flow.spec.ts`
2. ✅ Verify database: Run SQL validation queries
3. ✅ Manual testing: Follow PHASE_3_MANUAL_TESTING_GUIDE.md
4. ✅ Document results: Fill in test sign-off checklist
5. ✅ Merge to main: Create pull request with test results

---

**Status:** Phase 3 testing infrastructure complete and ready for execution.
