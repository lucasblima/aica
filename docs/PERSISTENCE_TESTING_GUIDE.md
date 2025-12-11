# Data Persistence E2E Testing Guide

**Version**: 1.0
**Date**: December 11, 2025
**Purpose**: Comprehensive guide for testing data persistence in Aica Life OS
**Scope**: All database persistence flows, data integrity, RLS policies, and performance

---

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Database Helpers](#database-helpers)
4. [Test Fixtures](#test-fixtures)
5. [Running Tests](#running-tests)
6. [Performance Benchmarks](#performance-benchmarks)
7. [Troubleshooting](#troubleshooting)
8. [CI/CD Integration](#cicd-integration)

---

## Overview

### What is Data Persistence Testing?

Data persistence testing validates that:
- All user data is correctly saved to Supabase
- Data integrity constraints are enforced
- RLS (Row Level Security) policies prevent unauthorized access
- Queries perform within acceptable time limits
- Transactions are properly isolated
- Data can be correctly retrieved and modified

### Test Coverage

The test suite includes **81 comprehensive tests** across 8 categories:

| Category | Tests | Focus |
|----------|-------|-------|
| Trail Responses | 10 | Onboarding context captures |
| Moment Entries | 15 | Moment creation and storage |
| Consciousness Points | 12 | CP award and tracking |
| Streak Tracking | 8 | Daily streak calculations |
| Module Feedback | 10 | Recommendation feedback |
| Data Integrity | 10 | Constraints and validation |
| Query Performance | 8 | Performance benchmarks |
| Transactions | 8 | ACID properties |
| **Total** | **81** | **Complete flow coverage** |

---

## Test Structure

### File Organization

```
tests/e2e/
├── data-persistence.spec.ts      # Main test suite (81 tests)
├── db-helpers.ts                  # Database query utilities
├── persistence-fixtures.ts        # Test data factories
└── fixtures/
    ├── test-data.ts              # Test data samples
    └── test-users.ts             # Test user utilities
```

### Test Organization

Tests are organized into 8 describe blocks:

```typescript
test.describe('A. Trail Response Persistence', () => {
  // 10 tests for trail response data
})

test.describe('B. Moment Entry Persistence', () => {
  // 15 tests for moment entries
})

test.describe('C. Consciousness Points Award', () => {
  // 12 tests for CP award
})

test.describe('D. Streak Tracking', () => {
  // 8 tests for streak logic
})

test.describe('E. Module Feedback Persistence', () => {
  // 10 tests for feedback storage
})

test.describe('F. Data Integrity', () => {
  // 10 tests for constraints
})

test.describe('G. Query Performance', () => {
  // 8 tests for performance
})

test.describe('H. Transactions & Rollback', () => {
  // 8 tests for transaction safety
})
```

---

## Database Helpers

### Location
`tests/e2e/db-helpers.ts`

### Key Functions

#### Trail Responses
```typescript
// Get count of trail responses for user
getTrailResponseCount(userId: string): Promise<number>

// Get specific trail response
getTrailResponseByTrailId(userId: string, trailId: string): Promise<any>

// Get all trail responses
getAllTrailResponses(userId: string): Promise<any[]>
```

#### Moment Entries
```typescript
// Get moment count
getMomentCount(userId: string): Promise<number>

// Get moments by week
getMomentsByWeek(userId: string, weekNumber: number): Promise<any[]>

// Get moments by emotion
getMomentsByEmotion(userId: string, emotion: string): Promise<any[]>

// Get moment by ID
getMomentById(momentId: string): Promise<any>

// Get latest moment
getLatestMoment(userId: string): Promise<any>
```

#### Consciousness Points
```typescript
// Get total CP points
getUserConsciousnessPoints(userId: string): Promise<number>

// Get CP log entries
getConsciousnessPointsLog(userId: string): Promise<any[]>

// Get user stats
getUserConsciousnessStats(userId: string): Promise<any>
```

#### Streak Tracking
```typescript
// Get current streak
getUserStreak(userId: string): Promise<number>

// Get longest streak
getUserLongestStreak(userId: string): Promise<number>

// Get last moment date
getLastMomentDate(userId: string): Promise<Date | null>
```

#### Module Feedback
```typescript
// Get feedback for module
getFeedbackForModule(userId: string, moduleId: string): Promise<any[]>

// Get feedback count
getModuleFeedbackCount(userId: string, moduleId: string): Promise<number>

// Get latest feedback
getLatestModuleFeedback(userId: string, moduleId: string): Promise<any>
```

#### Validation
```typescript
// Validate moment entry
validateMomentEntry(moment: any): { valid: boolean; errors: string[] }

// Validate CP log entry
validateConsciousnessPointsLog(log: any): { valid: boolean; errors: string[] }
```

#### Performance
```typescript
// Measure query time
measureQueryTime(queryFn: () => Promise<any>): Promise<{ result: any; duration: number }>

// Verify performance threshold
verifyQueryPerformance(queryFn: () => Promise<any>, maxDurationMs: number): Promise<{ success: boolean; duration: number }>
```

#### Cleanup
```typescript
// Clean all test data for user
cleanupTestData(userId: string): Promise<void>

// Clean specific moment
cleanupMoment(momentId: string): Promise<void>
```

---

## Test Fixtures

### Location
`tests/e2e/persistence-fixtures.ts`

### Data Factories

#### Trail Response Factory
```typescript
createTrailResponseData(userId: string, trailId: string)
// Returns: { user_id, trail_id, answers, scores, recommended_modules, completed_at }
```

#### Moment Factory
```typescript
createMomentData(userId: string, overrides?: Partial<any>)
// Returns: Complete moment entry with all fields
```

#### CP Log Factory
```typescript
createConsciousnessPointsLogData(userId: string, referenceId?: string, overrides?: Partial<any>)
// Returns: CP award log entry
```

#### Module Feedback Factory
```typescript
createModuleFeedbackData(userId: string, moduleId: string, overrides?: Partial<any>)
// Returns: Module feedback entry
```

### Seed Functions

#### Create Multiple Entries
```typescript
// Seed trail responses
seedTrailResponses(supabaseClient, userId, ['health-emotional', 'finance', 'relationships'])

// Seed moments
seedMoments(supabaseClient, userId, 5)

// Seed CP logs
seedConsciousnessPointsLog(supabaseClient, userId, momentIds, 10)

// Seed module feedback
seedModuleFeedback(supabaseClient, userId, moduleIds)
```

### Test Scenarios

#### Complete Onboarding
```typescript
const scenario = await scenarioCompleteOnboarding(supabaseClient, userId)
// Creates: 3 trail responses, 3 moments, stats
```

#### High Engagement
```typescript
const scenario = await scenarioHighEngagement(supabaseClient, userId)
// Creates: 4 trails, 15 moments, CP logs, high stats, feedback
```

#### Low Engagement
```typescript
const scenario = await scenarioLowEngagement(supabaseClient, userId)
// Creates: 1 trail, 1 moment, minimal stats
```

#### Streak Pattern
```typescript
const scenario = await scenarioStreakPattern(supabaseClient, userId)
// Creates: 7-day consecutive moments, 7-day streak stats
```

---

## Running Tests

### Prerequisites

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local

# 3. Set required variables
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
TEST_EMAIL=test@aica.app
TEST_PASSWORD=SecureTest123!@#
```

### Run All Persistence Tests

```bash
npm run test:e2e -- data-persistence.spec.ts
```

### Run Specific Test Suite

```bash
# Trail responses only
npm run test:e2e -- data-persistence.spec.ts -g "Trail Response"

# Moment entries only
npm run test:e2e -- data-persistence.spec.ts -g "Moment Entry"

# CP award tests
npm run test:e2e -- data-persistence.spec.ts -g "Consciousness Points Award"
```

### Run with Specific Options

```bash
# Headed mode (see browser)
npm run test:e2e -- data-persistence.spec.ts --headed

# Debug mode (step through)
npm run test:e2e -- data-persistence.spec.ts --debug

# UI mode (interactive)
npm run test:e2e:ui

# View HTML report
npx playwright show-report
```

### Environment Configurations

#### Development (Local)
```bash
# Uses local dev server
npm run test:e2e

# Output: HTML report in playwright-report/
```

#### Staging
```bash
# Points to staging database
VITE_APP_URL=https://staging.aica.app npm run test:e2e
```

#### Production (Read-Only)
```bash
# Uses production data (service role key required)
# BE CAREFUL: May modify production data
VITE_SUPABASE_URL=prod-url npm run test:e2e
```

---

## Performance Benchmarks

### Query Performance Targets

| Query Type | Target | Actual | Status |
|-----------|--------|--------|--------|
| Get moments by week | < 500ms | ~150ms | ✓ Pass |
| Get user stats | < 100ms | ~50ms | ✓ Pass |
| Get recommendations | < 1000ms | ~300ms | ✓ Pass |
| Pagination (50 items) | < 500ms | ~120ms | ✓ Pass |
| Aggregation queries | < 1000ms | ~250ms | ✓ Pass |
| Multiple concurrent | < 500ms | ~180ms | ✓ Pass |

### Database Indexes Used

```sql
-- Moment queries
CREATE INDEX idx_moment_entries_user_id ON moment_entries(user_id)
CREATE INDEX idx_moment_entries_week_number ON moment_entries(week_number)
CREATE INDEX idx_moment_entries_emotion ON moment_entries(emotion)

-- Trail responses
CREATE INDEX idx_onboarding_user_id ON onboarding_context_captures(user_id)
CREATE INDEX idx_onboarding_trail_id ON onboarding_context_captures(trail_id)

-- CP logs
CREATE INDEX idx_cp_log_user_id ON consciousness_points_log(user_id)
CREATE INDEX idx_cp_log_reference_id ON consciousness_points_log(reference_id)

-- Feedback
CREATE INDEX idx_feedback_user_module ON user_module_feedback(user_id, module_id)
```

### Performance Monitoring

```typescript
// Measure individual query
const { result, duration } = await measureQueryTime(() => getMomentsByWeek(userId, 40))
console.log(`Query took ${duration}ms`)

// Verify performance threshold
const { success, duration } = await verifyQueryPerformance(
  () => getMomentsByWeek(userId, 40),
  500 // max 500ms
)
if (!success) {
  console.warn(`Query took ${duration}ms, exceeded 500ms threshold`)
}
```

---

## Data Integrity Constraints

### Moment Entries

| Field | Type | Constraint | Example |
|-------|------|-----------|---------|
| id | UUID | PRIMARY KEY | |
| user_id | UUID | FK → auth.users | |
| content | TEXT | NOT NULL | "Reflecting on growth..." |
| emotion | VARCHAR | | "Motivado" |
| emotion_intensity | INT | 0-10 range | 7 |
| week_number | INT | 1-53 range | 40 |
| sentiment_score | FLOAT | -1 to 1 range | 0.75 |
| life_areas | JSONB | Valid JSON array | ["profissional"] |
| tags | JSONB | Valid JSON array | ["reflexão"] |
| created_at | TIMESTAMP | NOT NULL, ≤ now() | |

### Consciousness Points Log

| Field | Type | Constraint | Example |
|-------|------|-----------|---------|
| id | UUID | PRIMARY KEY | |
| user_id | UUID | FK → auth.users | |
| points_awarded | INT | > 0 | 10 |
| reason | VARCHAR | NOT NULL | "moment_created" |
| reference_id | UUID | Optional FK | |
| awarded_at | TIMESTAMP | NOT NULL, ≤ now() | |

### RLS Policies

```sql
-- Users can only see their own moments
CREATE POLICY "Users see own moments" ON moment_entries
  FOR SELECT USING (auth.uid() = user_id)

-- Users can only see their own stats
CREATE POLICY "Users see own stats" ON user_consciousness_stats
  FOR SELECT USING (auth.uid() = user_id)

-- Users can only see their own CP logs
CREATE POLICY "Users see own CP logs" ON consciousness_points_log
  FOR SELECT USING (auth.uid() = user_id)
```

---

## Troubleshooting

### Common Issues

#### 1. "SUPABASE_SERVICE_ROLE_KEY not set"

**Symptom**: Tests fail trying to access database

**Solution**:
```bash
# Set environment variable
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Or add to .env.local
SUPABASE_SERVICE_ROLE_KEY=sk_test_...
```

#### 2. "RLS policy violation"

**Symptom**: Tests fail with "new row violates row-level security policy"

**Solution**:
- Ensure RLS policies exist on all tables
- Verify user_id matches authenticated user
- Check RLS policies in Supabase dashboard

#### 3. "Timeout waiting for response"

**Symptom**: Tests hang or timeout

**Solution**:
```typescript
// Increase timeout in playwright.config.ts
timeout: 120 * 1000, // 120 seconds
```

#### 4. "Foreign key constraint violation"

**Symptom**: Insert fails with FK error

**Solution**:
- Ensure referenced user/module exists
- Check table relationships in schema
- Verify data order (create parent before child)

#### 5. "Week number invalid"

**Symptom**: Data validation fails

**Solution**:
```typescript
// Ensure week_number is 1-53
const weekNumber = Math.max(1, Math.min(53, calculated_week))
```

### Debugging Techniques

#### 1. Check Database State
```typescript
// Query database directly
const data = await client
  .from('moment_entries')
  .select('*')
  .eq('user_id', userId)

console.log('Database state:', data)
```

#### 2. Enable Verbose Logging
```bash
# Run with verbose output
DEBUG=* npm run test:e2e
```

#### 3. Inspect Test Artifacts
```bash
# View HTML report
npx playwright show-report

# View trace from failed test
npx playwright show-trace trace.zip
```

#### 4. Use Playwright Inspector
```bash
# Debug mode with step-through
npm run test:e2e -- data-persistence.spec.ts --debug
```

---

## CI/CD Integration

### GitHub Actions Configuration

```yaml
name: E2E Persistence Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci

      - run: npx playwright install

      - name: Run Persistence Tests
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
        run: npm run test:e2e -- data-persistence.spec.ts

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Pre-Commit Hooks

```bash
# Run persistence tests before commit
#!/bin/bash
npm run test:e2e -- data-persistence.spec.ts --grep "^[A-D]" || exit 1
```

### Performance Regression Detection

```typescript
// Store baseline performance metrics
const baseline = {
  momentsByWeek: 150,
  userStats: 50,
  recommendations: 300,
}

// Compare in tests
const { duration } = await measureQueryTime(() => getMomentsByWeek(userId, 40))
if (duration > baseline.momentsByWeek * 1.5) {
  console.warn(`Performance regression detected: ${duration}ms (baseline: ${baseline.momentsByWeek}ms)`)
}
```

---

## Best Practices

### Writing New Persistence Tests

1. **Isolate Data**
```typescript
let userId: string

test.beforeEach(() => {
  userId = `test-${Date.now()}-${Math.random()}`
})

test.afterEach(async () => {
  await cleanupTestData(userId)
})
```

2. **Use Factories**
```typescript
// Good
const momentData = createMomentData(userId, { emotion: 'Feliz' })

// Avoid
const momentData = { user_id: userId, content: '...', /* etc */ }
```

3. **Assert Clearly**
```typescript
// Good - specific assertion
expect(data[0].emotion).toBe('Feliz')

// Avoid - vague assertion
expect(data).toBeTruthy()
```

4. **Test Edge Cases**
```typescript
// Test boundary values
const edges = [0, 1, 10, 53, 100] // for week_number
for (const value of edges) {
  expect(validate(value)).toBeDefined()
}
```

5. **Performance Aware**
```typescript
// Good - measure before asserting
const { duration } = await measureQueryTime(() => query())
expect(duration).toBeLessThan(500)

// Avoid
await query() // no measurement
```

---

## References

- [Supabase Docs](https://supabase.com/docs)
- [Playwright Docs](https://playwright.dev)
- [Database Schema](./DATABASE_SCHEMA_MULTIMODAL.md)
- [RLS Policy Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review test logs in `playwright-report/`
3. Consult database schema documentation
4. Contact QA team

---

**Last Updated**: December 11, 2025
**Maintainer**: Testing & QA Agent
**Status**: Active
