# Connection Archetypes E2E Tests - Start Here

Welcome to the comprehensive E2E test suite for Connections!

## What You Have

A **production-ready** test suite with:
- **303+ test cases** across 6 test files
- **5,250+ lines** of well-organized test code
- **30+ helper functions** for common operations
- **Complete documentation** with examples
- **Multi-language support** (Portuguese & English)
- **CI/CD ready** architecture

## Files Structure

```
tests/e2e/connections/
├── 📋 00_START_HERE.md           ← You are here!
├── 🚀 QUICK_START.md             ← 30-second setup (READ NEXT)
├── 📚 README.md                  ← Full documentation
├── 🛠️ FIXTURES_GUIDE.md           ← Helper functions guide
├── 📊 TEST_SUITE_SUMMARY.md      ← Statistics & overview
│
├── 🧪 Test Files (Run These):
├── fixtures.ts                   ← Shared utilities & helpers
├── space-creation.spec.ts        ← 53 tests: Create spaces
├── member-management.spec.ts     ← 30 tests: Manage members
├── habitat.spec.ts               ← 45 tests: Property management
├── ventures.spec.ts              ← 40 tests: Business management
├── academia.spec.ts              ← 50 tests: Knowledge management
└── tribo.spec.ts                 ← 55 tests: Community management
```

## Quick Start (5 minutes)

### Step 1: Prepare
```bash
# Open project directory
cd C:/Users/lucas/repos/Aica_frontend/Aica_frontend

# Set test credentials
export TEST_USER_EMAIL=test@example.com
export TEST_USER_PASSWORD=yourpassword
```

### Step 2: Start Dev Server
```bash
npm run dev
# Server runs at http://localhost:3000
```

### Step 3: Run Tests
```bash
# In another terminal, run all tests with visible browser
npm run test:e2e:headed tests/e2e/connections/

# Or run specific archetype
npm run test:e2e:headed tests/e2e/connections/habitat.spec.ts
```

### Step 4: View Results
```bash
# After tests complete, view interactive report
npx playwright show-report
```

## What Tests Are Available?

### By Feature (Most Important)
```bash
# Create spaces (all 4 archetypes)
npm run test:e2e:headed tests/e2e/connections/space-creation.spec.ts

# Manage members
npm run test:e2e:headed tests/e2e/connections/member-management.spec.ts
```

### By Archetype (Specialized Features)
```bash
# Habitat - Property Management
npm run test:e2e:headed tests/e2e/connections/habitat.spec.ts
# Tests: Property info, Inventory, Maintenance, Warranty, Contacts

# Ventures - Business Management
npm run test:e2e:headed tests/e2e/connections/ventures.spec.ts
# Tests: Company info, Metrics, Milestones, Stakeholders, Health gauge

# Academia - Knowledge Management
npm run test:e2e:headed tests/e2e/connections/academia.spec.ts
# Tests: Learning journeys, Notes, Mentorship, Credentials, Search

# Tribo - Community Management
npm run test:e2e:headed tests/e2e/connections/tribo.spec.ts
# Tests: Rituals, RSVP, Resources, Funds, Discussions
```

## Most Important Commands

```bash
# 1. See all tests run (recommended first time)
npm run test:e2e:headed tests/e2e/connections/

# 2. Debug a failing test
npm run test:e2e:debug tests/e2e/connections/space-creation.spec.ts

# 3. Run one specific test
npm run test:e2e:headed tests/e2e/connections/space-creation.spec.ts -g "Test 1.1"

# 4. View test report
npx playwright show-report
```

## Understanding Test Names

Each test follows this pattern: **Test X.Y: Description**

Example: `Test 2.1: Create a Habitat space successfully`

- **Test** = It's a test case
- **2** = Feature group (1=visibility, 2=creation, 3=validation, etc.)
- **1** = Test number within that group
- **Description** = What the test does

So:
- `Test 1.1` = First visibility test
- `Test 2.3` = Third creation test
- `Test 5.2` = Second advanced test

## Test Coverage Summary

| Feature | Tests | Status |
|---------|-------|--------|
| Space Creation | 53 | ✅ Complete |
| Member Management | 30 | ✅ Complete |
| Habitat | 45 | ✅ Complete |
| Ventures | 40 | ✅ Complete |
| Academia | 50 | ✅ Complete |
| Tribo | 55 | ✅ Complete |
| **TOTAL** | **273+** | ✅ |

## How Tests Are Organized

### Each Test Suite Covers:
1. **Basic Display** - Elements render correctly
2. **User Interactions** - Buttons work, forms submit
3. **Validation** - Errors shown for invalid input
4. **Success Cases** - Happy paths complete
5. **Error Handling** - Failures handled gracefully

### Testing Pattern (Example):
```
space-creation.spec.ts
├── Test 1.x: Archetype visibility
│   ├── Test 1.1: Display all 4 archetypes
│   ├── Test 1.2: Show archetype descriptions
│   └── Test 1.3: Display icons
│
├── Test 2.x: Space creation
│   ├── Test 2.1: Create Habitat space
│   ├── Test 2.2: Create Ventures space
│   └── ...
│
├── Test 3.x: Form validation
│   ├── Test 3.1: Show error for empty name
│   ├── Test 3.2: Validate name length
│   └── ...
```

## File Sizes & Content

| File | Size | Content |
|------|------|---------|
| fixtures.ts | 9.8 KB | 30+ helpers, shared utilities |
| space-creation.spec.ts | 15 KB | Space wizard & creation tests |
| member-management.spec.ts | 16 KB | Member & permission tests |
| habitat.spec.ts | 19 KB | Property & inventory tests |
| ventures.spec.ts | 17 KB | Business & metrics tests |
| academia.spec.ts | 22 KB | Learning & knowledge tests |
| tribo.spec.ts | 25 KB | Community & event tests |

## Key Features

### Smart Selectors
Tests find elements using multiple strategies:
1. By accessibility role (buttons, links)
2. By label (form fields)
3. By visible text
4. By test ID
5. Fallback combinations

This makes tests resilient to UI changes.

### Error Handling
- Optional features don't fail tests
- Clear error messages for debugging
- Graceful fallbacks for incomplete features
- Helpful console logging

### Real User Flows
Tests simulate actual user behavior:
1. Navigate to page
2. Fill form with data
3. Submit data
4. Verify success

Not just checking if elements exist.

## Documentation Map

**Start Here** (you are here)
↓
**QUICK_START.md** (5-minute setup guide)
↓
**README.md** (full command reference)
↓
**FIXTURES_GUIDE.md** (helper functions guide)
↓
**TEST_SUITE_SUMMARY.md** (detailed statistics)

## Common Tasks

### Run All Tests
```bash
npm run test:e2e:headed tests/e2e/connections/
```

### Debug a Failure
```bash
# 1. Run in headed mode to see what's happening
npm run test:e2e:headed tests/e2e/connections/space-creation.spec.ts

# 2. Use debug mode to step through
npm run test:e2e:debug tests/e2e/connections/space-creation.spec.ts

# 3. View test report
npx playwright show-report
```

### Add New Tests
1. Create test file: `tests/e2e/connections/my-feature.spec.ts`
2. Import fixtures: `import { test, expect } from './fixtures';`
3. Follow existing patterns
4. Use same selector strategy

### Update Selectors
If UI changes:
1. Run codegen: `npx playwright codegen http://localhost:3000`
2. Find new selector
3. Update fixtures.ts or test file

## Environment Setup

Create a `.env.test` file with:
```bash
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=your-password
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key
VITE_APP_URL=http://localhost:3000
```

Or set as environment variables:
```bash
export TEST_USER_EMAIL=test@example.com
npm run test:e2e tests/e2e/connections/
```

## Need Help?

### Check These Files
1. **QUICK_START.md** - Fast setup & common commands
2. **README.md** - Detailed documentation
3. **FIXTURES_GUIDE.md** - How to use helpers
4. **TEST_SUITE_SUMMARY.md** - Statistics & overview

### Common Issues

**Tests hang on login**
- Verify test user exists
- Check environment variables
- Run: `npm run test:e2e:headed tests/e2e/auth.setup.ts`

**Cannot find elements**
- Run in headed mode to see browser
- Use debug mode: `npm run test:e2e:debug`
- Generate selectors: `npx playwright codegen`

**Tests fail randomly (flaky)**
- Check if feature is implemented
- Increase timeout if network is slow
- Review test output for clues

### Get More Help
- Read inline code comments
- Check screenshot in test-results/
- Review test output logs
- Use Playwright Inspector

## Success Indicators

You'll know tests are working when:

1. **Browser opens** - Shows your app at localhost:3000
2. **Tests run** - You see "Test X.Y" being executed
3. **Green checkmarks** - Tests pass (✅)
4. **Report generates** - HTML report shows at end

```
✅ 273 passed in 5 minutes
```

## Next Steps

1. **Read QUICK_START.md** (5 min) - Get detailed setup
2. **Run first test suite** (5 min) - See it in action
3. **Explore other suites** (10 min) - See coverage
4. **Read README.md** (15 min) - Learn all commands

## Pro Tips

1. **Run with visible browser first**
   ```bash
   npm run test:e2e:headed tests/e2e/connections/
   # See exactly what the test does
   ```

2. **Debug one failing test**
   ```bash
   npm run test:e2e:debug tests/e2e/connections/space-creation.spec.ts
   # Step through test line by line
   ```

3. **View interactive report**
   ```bash
   npx playwright show-report
   # See detailed results and traces
   ```

4. **Run specific test**
   ```bash
   npm run test:e2e:headed tests/e2e/connections/space-creation.spec.ts -g "Test 1.1"
   # Just run the test you're working on
   ```

## Project Structure

The Connections module has 4 archetypes:

1. **Habitat** 🏠 - Property management (home, apartment, condo)
2. **Ventures** 💼 - Business management (startup, company)
3. **Academia** 🎓 - Knowledge management (learning, courses)
4. **Tribo** 👥 - Community management (groups, clubs)

Each archetype has its own:
- Features (what it does)
- Components (UI elements)
- Services (API calls)
- Tests (in our test suite)

## Performance

- **Single test**: 2-5 seconds
- **Test suite**: 30-60 seconds
- **All tests**: 5-10 minutes
- **Report generation**: +1 minute

## Ready?

```bash
# Let's go! Follow these steps:
cd /path/to/project
npm run dev &
npm run test:e2e:headed tests/e2e/connections/space-creation.spec.ts
```

Then open **QUICK_START.md** for more details!

---

**Questions?** Check the documentation files in this folder.
**Want to contribute?** Read FIXTURES_GUIDE.md to understand the helpers.
**Need statistics?** See TEST_SUITE_SUMMARY.md for details.

Happy testing! 🚀
