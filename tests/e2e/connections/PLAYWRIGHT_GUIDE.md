# Connections Module E2E Tests - Playwright Guide

Complete guide to running and understanding the Connections module E2E test suite.

## Overview

The Connections module test suite consists of 42 comprehensive E2E tests organized into two main specification files:

1. **create-space.spec.ts** (24 tests) - Space creation workflows
2. **space-navigation.spec.ts** (18 tests) - Navigation and discovery workflows

## Quick Start

### Install & Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Ensure .env is configured with test credentials
# VITE_APP_URL=http://localhost:3000
# TEST_USER_ID=<test_user_id>
# TEST_USER_EMAIL=<test_user_email>
```

### Run Tests

```bash
# Run all connection tests with visible browser (recommended first time)
npm run test:e2e:headed tests/e2e/connections/

# Run in headless mode (CI/CD)
npm run test:e2e tests/e2e/connections/

# Run with interactive debugger
npm run test:e2e:debug tests/e2e/connections/

# Run single file
npm run test:e2e:headed tests/e2e/connections/create-space.spec.ts

# Run specific test
npm run test:e2e:headed tests/e2e/connections/create-space.spec.ts -g "Test 1.1"
```

## Test Files Overview

### create-space.spec.ts

Tests the complete flow of creating connection spaces. Verifies that users can:
1. Navigate to Connections module
2. Select an archetype (Habitat, Ventures, Academia, Tribo)
3. Fill in space details through a multi-step wizard
4. Submit the form and see success confirmation
5. Access the newly created space with correct metadata

**Test Groups:**
- Test 1.x (2): Habitat archetype creation
- Test 2.x (2): Ventures archetype creation
- Test 3.x (2): Academia archetype creation
- Test 4.x (2): Tribo archetype creation
- Test 5.x (3): Form validation and constraints
- Test 6.x (3): Cancel and close behavior
- Test 7.x (3): Space discovery and integration

**Total: 24 tests**

### space-navigation.spec.ts

Tests navigation patterns across the Connections module. Verifies:
1. Filtering spaces by archetype
2. Opening and loading space detail pages
3. Navigating between sections (members, events, etc.)
4. Back button and breadcrumb behavior
5. Switching between multiple spaces
6. State persistence during navigation
7. Error handling for invalid spaces

**Test Groups:**
- Test 1.x (5): Archetype filtering
- Test 2.x (4): Space detail page loading
- Test 3.x (2): Section navigation
- Test 4.x (3): Breadcrumb and back navigation
- Test 5.x (3): Multi-space navigation
- Test 6.x (2): State and persistence
- Test 7.x (3): Error handling

**Total: 18 tests**

## Running Tests

### All Tests

```bash
npm run test:e2e:headed tests/e2e/connections/
```

### By File

```bash
npm run test:e2e:headed tests/e2e/connections/create-space.spec.ts
npm run test:e2e:headed tests/e2e/connections/space-navigation.spec.ts
```

### By Group

```bash
npm run test:e2e:headed tests/e2e/connections/ -g "Test 1"
npm run test:e2e:headed tests/e2e/connections/ -g "Test 1.1"
```

### Debug Mode

```bash
npm run test:e2e:debug tests/e2e/connections/create-space.spec.ts -g "Test 1.1"
```

## Common Issues

### Element Not Found

Run in headed mode to see what's on screen:
```bash
npm run test:e2e:headed tests/e2e/connections/create-space.spec.ts -g "Test 1.1"
```

### Timeout Errors

Add explicit waits:
```typescript
await expect(modal).toBeVisible({ timeout: 8000 });
await page.waitForLoadState('networkidle');
```

### Flaky Tests

Add timing buffers between actions:
```typescript
await page.waitForTimeout(300); // Allow animation
await expect(element).toBeVisible({ timeout: 5000 });
```

### Selector Matches Multiple Elements

Use filter or index:
```typescript
const button = page.getByRole('button', { name: /criar/i }).first();
```

## Debugging

### 1. Headed Mode (Visual)

See the browser run in real-time:
```bash
npm run test:e2e:headed tests/e2e/connections/
```

### 2. Debug Inspector (Interactive)

Step through tests with inspector:
```bash
npm run test:e2e:debug tests/e2e/connections/
```

### 3. Screenshot on Failure

Screenshots automatically saved to `.test-results/` on failure.

### 4. Test Report

View interactive HTML report:
```bash
npx playwright show-report
```

## Selector Strategy

Tests use accessibility-first selectors with fallback chains:

```typescript
// Priority 1: Role-based (most accessible)
page.getByRole('button', { name: /criar/i })

// Priority 2: Label-based
page.getByLabel('Nome do espaço')

// Priority 3: Text-based
page.getByText('Criar Espaço')

// Priority 4: Test ID
page.locator('[data-testid="create-button"]')

// Priority 5: CSS (last resort)
page.locator('input[name="name"]')

// Fallback chains (most resilient)
const button = page
  .getByRole('button', { name: /criar/i })
  .or(page.locator('[data-testid="create-button"]'))
  .or(page.getByText('Criar Espaço'));
```

## Performance

**Typical execution times:**
- Single test: 5-15 seconds
- Test group: 30-60 seconds
- Full file: 5-10 minutes
- Full suite: 10-15 minutes

**Tips to speed up:**
1. Run specific tests: `npm run test:e2e -- -g "Test 1"`
2. Use headless mode (faster): `npm run test:e2e`
3. Increase parallelization: `--workers=4` (if tests are independent)

## Test Architecture

### Fixtures (fixtures.ts)

Provides:
- Authenticated page fixture
- Navigation helpers
- Form interaction helpers
- Space discovery helpers
- Verification helpers

### Test Flow

1. Setup (beforeEach): Navigate to connections
2. Test: Execute user workflow
3. Verify: Assert expected outcomes
4. Teardown: None (spaces remain in DB)

## Extending Tests

### Add New Test

```typescript
test('Test X.X: Description of what is tested', async ({
  authenticatedPage: page,
}) => {
  // Arrange
  await navigateToConnections(page);

  // Act
  await openCreateSpaceWizard(page);

  // Assert
  await expect(modal).toBeVisible();
});
```

### Add New Helper

In `fixtures.ts`:

```typescript
export async function newHelper(page: Page) {
  // Implementation
  await page.click('button');
}
```

Then use:

```typescript
import { newHelper } from './fixtures';

test('Test', async ({ authenticatedPage: page }) => {
  await newHelper(page);
});
```

## Resources

- **Playwright Docs:** https://playwright.dev
- **Best Practices:** https://playwright.dev/docs/best-practices
- **API Reference:** https://playwright.dev/docs/api/class-page

---

**Last Updated:** December 2024
**Total Tests:** 42 (24 creation + 18 navigation)
**Expected Runtime:** 10-15 minutes
