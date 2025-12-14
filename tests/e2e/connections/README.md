# Connection Archetypes E2E Test Suite

Comprehensive end-to-end test suite for the Connections module featuring four distinct archetypes: Habitat, Ventures, Academia, and Tribo.

## Test Files

### Core Test Suites

1. **space-creation.spec.ts** - Space creation and archetype selection
   - Archetype visibility
   - Create space wizard flows
   - Form validation
   - Space list integration
   - Error handling

2. **member-management.spec.ts** - Member and stakeholder management
   - Member list display
   - Add external members
   - Member roles and permissions
   - Member removal
   - Member search and filtering

3. **habitat.spec.ts** - Property management archetype
   - Property information display
   - Inventory management (add, edit, delete items)
   - Maintenance tracking (create, complete tasks)
   - Warranty alerts
   - Condo/resident contacts

4. **ventures.spec.ts** - Business management archetype
   - Company information
   - Metrics and KPI dashboard
   - Business health gauge
   - Milestones timeline
   - Stakeholder/equity management
   - Financial health indicators

5. **academia.spec.ts** - Knowledge management archetype
   - Learning journeys
   - Note-taking (Zettelkasten system)
   - Note connections/references
   - Mentorship connections
   - Credentials and portfolio
   - Knowledge search and filtering

6. **tribo.spec.ts** - Community management archetype
   - Community information
   - Recurring rituals/events
   - RSVP functionality
   - Shared resources library
   - Community fund (vaquinha)
   - Discussion forums

### Utilities

- **fixtures.ts** - Reusable test fixtures and helpers
  - Authentication setup
  - Database helpers
  - Common interactions (create space, add member, navigate, etc.)
  - Success message verification

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.test.example .env.test
# Edit .env.test with your test credentials

# Start dev server (in another terminal)
npm run dev
```

### Execute All Connection Tests

```bash
# Run all connection tests in headed mode (visible browser)
npm run test:e2e:headed tests/e2e/connections/

# Run in headless mode (CI/CD)
npm run test:e2e tests/e2e/connections/
```

### Execute Specific Test Suite

```bash
# Space creation tests
npm run test:e2e:headed tests/e2e/connections/space-creation.spec.ts

# Member management tests
npm run test:e2e:headed tests/e2e/connections/member-management.spec.ts

# Habitat archetype tests
npm run test:e2e:headed tests/e2e/connections/habitat.spec.ts

# Ventures archetype tests
npm run test:e2e:headed tests/e2e/connections/ventures.spec.ts

# Academia archetype tests
npm run test:e2e:headed tests/e2e/connections/academia.spec.ts

# Tribo archetype tests
npm run test:e2e:headed tests/e2e/connections/tribo.spec.ts
```

### Run Specific Test

```bash
# Run a single test by name
npm run test:e2e:headed tests/e2e/connections/space-creation.spec.ts -g "Test 1.1"

# Run multiple tests matching pattern
npm run test:e2e:headed tests/e2e/connections/ -g "Create a"
```

### Debug Mode

```bash
# Open Playwright Inspector for step-by-step debugging
npm run test:e2e:debug tests/e2e/connections/space-creation.spec.ts

# Run with trace recording for debugging failures
npm run test:e2e tests/e2e/connections/ --trace on
```

## Test Organization

Tests are organized using `test.describe()` with clear hierarchical numbering:

- **Test X.Y**: Tests grouped by functionality
  - X = Feature group (1 = visibility, 2 = creation, etc.)
  - Y = Individual test number

### Space Creation Tests (1.x - 5.x)
- 1.x: Archetype visibility
- 2.x: Archetype-specific creation (Habitat, Ventures, Academia, Tribo)
- 3.x: Form validation
- 4.x: List integration
- 5.x: Error handling

### Member Management Tests (1.x - 5.x)
- 1.x: Member list display
- 2.x: Add members
- 3.x: Role management
- 4.x: Remove members
- 5.x: Search and filtering

### Archetype-Specific Tests
Each archetype follows similar structure:
- 1.x: Core information display
- 2.x: Primary features (properties, metrics, notes, rituals)
- 3.x: Secondary features (maintenance, milestones, mentorship, RSVP)
- 4.x: Tertiary features (warranty, equity, credentials, funds)
- 5.x: Advanced features (alerts, health, search, discussions)

## Selectors Strategy

Tests use a resilient selector hierarchy:

1. **Accessibility-first** (most resilient)
   - `getByRole()` - buttons, links, dialogs
   - `getByLabel()` - form fields
   - `getByPlaceholder()` - input fields

2. **Visible text** (resilient)
   - `getByText()` - visible labels and content

3. **Test IDs** (reliable for complex components)
   - `locator('[data-testid="..."]')`

4. **Multi-strategy fallbacks** (robust error handling)
   ```javascript
   const button = page
     .getByRole('button', { name: /create/i })
     .or(page.locator('[data-testid="create-btn"]'))
     .or(page.getByText('Create'));
   ```

## View Test Report

```bash
# After tests run, view HTML report
npx playwright show-report

# Open specific report
npx playwright show-report ./playwright-report
```

## Debugging Failed Tests

### Check Logs
```bash
# View test-results directory
ls -la test-results/

# Check specific failure
cat test-results/test-failed-1.json
```

### Take Screenshots
```bash
# Screenshots are automatically saved on failure
# Located in: test-results/[test-name]/

# View with:
open test-results/[test-name]/test-failed-1.png
```

### Watch Mode
```bash
# Run tests in watch mode with UI
npm run test:e2e -- --ui

# Or use Playwright Inspector
npm run test:e2e:debug tests/e2e/connections/space-creation.spec.ts
```

### Increase Timeouts for Slow Operations
If tests fail due to timing, increase timeouts in:
```typescript
// In test file
test('Test name', async ({ page }) => {
  await expect(element).toBeVisible({ timeout: 10000 }); // 10 seconds
});

// Or globally in playwright.config.ts
timeout: 120 * 1000, // 120 seconds
```

## Common Issues

### Tests Hang on Login
- Ensure `tests/e2e/.auth.json` exists
- Run `npm run test:e2e:headed tests/e2e/auth.setup.ts` first
- Check test user credentials in `.env.test`

### Cannot Find Elements
1. Run in headed mode to see what's rendered:
   ```bash
   npm run test:e2e:headed tests/e2e/connections/space-creation.spec.ts
   ```

2. Use Playwright Inspector:
   ```bash
   npm run test:e2e:debug tests/e2e/connections/space-creation.spec.ts
   ```

3. Check browser console for errors

### Selector Issues
If selectors fail consistently:

1. Run codegen to generate selectors:
   ```bash
   npx playwright codegen http://localhost:3000/connections
   ```

2. Check if data-testid attributes exist in component:
   ```bash
   grep -r "data-testid" src/modules/connections/
   ```

3. Update fixtures.ts with better selector alternatives

### Flaky Tests
If tests pass/fail intermittently:

1. Add explicit waits:
   ```typescript
   await page.waitForLoadState('networkidle');
   await page.waitForURL(/expected-path/);
   ```

2. Increase timeout:
   ```typescript
   await expect(element).toBeVisible({ timeout: 10000 });
   ```

3. Add retry logic:
   ```typescript
   test.setTimeout(60000); // 60 second timeout
   test.slow();
   ```

## Adding New Tests

1. Create new test file in `connections/` directory
2. Import fixtures from `./fixtures`
3. Use consistent naming: `test-name.spec.ts`
4. Follow existing test structure
5. Use numbered tests (X.Y) for organization

### Template
```typescript
import { expect } from '@playwright/test';
import { test, navigateToConnections, createSpace } from './fixtures';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Setup
  });

  test('Test 1.1: Description', async ({ authenticatedPage: page }) => {
    // Implementation
  });
});
```

## Environment Variables

Required in `.env.test`:

```
# Supabase
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Test User
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password
TEST_USER_ID=user-uuid

# App
VITE_APP_URL=http://localhost:3000
```

## CI/CD Integration

Tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run E2E Tests
  run: npm run test:e2e tests/e2e/connections/

- name: Upload Report
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Performance Considerations

- Tests run **sequentially** (not in parallel) to avoid API rate limiting
- Each test is **independent** and can run standalone
- Tests clean up after themselves when possible
- Use `test.timeout()` for operations that take longer

## Best Practices

1. **Use fixtures** - Don't repeat setup code
2. **Test real flows** - Avoid isolated unit-like tests
3. **Add comments** - Explain complex interactions
4. **Consistent naming** - Follow X.Y numbering
5. **Resilient selectors** - Use accessibility-first approach
6. **Wait for state** - Don't rely on arbitrary delays
7. **Test failures matter** - Fix flaky tests immediately
8. **Review selectors** - Update when UI changes

## Contributing

When adding new tests:

1. Ensure test isolation (no dependencies on test order)
2. Use consistent selector patterns from fixtures
3. Add meaningful error handling with try/catch
4. Document complex test flows with comments
5. Follow existing naming conventions
6. Run full suite before submitting

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Test Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guides](https://playwright.dev/docs/debug)
- [Selector Guide](https://playwright.dev/docs/locators)

## Support

For test failures or issues:

1. Check browser console in headed mode
2. Review trace in `--trace on` mode
3. Look at screenshots in `test-results/`
4. Run codegen to understand selectors
5. Increase timeouts for slow operations
