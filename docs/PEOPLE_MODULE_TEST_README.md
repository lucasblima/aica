# People Module E2E Test Suite

Comprehensive Playwright E2E test suite for the People Module unified network management system.

## Test Suite Deliverables

- **File:** `tests/e2e/people-module.spec.ts`
- **Tests:** 42 comprehensive E2E tests
- **Coverage:** Navigation, network views, suggestions, alerts, linking, performance, accessibility, security

## Test Suites

1. **Page Navigation & View Modes** (7 tests)
   - Tab switching, badges, refresh button, loading states

2. **Network View - PeopleGraph** (6 tests)
   - Graph/list views, contact management, linking

3. **Suggestions View** (8 tests)
   - AI suggestions, acceptance/rejection, confidence scores

4. **Alerts View** (7 tests)
   - Health monitoring, dismissal, action items

5. **Contact-Space Linking** (3 tests)
   - Bidirectional linking and unlinking

6. **Performance** (2 tests)
   - Load time < 2 seconds, progressive rendering

7. **Accessibility** (3 tests)
   - ARIA labels, keyboard navigation, semantic HTML

8. **Error Handling** (2 tests)
   - Error messages, recovery mechanisms

9. **Security/RLS** (1 test)
   - User data isolation

10. **Edge Cases** (3 tests)
    - Empty states, rapid interactions, concurrent actions

11. **Auto-Sync Integration** (2 tests)
    - Background sync scheduling

12. **Podcast Integration** (1 test)
    - Guest to contact creation

13. **Mobile Responsiveness** (1 test)
    - Mobile viewport testing

## Quick Start

```bash
# Run all tests
npm run test:e2e -- people-module.spec.ts

# Debug mode
npm run test:e2e:ui -- people-module.spec.ts

# Specific test suite
npm run test:e2e -- people-module.spec.ts -g "Network View"

# View HTML report
npx playwright show-report
```

## Implementation Requirements

All components must include data-testid attributes:

### PeoplePage.tsx
- `people-header`, `people-tab-network/suggestions/alerts`
- `people-badge-*`, `people-refresh-btn`
- `people-loading`, `people-error-message`
- `people-view-*`, `contact-count`, `linked-pairs-count`

### PeopleGraph.tsx
- `graph-view-btn`, `list-view-btn`, `graph-canvas`
- `graph-node-contact-*`, `graph-node-space-*`
- `contact-action-panel`, `link-contact-*-space-*`
- `contact-list`, `contact-list-item-*`, `graph-empty-state`

### ContactSuggestionWidget.tsx
- `suggestions-widget`, `suggestion-item`, `suggestion-*-*`
- `suggestion-accept/reject-btn`
- `suggestion-confidence-*`, `suggestions-accepted/rejected-count`
- `suggestions-empty-state`

### HealthAlertBanner.tsx
- `alert-item`, `alert-*-*`, `alert-severity-*`
- `alert-health-score-*`, `alert-expand/dismiss-btn`
- `alert-expanded-content`, `alert-action-*`, `alerts-empty-state`

## Documentation Files

- **PEOPLE_MODULE_E2E_TESTIDS.md** - Complete data-testid specification
- **PEOPLE_MODULE_TEST_EXECUTION_GUIDE.md** - Detailed execution and maintenance guide
- **PEOPLE_MODULE_TESTS_SUMMARY.md** - High-level overview

## Test File Location

`tests/e2e/people-module.spec.ts`

## Page Object Models

The test suite uses 4 Page Object Model classes for maintainability:

1. **PeoplePagePO** - Main page interactions
2. **PeopleGraphPO** - Network visualization
3. **ContactSuggestionsPO** - Suggestions widget
4. **HealthAlertsPO** - Alerts banner

## Test Coverage

✅ All critical user flows
✅ Happy path and error scenarios
✅ Security/RLS boundary testing
✅ Accessibility validation
✅ Performance benchmarking
✅ Mobile responsiveness
✅ Edge cases and race conditions

## Success Criteria

- All 42 tests passing
- Execution time < 5 minutes
- 0% flakiness (no retries)
- HTML report generated
- No unhandled exceptions

## Common Issues

**Timeout on selectors:**
Ensure component has data-testid attributes per specification

**Auth failures:**
Verify test user credentials in .env.local

**Empty state tests:**
Use fresh test accounts or seed test data

**Performance failures:**
Check network requests and loading optimization

See full troubleshooting guide in execution documentation.

## Next Steps

1. Add data-testid attributes to components
2. Run tests in UI mode: `npm run test:e2e:ui`
3. Fix failing tests using execution guide
4. Generate HTML report
5. Integrate into CI/CD

---

**Status:** Ready for implementation
**Maintenance:** Testing & QA Agent
**Created:** January 8, 2026
