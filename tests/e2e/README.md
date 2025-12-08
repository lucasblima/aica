# Playwright E2E Tests

Comprehensive end-to-end test suite for Aica Life OS using Playwright.

## Overview

- **80+ automated tests** across 15+ test suites
- **Global authentication** via Google OAuth (manual once, then cached)
- **Chromium & Firefox** support
- **HTML reporting** with screenshots on failure
- **Comprehensive Gemini integration tests** (58 tests)

## Test Suites

### Core Functionality

| Suite | Tests | Purpose |
|-------|-------|---------|
| `auth.spec.ts` | 4 | Authentication & user profile management |
| `task-management.spec.ts` | 7 | CRUD operations & drag-drop functionality |
| `gamification.spec.ts` | 5 | XP, leveling, achievements, streaks |
| `security.spec.ts` | 10 | Security, privacy, GDPR, HTTPS, XSS |

### Podcast Module

| Suite | Tests | Purpose |
|-------|-------|---------|
| `podcast.spec.ts` | 5 | Basic podcast workflow |
| `podcast-wizard.spec.ts` | 6 | Episode creation wizard |
| `podcast-preproduction.spec.ts` | 8 | Pre-production features |
| `podcast-production.spec.ts` | 7 | Recording mode |
| `podcast-postproduction.spec.ts` | 6 | Editing and publishing |
| `podcast-full-workflow.spec.ts` | 5 | End-to-end workflow |
| **`podcast-gemini-integration.spec.ts`** | **10** | **AI-powered features** |

### Gemini Integration (NEW)

| Suite | Tests | Purpose |
|-------|-------|---------|
| **`podcast-gemini-integration.spec.ts`** | **10** | Guest/theme suggestion, dossier generation, chat |
| **`finance-gemini-integration.spec.ts`** | **12** | PDF processing, PII sanitization, agent chat |
| **`memory-gemini-integration.spec.ts`** | **15** | Insights extraction, semantic search, daily reports |
| **`atlas-categorization.spec.ts`** | **10** | Auto-categorize tasks with AI |
| **`gemini-security-performance.spec.ts`** | **15** | Security validation, performance benchmarks |

**Total Gemini Tests:** 62 tests covering all AI-powered features

## Authentication Strategy

### Problem
The application uses **Google OAuth only** (no email/password login).

### Solution
Tests use **global authentication setup** that:
1. Authenticates via **Supabase API** (if email/password available)
2. Injects session **into browser storage** before tests run
3. Reuses session across **all test specs**
4. Falls back gracefully if auth not available

### Configuration

#### Option 1: API-Based Authentication (Recommended)

1. **Copy the example env file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your Supabase credentials in `.env`:**
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Create a test user in Supabase:**
   - Go to Supabase console → Authentication → Users
   - Click "Add user"
   - Enter email and password
   - Add to `.env`:
   ```bash
   TEST_EMAIL=your-test-account@example.com
   TEST_PASSWORD=your-secure-test-password
   ```

4. **Run tests:**
   ```bash
   npm run test:e2e
   ```

#### Option 2: Without Environment Variables

If you don't configure credentials:
- Setup will create minimal auth file (`.auth.json`)
- Tests will proceed but may fail at authentication checks
- This is expected behavior - you'll see warnings in console
- For production use, **always configure credentials**

### How It Works

1. **auth.setup.ts** runs first (before any test)
   - Makes API request to Supabase with test credentials
   - Saves auth token to `tests/e2e/.auth.json`

2. **playwright.config.ts** loads the auth file
   - Uses `storageState` to inject cookies/localStorage
   - All tests start with valid session

3. **Test specs** use the injected session
   - No manual login needed in beforeEach
   - Tests focus on feature testing, not auth flow

## Running Tests

### Prerequisites

```bash
# Already installed
npm install -D @playwright/test
```

### Commands

```bash
# Run all tests (headless)
npm run test:e2e

# Run with interactive UI (debugging)
npm run test:e2e:ui

# Run with visible browser
npm run test:e2e:headed

# Run in debug mode (step-by-step)
npm run test:e2e:debug

# Run specific test file
npm run test:e2e tests/e2e/task-management.spec.ts

# Run tests matching pattern
npm run test:e2e -g "Create Task"
```

### View Results

```bash
# Open HTML report
npx playwright show-report

# Report stored in
playwright-report/index.html
```

## Environment Variables

```bash
# Required for automatic authentication
TEST_EMAIL=your-test@example.com
TEST_PASSWORD=your-secure-password

# Supabase config (usually in .env)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=false  # Auto-download browsers
```

## Troubleshooting

### Tests fail at login step
**Cause:** Auth setup didn't inject session

**Solutions:**
1. Set `TEST_EMAIL` and `TEST_PASSWORD` environment variables
2. Ensure test user exists in Supabase
3. Check `.auth.json` file was created
4. Run `npx playwright show-report` to see screenshots

### "Port already in use"
**Cause:** Dev server already running

**Solution:**
```bash
# Find and kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Or use different port
npm run dev -- --port 3001
```

### Timeout errors
**Cause:** App taking too long to load

**Solutions:**
1. Check if dev server is running
2. Increase timeout in `playwright.config.ts`
3. Check network connectivity
4. Review test screenshots in `playwright-report/`

### "Element not found"
**Cause:** Selectors outdated or UI changed

**Solutions:**
1. Use `npx playwright codegen` to generate new selectors
2. Check actual HTML with `page.content()`
3. Use inspector: `npx playwright test --debug`

## Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Auth already injected globally
    await page.goto('/');
  });

  test('Test X.X: Description', async ({ page }) => {
    // Arrange: navigate to page
    await page.goto('/path');

    // Act: interact with UI
    await page.locator('button').click();

    // Assert: verify result
    await expect(page.locator('[data-testid="element"]')).toBeVisible();
  });
});
```

## Best Practices

1. **Use data-testid attributes** for reliability
   ```html
   <button data-testid="submit-button">Submit</button>
   ```

2. **Avoid hard-coded waits**
   ```typescript
   // ❌ Bad
   await page.waitForTimeout(1000);

   // ✅ Good
   await expect(element).toBeVisible({ timeout: 5000 });
   ```

3. **Use relative selectors** for resilience
   ```typescript
   // ❌ Bad - brittle
   await page.locator('form > div > button:nth-child(3)').click();

   // ✅ Good - resilient
   await page.locator('[data-testid="task"]:has-text("My Task")').click();
   ```

4. **Keep tests independent**
   - Each test should be able to run alone
   - Don't rely on state from previous tests
   - Use isolated test data when possible

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run E2E tests
  run: npm run test:e2e
  env:
    TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
    TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

- name: Upload report
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Performance

- **Local run:** ~2-3 minutes for full suite
- **CI/CD run:** ~5-7 minutes (browser downloads, retries)
- **Parallel:** Enabled by default (`fullyParallel: true`)

## Resources

- [Playwright Docs](https://playwright.dev)
- [Playwright Inspector](https://playwright.dev/docs/inspector)
- [Authentication Guide](https://playwright.dev/docs/auth)
- [Best Practices](https://playwright.dev/docs/best-practices)

## Contributing

When adding new tests:

1. Use the same format as existing tests
2. Add `data-testid` attributes to components
3. Update this README with new test suites
4. Ensure all tests pass locally before pushing
5. Handle both success and failure cases

## Gemini Integration Tests

For detailed information about the Gemini AI integration tests, see:

**[📖 Full Gemini E2E Testing Guide](../../docs/GEMINI_E2E_TESTS.md)**

### Quick Overview

The Gemini integration tests validate that all AI-powered features work correctly after migrating from frontend to secure backend architecture:

- **Security:** API key never exposed, all requests authenticated
- **Performance:** Edge Functions < 10s, Python server < 60s
- **Reliability:** Retry mechanisms, error handling, cache
- **Compliance:** PII detection and sanitization (LGPD)

### Running Gemini Tests Only

```bash
# All Gemini tests
npx playwright test podcast-gemini finance-gemini memory-gemini atlas-categorization gemini-security

# Security tests only
npx playwright test gemini-security-performance --grep "Security"

# Performance tests only
npx playwright test gemini-security-performance --grep "Performance"
```

### Test Fixtures

Test data is in `tests/fixtures/`:
- `mock-whatsapp-messages.json` - Sample messages for Memory tests
- `test-tasks.json` - Sample tasks for Atlas categorization
- `bank-statement-with-pii.pdf` - (Create manually) PDF for Finance tests

See [tests/fixtures/README.md](../fixtures/README.md) for details.

## Support

For issues or questions:
1. Check test report: `npx playwright show-report`
2. Review [Gemini E2E Testing Guide](../../docs/GEMINI_E2E_TESTS.md)
3. Review test code and selectors
4. Use `--debug` mode: `npm run test:e2e:debug`
5. Check browser DevTools screenshots
