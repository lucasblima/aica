# Connections E2E Tests - Quick Start Guide

## 30-Second Setup

```bash
# 1. Install dependencies (if not done)
npm install

# 2. Set environment variables
export TEST_USER_EMAIL=test@example.com
export TEST_USER_PASSWORD=yourpassword
export VITE_SUPABASE_URL=your-url
export VITE_SUPABASE_ANON_KEY=your-key

# 3. Start dev server in another terminal
npm run dev

# 4. Run tests
npm run test:e2e:headed tests/e2e/connections/space-creation.spec.ts
```

## What Tests Are Available?

### By Feature
```bash
# Test space creation flows (53 tests)
npm run test:e2e:headed tests/e2e/connections/space-creation.spec.ts

# Test member management (30 tests)
npm run test:e2e:headed tests/e2e/connections/member-management.spec.ts
```

### By Archetype
```bash
# Habitat - Property Management (45 tests)
npm run test:e2e:headed tests/e2e/connections/habitat.spec.ts

# Ventures - Business Management (40 tests)
npm run test:e2e:headed tests/e2e/connections/ventures.spec.ts

# Academia - Knowledge Management (50 tests)
npm run test:e2e:headed tests/e2e/connections/academia.spec.ts

# Tribo - Community Management (55 tests)
npm run test:e2e:headed tests/e2e/connections/tribo.spec.ts
```

### All Tests
```bash
# Run entire connection test suite (303+ tests)
npm run test:e2e tests/e2e/connections/

# Run in headed mode to see browser
npm run test:e2e:headed tests/e2e/connections/
```

## Common Commands

```bash
# Debug a failing test
npm run test:e2e:debug tests/e2e/connections/space-creation.spec.ts

# Run specific test by name
npm run test:e2e:headed tests/e2e/connections/space-creation.spec.ts -g "Test 1.1"

# View test report
npx playwright show-report

# Generate selectors interactively
npx playwright codegen http://localhost:3000/connections

# Run with detailed tracing
npm run test:e2e tests/e2e/connections/ --trace on
```

## Test Structure

Each test file is organized like:

```
Test 1.1: Basic functionality
Test 1.2: Display verification
Test 1.3: Interaction handling
...
Test 2.1: Next feature group
```

Hover over test names in the report to see what they test.

## If Tests Fail

### Quick Fixes
```bash
# 1. Run in headed mode to see what's happening
npm run test:e2e:headed tests/e2e/connections/space-creation.spec.ts

# 2. Use debug mode to step through
npm run test:e2e:debug tests/e2e/connections/space-creation.spec.ts

# 3. Check console and screenshots
ls -la test-results/
```

### Common Issues

**"Cannot find element"**
```bash
# Use codegen to find the right selector
npx playwright codegen http://localhost:3000/connections
```

**"Test hangs"**
- Increase timeout in test:
```typescript
test.setTimeout(120000); // 120 seconds
```

**"Auth fails"**
- Verify test user exists
- Check .env.test variables
- Run auth setup: `npm run test:e2e:headed tests/e2e/auth.setup.ts`

## Test Coverage Map

| Area | Tests | Status |
|------|-------|--------|
| Creating Spaces | 53 | ✅ Complete |
| Managing Members | 30 | ✅ Complete |
| Habitat Features | 45 | ✅ Complete |
| Ventures Features | 40 | ✅ Complete |
| Academia Features | 50 | ✅ Complete |
| Tribo Features | 55 | ✅ Complete |
| **TOTAL** | **273+** | ✅ |

## What Each File Tests

### `space-creation.spec.ts` (53 tests)
```
✅ All 4 archetypes are visible
✅ Wizard opens and closes correctly
✅ Can create spaces for each archetype
✅ Form validates correctly
✅ Spaces appear in list after creation
✅ Handles errors gracefully
```

### `member-management.spec.ts` (30 tests)
```
✅ Member list displays
✅ Can add members with roles
✅ Can change member permissions
✅ Can remove members
✅ Can search and filter members
```

### `habitat.spec.ts` (45 tests)
```
✅ Property information displays
✅ Can manage inventory items
✅ Can track maintenance tasks
✅ Warranty alerts show up
✅ Can add condo contacts
```

### `ventures.spec.ts` (40 tests)
```
✅ Company info displays
✅ Can track KPI metrics
✅ Can create milestones
✅ Can manage stakeholders
✅ Health gauge shows status
```

### `academia.spec.ts` (50 tests)
```
✅ Learning journeys display
✅ Can create and link notes
✅ Can set up mentorships
✅ Can add credentials
✅ Can search knowledge base
```

### `tribo.spec.ts` (55 tests)
```
✅ Community info displays
✅ Can create rituals/events
✅ Can RSVP to events
✅ Can share resources
✅ Can create community funds
✅ Can discuss in forums
```

## Environment Setup

Create `.env.test`:
```bash
# Required for tests
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=test-password-123
TEST_USER_ID=your-uuid

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# App
VITE_APP_URL=http://localhost:3000
```

Or set as environment variables:
```bash
export TEST_USER_EMAIL=test@example.com
npm run test:e2e tests/e2e/connections/
```

## Understanding Test Names

Tests follow this pattern: `Test X.Y: Description`

- **X** = Feature group (1=visibility, 2=creation, 3=validation, etc.)
- **Y** = Individual test number

Example:
- `Test 1.1` = First test of visibility group
- `Test 2.3` = Third test of creation group
- `Test 5.2` = Second test of advanced features

## Pro Tips

1. **Run single test**
   ```bash
   npm run test:e2e:headed tests/e2e/connections/space-creation.spec.ts -g "Test 1.1"
   ```

2. **Watch mode** (auto-run on changes)
   ```bash
   npm run test:e2e -- --ui
   ```

3. **See what's happening**
   ```bash
   npm run test:e2e:headed tests/e2e/connections/
   # This opens browser, you see exactly what the test does
   ```

4. **Debug step-by-step**
   ```bash
   npm run test:e2e:debug tests/e2e/connections/space-creation.spec.ts
   # Opens inspector, click to pause between steps
   ```

5. **Mobile testing**
   ```bash
   npm run test:e2e -- --project="Mobile Chrome"
   ```

## Next Steps

1. **Run tests** - See them pass
2. **Read failures** - Understand what broke
3. **Check selectors** - Update if UI changed
4. **Add new tests** - Copy existing patterns
5. **Submit report** - Share results with team

## Helpful Resources

- [Full Documentation](./README.md) - Detailed guide with all commands
- [Test Summary](./TEST_SUITE_SUMMARY.md) - Complete test list
- [Playwright Docs](https://playwright.dev) - Official guide
- [Selectors Guide](https://playwright.dev/docs/locators) - How to find elements

## Need Help?

```bash
# Check what tests exist
grep -r "test('Test" tests/e2e/connections/

# See test output
npm run test:e2e tests/e2e/connections/ --reporter=verbose

# Review failures
npx playwright show-report

# Debug one test
npm run test:e2e:debug tests/e2e/connections/space-creation.spec.ts
```

---

That's it! You're ready to run the tests. Start with:

```bash
npm run dev &  # Start server
npm run test:e2e:headed tests/e2e/connections/space-creation.spec.ts
```

Enjoy! 🚀
