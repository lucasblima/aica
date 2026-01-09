# E2E Test Execution Guide

This guide provides reliable instructions for running the Playwright E2E test suite, specifically the podcast guest approval flow tests (40+ tests).

## Prerequisites

Before running tests, ensure you have:

1. **Node.js and npm** installed
2. **Playwright browsers** installed:
   ```bash
   npx playwright install
   ```
3. **Environment variables** configured (see below)

## Environment Setup

### Required Environment Variables

Create a `.env` file in the project root with:

```bash
# Application URL (Vite dev server)
VITE_APP_URL=http://localhost:5173

# Supabase Configuration
VITE_SUPABASE_URL=https://uzywajqzbdbrfammshdg.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Test User Credentials (for email/password authentication)
TEST_EMAIL=test@example.com
TEST_PASSWORD=REDACTED_TEST_PASSWORD
```

### Verify Test User Exists

The test user must exist in your Supabase Auth. If not, create it via:
- Supabase Dashboard > Authentication > Users > Add User
- Or via Supabase CLI: `supabase auth admin create-user --email test@example.com --password REDACTED_TEST_PASSWORD`

## Running Tests

### Method 1: Automatic Server Start (Recommended)

Playwright will automatically start the dev server if not running:

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test podcast-guest-approval-flow.spec.ts

# Run with visual browser
npm run test:e2e:headed

# Run with Playwright UI (interactive)
npm run test:e2e:ui

# Run with step-by-step debugging
npm run test:e2e:debug
```

### Method 2: Manual Server Start (For Debugging)

If you prefer to start the server manually:

```bash
# Terminal 1: Start dev server
npm run dev

# Wait for "ready in X ms" message, then...

# Terminal 2: Run tests (server already running, will be reused)
npm run test:e2e
```

### Method 3: Pre-flight Check Script

For maximum reliability, use this sequence:

```bash
# Windows PowerShell
$env:TEST_EMAIL="test@example.com"
$env:TEST_PASSWORD="REDACTED_TEST_PASSWORD"

# Check if server is running first
$response = try { Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5 } catch { $null }

if (-not $response) {
    Write-Host "Starting dev server..."
    Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow
    Start-Sleep -Seconds 10  # Wait for Vite to fully start
}

# Run tests
npm run test:e2e
```

```bash
# Linux/macOS/Git Bash
export TEST_EMAIL="test@example.com"
export TEST_PASSWORD="REDACTED_TEST_PASSWORD"

# Check if server is running
if ! curl -s http://localhost:5173 > /dev/null; then
    echo "Starting dev server..."
    npm run dev &
    sleep 10  # Wait for Vite to fully start
fi

# Run tests
npm run test:e2e
```

## Test Execution Modes

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run test:e2e` | Headless mode | CI/CD, quick runs |
| `npm run test:e2e:headed` | Browser visible | Watching test execution |
| `npm run test:e2e:ui` | Interactive UI | Test development, debugging |
| `npm run test:e2e:debug` | Step-by-step | Detailed debugging |

## Viewing Test Results

### HTML Report

After test execution, view the detailed HTML report:

```bash
npx playwright show-report
```

This opens a browser with:
- Test results summary
- Screenshots on failure
- Video recordings (for failed tests)
- Trace viewer for debugging

### Report Location

Reports are saved to: `playwright-report/index.html`

## Troubleshooting

### Issue: NS_ERROR_CONNECTION_REFUSED

**Cause**: Dev server not ready when tests start.

**Solutions**:

1. **Increase webServer timeout** in `playwright.config.ts`:
   ```typescript
   webServer: {
     timeout: 180000, // 3 minutes
   }
   ```

2. **Manually start server first** and wait for "ready" message

3. **Check port availability**:
   ```bash
   # Windows
   netstat -ano | findstr :5173

   # Linux/macOS
   lsof -i :5173
   ```

### Issue: Authentication Failures

**Cause**: Test user doesn't exist or wrong credentials.

**Solutions**:

1. Verify `TEST_EMAIL` and `TEST_PASSWORD` environment variables
2. Check user exists in Supabase Auth dashboard
3. Delete `.auth.json` to force re-authentication:
   ```bash
   rm tests/e2e/.auth.json
   ```

### Issue: Tests Timeout

**Cause**: AI operations (Gemini API) take too long.

**Solutions**:

1. Tests already have 90s timeout configured
2. For specific tests, increase timeout:
   ```typescript
   test('slow test', async ({ page }) => {
     test.setTimeout(120000); // 2 minutes
   });
   ```

### Issue: Flaky Tests

**Cause**: Race conditions or unstable selectors.

**Solutions**:

1. Use `data-testid` selectors (already implemented)
2. Add explicit waits:
   ```typescript
   await page.waitForLoadState('networkidle');
   await expect(element).toBeVisible({ timeout: 10000 });
   ```

## Running Specific Tests

```bash
# Run tests matching a pattern
npx playwright test -g "Public Figure"

# Run tests in specific file
npx playwright test podcast-guest-approval-flow.spec.ts

# Run only chromium browser
npx playwright test --project=chromium

# Run only setup (authentication)
npx playwright test --project=setup
```

## CI/CD Integration

For CI environments, set `CI=true`:

```bash
CI=true npm run test:e2e
```

This enables:
- 2 retries on failure
- No webServer auto-start (must be started separately)
- Screenshots and traces for debugging

## Test Architecture

```
tests/e2e/
├── auth.setup.ts              # Authentication setup (runs first)
├── podcast-guest-approval-flow.spec.ts  # 40+ guest approval tests
├── pages/
│   └── GuestWizardPage.ts     # Page Object Model for wizard
└── .auth.json                 # Stored auth state (auto-generated)
```

## Key Configuration Files

- `playwright.config.ts` - Main Playwright configuration
- `.env` - Environment variables (not in git)
- `tests/e2e/.auth.json` - Authentication state storage

## Expected Test Results

When all tests pass:
- 41 tests total (1 setup + 40 guest approval tests)
- ~5-10 minutes for full suite (AI operations included)
- HTML report shows all green checkmarks

## Contact

For issues with test infrastructure, consult:
- `docs/INTEGRATION_TEST_PLAN.md` - Full test plan documentation
- Playwright docs: https://playwright.dev/docs/intro
