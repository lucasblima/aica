# Running Gemini E2E Tests - Quick Start

Step-by-step guide to run the Gemini integration tests.

## Prerequisites

### 1. Install Dependencies

```bash
npm install
npx playwright install
```

### 2. Setup Environment

Create `.env` file in project root:

```bash
# Test credentials
TEST_EMAIL=your_test_email@example.com
TEST_PASSWORD=your_test_password

# Supabase
VITE_SUPABASE_URL=https://uzywajqzbdbrfammshdg.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Python API (for heavy operations)
VITE_LLM_API_URL=http://localhost:8001
```

### 3. Start Servers

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Python API (if testing heavy operations):**
```bash
cd scripts
python aica_api_server.py
```

### 4. Authenticate (First Time Only)

```bash
npx playwright test auth.setup.ts --headed
```

Complete the Google OAuth flow in the browser (you have 120 seconds).

## Running Tests

### Quick Commands

```bash
# All Gemini tests (recommended first run)
npm run test:e2e tests/e2e/podcast-gemini-integration.spec.ts tests/e2e/finance-gemini-integration.spec.ts tests/e2e/memory-gemini-integration.spec.ts tests/e2e/atlas-categorization.spec.ts tests/e2e/gemini-security-performance.spec.ts

# Shorter version
npx playwright test podcast-gemini finance-gemini memory-gemini atlas-categorization gemini-security
```

### By Module

#### Podcast Module (10 tests)

```bash
npx playwright test podcast-gemini-integration.spec.ts
```

**Tests:**
- Suggest trending guest
- Suggest episode theme
- Generate complete dossier
- Analyze news
- Generate ice breakers
- Chat with Aica
- API key protection
- Error handling
- Loading states
- Cache validation

#### Finance Module (12 tests)

```bash
npx playwright test finance-gemini-integration.spec.ts
```

**Tests:**
- PDF upload and processing
- PII sanitization (CPF/CNPJ detection)
- Finance Agent chat
- Context maintenance
- Spending analysis
- Next month prediction
- Savings suggestions
- Anomaly detection
- API key protection
- Authentication requirements

#### Memory Module (15 tests)

```bash
npx playwright test memory-gemini-integration.spec.ts
```

**Tests:**
- Extract insights (sentiment, triggers, subjects)
- Identify psychological triggers
- Categorize by life subjects
- Generate summaries
- Assign importance scores
- Semantic search
- Rank by similarity
- Daily report generation
- Key insights
- Pattern detection
- AI recommendations
- Contact context extraction
- Conversation starters
- Work item extraction

#### Atlas Module (10 tests)

```bash
npx playwright test atlas-categorization.spec.ts
```

**Tests:**
- Auto-categorization while typing
- Different contexts (work, health, finance, education, personal)
- Accept suggested category
- Reject and manual selection
- Debouncing (avoid excessive API calls)
- No API calls for short text
- Loading states
- Error handling
- Task creation with auto-category
- Performance (< 5s)

#### Security Tests (10 tests - CRITICAL)

```bash
npx playwright test gemini-security-performance.spec.ts --grep "Security"
```

**Tests:**
- API key never in network traffic
- API key never in localStorage
- API key never in cookies
- API key never in source code
- All requests routed through backend
- JWT authentication required
- JWT signature validation
- PII sanitization (Finance)
- Rate limiting

#### Performance Tests (5 tests)

```bash
npx playwright test gemini-security-performance.spec.ts --grep "Performance"
```

**Tests:**
- Edge Functions respond < 10s
- Concurrent requests don't block
- Cache improves response time
- Python server handles long operations
- Retry mechanism works
- No memory leaks

## Debugging

### Visual Mode (See Browser)

```bash
npx playwright test podcast-gemini-integration.spec.ts --headed
```

### Slow Motion

```bash
npx playwright test podcast-gemini-integration.spec.ts --headed --slow-mo=1000
```

### Interactive UI Mode

```bash
npm run test:e2e:ui
```

Then select the test file you want to run.

### Debug Mode (Step-by-Step)

```bash
npx playwright test podcast-gemini-integration.spec.ts --debug
```

Use the Playwright Inspector to step through the test.

### Run Single Test

```bash
# By test name
npx playwright test -g "should suggest trending guest"

# By test file and name
npx playwright test podcast-gemini-integration.spec.ts -g "dossier"
```

## Viewing Results

### HTML Report

```bash
npx playwright show-report
```

Opens an interactive HTML report with:
- Test results (pass/fail)
- Screenshots on failure
- Videos on failure
- Network logs
- Console logs

### Live Results (During Test Run)

```bash
npx playwright test --reporter=line
```

Shows test progress in real-time.

### JSON Report (for CI/CD)

```bash
npx playwright test --reporter=json > test-results.json
```

## Common Scenarios

### Scenario 1: First Time Setup

```bash
# 1. Install
npm install
npx playwright install

# 2. Configure .env
cp .env.example .env
# Edit .env with your credentials

# 3. Start servers
npm run dev  # Terminal 1
python scripts/aica_api_server.py  # Terminal 2 (if needed)

# 4. Authenticate
npx playwright test auth.setup.ts --headed

# 5. Run all Gemini tests
npx playwright test podcast-gemini finance-gemini memory-gemini atlas-categorization gemini-security

# 6. View report
npx playwright show-report
```

### Scenario 2: Quick Smoke Test

Test the most critical features quickly:

```bash
# Security only (CRITICAL)
npx playwright test gemini-security-performance --grep "Security"

# One test from each module
npx playwright test -g "should suggest trending guest"
npx playwright test -g "should send message and receive contextualized response"
npx playwright test -g "should extract insights from new message"
npx playwright test -g "should suggest category while typing"
```

### Scenario 3: Debugging Failed Test

```bash
# 1. Run in debug mode
npx playwright test podcast-gemini-integration.spec.ts -g "should suggest trending guest" --debug

# 2. If still failing, run in headed mode with slow motion
npx playwright test podcast-gemini-integration.spec.ts -g "should suggest trending guest" --headed --slow-mo=1000

# 3. Check the HTML report
npx playwright show-report

# 4. Look at screenshots/videos in test-results/
```

### Scenario 4: CI/CD Pipeline

```bash
# Run all tests headless with retries
npx playwright test --reporter=html,json

# Check exit code
echo $?  # Should be 0 if all passed

# Upload artifacts
# - playwright-report/ (HTML report)
# - test-results/ (screenshots, videos)
```

## Expected Output

### Successful Run

```
Running 62 tests using 2 workers

  ✓ [chromium] › podcast-gemini-integration.spec.ts:18:3 › should suggest trending guest (3.2s)
  ✓ [chromium] › podcast-gemini-integration.spec.ts:35:3 › should suggest episode theme (2.8s)
  ✓ [chromium] › podcast-gemini-integration.spec.ts:52:3 › should generate complete dossier (8.1s)
  ...
  ✓ [chromium] › gemini-security-performance.spec.ts:145:3 › should NOT expose API key (1.2s)

  62 passed (3.5m)
```

### Failed Test Example

```
  1) [chromium] › podcast-gemini-integration.spec.ts:18:3 › should suggest trending guest

    Error: Timeout 15000ms exceeded.
    waiting for locator('[data-testid="guest-suggestion"]') to be visible

      at podcast-gemini-integration.spec.ts:25

  Attachments:
    - screenshot.png
    - video.webm
    - trace.zip
```

## Troubleshooting

### Issue: Authentication Failed

**Error:** "Not authenticated" or "401 Unauthorized"

**Solution:**
```bash
# Re-run authentication
npx playwright test auth.setup.ts --headed

# Verify .auth.json was created
ls -l tests/e2e/.auth.json
```

### Issue: Timeout Waiting for Gemini Response

**Error:** "Timeout 15000ms exceeded"

**Solution:**
1. Check backend is running (Edge Functions or Python server)
2. Check network connectivity
3. Increase timeout:
   ```typescript
   await expect(element).toBeVisible({ timeout: 30000 });
   ```

### Issue: API Key Exposed (CRITICAL)

**Error:** Security test fails with "API key found in network traffic"

**Solution:**
1. STOP IMMEDIATELY - this is a critical security issue
2. Check GeminiClient routing
3. Verify no direct imports of `@google/generative-ai` in frontend
4. Review network logs in test report

### Issue: Tests Are Flaky

**Error:** Tests sometimes pass, sometimes fail

**Solution:**
1. Avoid `waitForTimeout()`, use proper waits
2. Add retries in `playwright.config.ts`:
   ```typescript
   retries: 2
   ```
3. Check for race conditions
4. Use `test.fail()` for known flaky tests

## Performance Benchmarks

Expected response times (average):

| Operation | Max | Typical | Status |
|-----------|-----|---------|--------|
| Suggest Guest | 10s | 3s | ✅ |
| Generate Dossier | 30s | 8s | ✅ |
| Finance Chat | 10s | 4s | ✅ |
| PDF Processing | 60s | 25s | ✅ |
| Auto-Categorize | 5s | 2s | ✅ |
| Extract Insights | 10s | 3s | ✅ |

If tests consistently exceed these times, investigate backend performance.

## Next Steps After Tests Pass

1. Review HTML report: `npx playwright show-report`
2. Check for any warnings in console logs
3. Validate manually in browser
4. Run production build test:
   ```bash
   npm run build
   npm run preview
   npx playwright test --config=playwright.config.prod.ts
   ```
5. Deploy to staging
6. Run tests against staging environment
7. Deploy to production

## Getting Help

If tests fail or you need help:

1. Check the [Full Testing Guide](../docs/GEMINI_E2E_TESTS.md)
2. Review the HTML report: `npx playwright show-report`
3. Check screenshots/videos in `test-results/`
4. Look for console.log output in tests
5. Run in debug mode: `--debug`
6. Ask in #testing Slack channel

## Summary of Files

Tests created:
- `tests/e2e/podcast-gemini-integration.spec.ts` (10 tests)
- `tests/e2e/finance-gemini-integration.spec.ts` (12 tests)
- `tests/e2e/memory-gemini-integration.spec.ts` (15 tests)
- `tests/e2e/atlas-categorization.spec.ts` (10 tests)
- `tests/e2e/gemini-security-performance.spec.ts` (15 tests)

Documentation:
- `docs/GEMINI_E2E_TESTS.md` - Full testing guide
- `tests/GEMINI_MIGRATION_VALIDATION.md` - Validation checklist
- `tests/RUN_GEMINI_TESTS.md` - This file
- `tests/e2e/README.md` - Updated with Gemini tests
- `tests/fixtures/README.md` - Test data guide

Fixtures:
- `tests/fixtures/mock-whatsapp-messages.json`
- `tests/fixtures/test-tasks.json`

**Total:** 62 tests validating the complete Gemini migration
