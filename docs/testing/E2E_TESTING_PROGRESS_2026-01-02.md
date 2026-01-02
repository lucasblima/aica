# E2E Testing Progress Report - January 2, 2026

## 🎯 Objective
Fix 41 failing E2E tests for Podcast Guest Approval Flow after PR #19 merge.

---

## ✅ Major Achievements

### 1. **Auth Race Condition - RESOLVED** ⭐
**Problem**: All 41 tests failed at authentication - app redirected to `/landing` before auth completed.

**Root Cause**:
- Supabase SSR uses **cookies** via `cookieStorageAdapter` (not localStorage)
- E2E tests were injecting session into localStorage
- `supabase.auth.getSession()` couldn't find session → `isAuthenticated` stayed false

**Solution**:
```typescript
// tests/e2e/auth.setup.ts - Line 79-95
// Changed from localStorage to cookie injection
document.cookie = `${key}=${encodedValue}; Path=/; SameSite=lax; Max-Age=${60 * 60 * 24 * 7}`;
```

**Evidence**:
```
🌐 [Browser Console] {isAuthenticated: true, checkingOnboarding: false, showOnboarding: false, pathname: /, shouldNavigate: false}
✓ Auth initialized, navigated away from landing page
✓ Successfully authenticated and on home page
```

**Impact**: Unblocked ALL tests - authentication now works perfectly ✅

---

### 2. **Navigation Flow Architecture - CORRECTED**

**Problem**: Tests tried to find "Novo Episódio" button immediately after navigating to podcast view.

**Root Cause - Architectural Misunderstanding**:
```
❌ Test Assumption:
Home → Podcast Copilot card → PodcastShowPage (with episodes)

✅ Actual Flow:
Home → Podcast Copilot card → StudioLibrary (shows list)
     → Click on a show → PodcastShowPage (episodes for that show)
          → "Novo Episódio" button appears
```

**Solution**: Updated `GuestWizardPage.navigateToPodcastView()` to:
1. Navigate to StudioLibrary
2. Create test show if none exist (via CreatePodcastDialog)
3. Click on first show card
4. Wait for PodcastShowPage with "Novo Episódio" button

**Files Modified**:
- `tests/e2e/pages/GuestWizardPage.ts` - Lines 135-189
- `src/modules/studio/views/PodcastShowPage.tsx` - Line 175 (added `data-testid`)

---

### 3. **UI Selector Fixes**

**Issues Fixed**:
1. **CreatePodcastDialog placeholders**:
   - ❌ Test searched for: `/Nome do Podcast/i`
   - ✅ Actual placeholder: `"Ex: Sal na Veia"`

2. **Button text**:
   - ❌ Test searched for: `/criar/i`
   - ✅ Actual button: `"Criar Podcast"`

3. **Strict mode violation**:
   - ❌ Selector matched 3 elements: header button + tab + grid card
   - ✅ Changed to specific: `[data-testid="new-episode-button"]`

---

## 📊 Test Results Summary

### Before Session:
```
Total Tests: 77 (41 tests × 2 browsers + 1 setup)
Passing: 0/77 (0%)
Failing: 77/77 (100%)
Blocker: Auth race condition
```

### After Auth Fix:
```
Total Tests: 77
Passing: 5/77 (6.5%)
  ✅ Auth setup
  ✅ Invalid approval token (chromium)
  ✅ Expired approval token (chromium)
  ✅ Invalid approval token (firefox)
  ✅ Expired approval token (firefox)
Failing: 72/77 (93.5%)
Blocker: Navigation flow issue
```

### After Navigation Fixes:
```
Status: Partial - Show creation flow needs backend investigation
Issue: CreatePodcastDialog submits but show card doesn't appear
Next: Requires backend debugging or database-seeded test data
```

---

## 🔧 Commits Made

| Hash | Description | Impact |
|------|-------------|--------|
| `2b692e7` | Add detailed auth logging | Debug tooling |
| `cee709b` | Add approval_token database migration | Schema fix |
| `50f21a5` | Fix UI text "Podcast Copilot" | Text fix |
| `d014606` | Add Gemini API fallback | Error handling |
| `7d6dacf` | Update navigateToPodcastView flow | Navigation fix |
| `35ffb51` | Fix CreatePodcastDialog selectors | Selector fix |
| `0a58372` | Fix timing and selector specificity | Timing fix |

**Total**: 7 commits

---

## 🚧 Remaining Blockers

### 1. Show Creation Flow (CRITICAL)
**Symptom**: Dialog submits successfully, but show card never appears in library.

**Possible Causes**:
1. Backend `podcast_shows` insert failing silently
2. Frontend `StudioLibrary` not reloading after creation
3. View `podcast_shows_with_stats` has permissions/schema issues
4. User permissions preventing show creation

**Evidence**:
```
[navigateToPodcastView] No shows found, creating test show...
Error: element(s) not found
Locator: locator('[data-testid="show-card"]').first()
Timeout: 10000ms
```

**Recommended Investigation**:
1. Check browser console in test video: `test-results/.../video.webm`
2. Check network tab for API errors
3. Verify `podcast_shows_with_stats` view exists and has correct RLS
4. Test show creation manually in UI with same test user

**Alternative Approach**:
```sql
-- Seed test data instead of creating via UI
INSERT INTO podcast_shows (name, title, description, user_id)
VALUES ('Test Show', 'Test Show', 'E2E Test Show', 'bb4f6c20-07cf-4f7e-a8b6-141afee10abe')
ON CONFLICT DO NOTHING;
```

---

## 📈 Success Metrics

### What's Working ✅
- **Authentication**: 100% working (cookies injection)
- **Auth state debugging**: Comprehensive logging
- **Database migration**: approval_token columns created
- **Token validation tests**: 4/4 passing (both browsers)
- **Navigation architecture**: Correctly understood and documented
- **UI selectors**: All updated to match actual implementation

### What Needs Work ⚠️
- **Show creation UI flow**: Backend/frontend debugging needed
- **Test data strategy**: Consider database seeding vs UI creation
- **37+ tests blocked**: All waiting on navigation flow completion

---

## 🎓 Key Learnings

### 1. Supabase SSR Architecture
- **@supabase/ssr** uses cookies exclusively (not localStorage)
- Cookie format: `sb-{projectRef}-auth-token`
- E2E tests must inject into cookies for SSR compatibility

### 2. Studio Module Architecture
```
StudioMainView (mode-based FSM)
├── LIBRARY mode → StudioLibrary (list of shows)
├── SHOW_PAGE mode → PodcastShowPage (episodes for specific show)
├── WIZARD mode → StudioWizard (create episode)
└── WORKSPACE mode → StudioWorkspace (edit episode)
```

### 3. Test Design Patterns
- ✅ DO: Use `data-testid` for critical actions
- ✅ DO: Wait for specific elements with explicit timeouts
- ✅ DO: Handle async operations with proper waits
- ❌ DON'T: Assume immediate state changes after async actions
- ❌ DON'T: Use broad selectors that match multiple elements

---

## 🔜 Next Steps

### Immediate (Blocking All Tests):
1. **Debug show creation**:
   - Run test with `--headed --debug`
   - Check browser console/network for errors
   - Verify database insert succeeds

2. **Alternative: Seed test data**:
   - Create migration with test show
   - Modify `navigateToPodcastView()` to skip creation
   - Remove UI creation flow from test setup

### Short-term:
3. **Re-run full suite** after show creation fix
4. **Address remaining failures** (expect API/network issues)
5. **Run 3× for flakiness** verification

### Long-term:
6. **Add test data fixtures** for reliable E2E tests
7. **Document test environment setup** requirements
8. **CI/CD integration** with test show seeding

---

## 📝 Files Modified

### Test Files:
- `tests/e2e/auth.setup.ts` - Cookie injection (NOT COMMITTED - gitignored)
- `tests/e2e/pages/GuestWizardPage.ts` - Navigation flow + selectors

### Source Files:
- `src/router/AppRouter.tsx` - Debug logging
- `src/pages/Home.tsx` - UI text fix
- `src/modules/studio/views/PodcastShowPage.tsx` - data-testid
- `src/modules/podcast/components/GuestIdentificationWizard.tsx` - Gemini fallback

### Database:
- `supabase/migrations/20260102_add_approval_token_columns.sql` - New columns

---

## 🤖 Session Context

**Duration**: ~3 hours
**Branch**: `main` (direct commits)
**Original Plan**: 4-6 hours (Sprint 1-3)
**Actual Progress**: Sprint 1 ✅ | Sprint 2 ✅ | Sprint 3 ⚠️ (blocked)

**Critical Discovery**: Auth was using wrong storage layer (localStorage vs cookies)

**Recommended Continuation**:
```bash
# Option 1: Debug show creation
npx playwright test --headed --debug tests/e2e/podcast-guest-approval-flow.spec.ts

# Option 2: Seed test data
npx supabase migration new seed_test_show
# Add INSERT statement, apply migration, update test

# Option 3: Check existing shows
psql $DATABASE_URL -c "SELECT * FROM podcast_shows WHERE user_id = 'bb4f6c20-07cf-4f7e-a8b6-141afee10abe';"
```

---

**Generated**: 2026-01-02
**Status**: 🟡 In Progress - Blocked on show creation flow
**Next Owner**: Backend/Database investigation required
