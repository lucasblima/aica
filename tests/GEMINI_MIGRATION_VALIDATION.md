# Gemini Migration Validation Checklist

Use this checklist to validate that the Gemini migration to secure backend is complete and working correctly.

## Pre-Test Setup

- [ ] Backend servers are running:
  - [ ] Supabase Edge Functions deployed
  - [ ] Python API server running (port 8001)
  - [ ] Frontend dev server running (port 3000)

- [ ] Environment variables configured:
  ```bash
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your_anon_key
  VITE_LLM_API_URL=http://localhost:8001
  TEST_EMAIL=your_test_email@example.com
  TEST_PASSWORD=your_test_password
  ```

- [ ] Test user exists in Supabase
- [ ] Playwright browsers installed (`npx playwright install`)

## Test Execution

### 1. Authentication Setup

```bash
npx playwright test auth.setup.ts --headed
```

- [ ] Google OAuth flow completes successfully
- [ ] Session saved to `tests/e2e/.auth.json`
- [ ] No errors in console

### 2. Podcast Module Tests

```bash
npx playwright test podcast-gemini-integration.spec.ts
```

**Expected Results:**
- [ ] ✅ Guest suggestion works (< 10s)
- [ ] ✅ Theme suggestion works (< 10s)
- [ ] ✅ Dossier generation works (< 30s)
- [ ] ✅ All sections present (biography, controversies, topics, ice breakers)
- [ ] ✅ Loading states appear correctly
- [ ] ✅ API key NOT exposed in network
- [ ] ✅ Error handling works

**Pass Rate Target:** 9/10 tests (90%+)

### 3. Finance Module Tests

```bash
npx playwright test finance-gemini-integration.spec.ts
```

**Expected Results:**
- [ ] ✅ PDF upload interface available
- [ ] ✅ No CPF/CNPJ displayed (PII sanitization works)
- [ ] ✅ Finance Agent chat responds (< 10s)
- [ ] ✅ Context maintained across conversation
- [ ] ✅ Quick analyses work (spending, predictions, savings)
- [ ] ✅ API key NOT exposed
- [ ] ✅ Authentication required

**Pass Rate Target:** 10/12 tests (83%+)

### 4. Memory Module Tests

```bash
npx playwright test memory-gemini-integration.spec.ts
```

**Expected Results:**
- [ ] ✅ Insights extracted from messages (sentiment, triggers, subjects)
- [ ] ✅ Sentiment correctly identified
- [ ] ✅ Triggers detected
- [ ] ✅ Life subjects categorized
- [ ] ✅ Semantic search works
- [ ] ✅ Daily reports generated
- [ ] ✅ Contact context extracted
- [ ] ✅ Work items suggested

**Pass Rate Target:** 12/15 tests (80%+)

### 5. Atlas Module Tests

```bash
npx playwright test atlas-categorization.spec.ts
```

**Expected Results:**
- [ ] ✅ Auto-categorization while typing works
- [ ] ✅ Debouncing prevents excessive API calls (< 5 calls)
- [ ] ✅ Correct categories suggested for different tasks
- [ ] ✅ Accept/reject functionality works
- [ ] ✅ No API calls for very short text (< 3 chars)
- [ ] ✅ Categorization completes < 5s
- [ ] ✅ API key NOT exposed

**Pass Rate Target:** 9/10 tests (90%+)

### 6. Security Tests

```bash
npx playwright test gemini-security-performance.spec.ts --grep "Security"
```

**CRITICAL - All must pass:**
- [ ] ✅ API key NEVER exposed in network URLs
- [ ] ✅ API key NEVER exposed in request headers
- [ ] ✅ API key NEVER exposed in POST bodies
- [ ] ✅ API key NEVER in localStorage
- [ ] ✅ API key NEVER in cookies
- [ ] ✅ API key NEVER in bundled JavaScript
- [ ] ✅ All requests routed through backend
- [ ] ✅ JWT authentication required
- [ ] ✅ Unauthenticated requests blocked
- [ ] ✅ PII sanitized (no CPF/CNPJ in Finance UI)

**Pass Rate Target:** 10/10 tests (100% - MANDATORY)

### 7. Performance Tests

```bash
npx playwright test gemini-security-performance.spec.ts --grep "Performance"
```

**Expected Results:**
- [ ] ✅ Edge Functions respond < 10s
- [ ] ✅ Python server responds < 60s (if tested)
- [ ] ✅ Cache improves response time by 50%+
- [ ] ✅ Concurrent requests don't block each other
- [ ] ✅ Retry mechanism works (2+ attempts on failure)
- [ ] ✅ No memory leaks in long conversations

**Pass Rate Target:** 5/5 tests (100%)

## Overall Validation

### Test Summary

```bash
# Run all Gemini tests
npx playwright test podcast-gemini finance-gemini memory-gemini atlas-categorization gemini-security

# Generate report
npx playwright show-report
```

**Total Tests:** 62
**Required Pass Rate:** 55/62 (88%+)

### Critical Checks (Must ALL Pass)

- [ ] ✅ **SECURITY:** No API key exposed anywhere
- [ ] ✅ **SECURITY:** All requests authenticated (JWT)
- [ ] ✅ **SECURITY:** Backend routing verified
- [ ] ✅ **LGPD:** PII sanitization works (no CPF/CNPJ)
- [ ] ✅ **PERFORMANCE:** Edge Functions < 10s
- [ ] ✅ **RELIABILITY:** Error handling works
- [ ] ✅ **RELIABILITY:** Retry mechanism works

### Known Acceptable Failures

Some tests may fail due to UI differences or test data availability:
- Memory module tests (if no test data exists)
- Contact context tests (if no contacts)
- PDF processing (if no test PDF uploaded)
- News analysis (if feature not in current UI)

**These are acceptable IF:**
- Tests skip gracefully with clear messages
- Core functionality works when tested manually
- Security and performance tests ALL pass

## Manual Validation

After automated tests pass, validate manually:

### 1. Podcast Module

- [ ] Go to `/podcast/pre-production`
- [ ] Click "Sugerir Convidado"
- [ ] Verify suggestion appears within 10s
- [ ] Open DevTools Network tab
- [ ] Verify no requests to `generativelanguage.googleapis.com`
- [ ] Verify requests go to `/functions/v1/gemini-chat`

### 2. Finance Module

- [ ] Go to `/finance/chat`
- [ ] Send message: "Quanto gastei no último mês?"
- [ ] Verify response within 10s
- [ ] Check for R$ values in response
- [ ] Verify NO CPF/CNPJ patterns displayed

### 3. Memory Module

- [ ] Go to `/memory`
- [ ] Add a message with clear sentiment
- [ ] Wait for processing
- [ ] Verify sentiment badge appears
- [ ] Verify triggers/subjects detected

### 4. Atlas Module

- [ ] Go to `/atlas`
- [ ] Click "Add Task"
- [ ] Type "Preparar apresentação de vendas"
- [ ] Wait 2 seconds (debounce)
- [ ] Verify category auto-suggested as "Trabalho"

## Rollback Criteria

**STOP and ROLLBACK if:**

1. ❌ API key exposed in ANY network request
2. ❌ Unauthenticated users can access Gemini endpoints
3. ❌ PII (CPF/CNPJ) visible in Finance UI
4. ❌ Edge Functions consistently timeout (> 10s)
5. ❌ More than 30% of tests fail
6. ❌ Critical user flows broken (can't create tasks, can't chat)

## Success Criteria

**Migration is SUCCESSFUL if:**

1. ✅ All security tests pass (100%)
2. ✅ All performance tests pass (100%)
3. ✅ Overall pass rate > 88% (55/62 tests)
4. ✅ Manual validation confirms all features work
5. ✅ No API key exposure detected
6. ✅ PII sanitization verified
7. ✅ Error handling graceful
8. ✅ Response times acceptable

## Sign-Off

Date: _______________

**Tested By:** _______________

**Results:**
- Total Tests: _____ / 62
- Pass Rate: _____ %
- Security Tests: _____ / 10
- Performance Tests: _____ / 5

**Security Validation:**
- [ ] API key protection verified
- [ ] Backend routing verified
- [ ] Authentication verified
- [ ] PII sanitization verified

**Performance Validation:**
- [ ] Edge Functions < 10s
- [ ] Python server < 60s (if applicable)
- [ ] Cache working
- [ ] Retry mechanism working

**Decision:**
- [ ] ✅ APPROVED - Migration successful, deploy to production
- [ ] ⚠️ CONDITIONAL - Minor issues, fix before production
- [ ] ❌ REJECTED - Critical issues, rollback required

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________

## Next Steps

### If Approved:
1. Deploy Edge Functions to production
2. Deploy Python server to production
3. Update environment variables
4. Monitor performance metrics
5. Set up alerts for errors

### If Conditional:
1. Document issues found
2. Create fix tickets
3. Re-run validation after fixes
4. Get second approval

### If Rejected:
1. Document critical issues
2. Rollback to previous version
3. Plan remediation
4. Schedule re-test

## Support

Questions or issues during validation:
- Review [Gemini E2E Testing Guide](../docs/GEMINI_E2E_TESTS.md)
- Check test reports: `npx playwright show-report`
- Contact: [Your team contact info]
