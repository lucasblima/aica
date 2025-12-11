# Staging Test Plan - Guest Identification Wizard

> **Version**: 1.0
> **Last Updated**: 2024-12-10
> **Feature**: Guest Identification Wizard (Public Figure + Common Person flows)
> **Estimated Time**: 45 minutes

---

## Test Objectives

1. Verify Guest Identification Wizard works end-to-end in staging
2. Validate database schema changes (guest_phone, guest_email columns)
3. Ensure RLS policies work correctly
4. Confirm UX/UI meets requirements
5. Test error handling and edge cases
6. Validate performance and accessibility

---

## Pre-Test Setup

### Environment
- [ ] Staging environment URL: https://staging.yourdomain.com
- [ ] Test user account created and credentials available
- [ ] Browser: Latest Chrome/Firefox
- [ ] DevTools open (Console, Network, Performance tabs)

### Database Verification
```sql
-- Verify schema changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'episodes'
  AND column_name IN ('guest_phone', 'guest_email');

-- Expected result:
-- guest_phone | character varying | YES
-- guest_email | character varying | YES
```

### Tools
- [ ] Browser DevTools
- [ ] Supabase Dashboard access
- [ ] Screen recording tool (optional, for bug reports)

---

## Test Scenarios

### 1. Smoke Tests (5 min)

#### 1.1 Application Health
- [ ] Navigate to https://staging.yourdomain.com
- [ ] Homepage loads without errors
- [ ] No console errors in DevTools
- [ ] Authentication working (login/logout)

#### 1.2 Module Access
- [ ] Navigate to Podcast module
- [ ] Dashboard renders correctly
- [ ] "Criar Episódio" button visible
- [ ] No 404 or routing errors

**Expected**: All pages load successfully, no critical errors.

---

### 2. Guest Identification Wizard - UI/UX (10 min)

#### 2.1 Wizard Launch
**Steps**:
1. Navigate to Podcast Dashboard
2. Click "Criar Episódio" button

**Verify**:
- [ ] Modal opens smoothly (animation)
- [ ] Modal centered on screen
- [ ] Backdrop visible (darkened background)
- [ ] Close button (X) visible in top-right
- [ ] ESC key closes modal
- [ ] Click outside modal closes it

**Expected**: Modal opens with smooth animation, no layout shifts.

#### 2.2 Step 0 - Guest Type Selection
**Verify**:
- [ ] Title: "Identificação do Convidado"
- [ ] Subtitle/description visible
- [ ] Two cards visible:
  - "Figura Pública" (with icon)
  - "Contato Direto" (with icon)
- [ ] Hover effect on cards (elevation, border)
- [ ] Click selects card (visual feedback)
- [ ] "Continuar" button appears/enables after selection
- [ ] Step indicator shows "Step 0" or progress

**Expected**: Clean UI, clear selection states, accessible cards.

#### 2.3 Responsiveness
**Steps**:
1. Resize browser to mobile width (375px)
2. Resize to tablet width (768px)
3. Resize to desktop (1920px)

**Verify**:
- [ ] Modal adapts to screen size
- [ ] Cards stack vertically on mobile
- [ ] Text remains readable
- [ ] Buttons accessible
- [ ] No horizontal scroll

**Expected**: Responsive design works across all breakpoints.

---

### 3. Public Figure Flow (15 min)

#### 3.1 Step 1a - Guest Search
**Steps**:
1. Select "Figura Pública"
2. Click "Continuar"

**Verify**:
- [ ] Step advances to guest search
- [ ] Input field: "Nome do Convidado" visible
- [ ] Input field: "Referência" visible
- [ ] Placeholder text helpful
- [ ] "Buscar Perfil" button visible

**Test Case 1: Successful Search**
**Steps**:
1. Enter name: "Lula da Silva"
2. Enter reference: "Presidente do Brasil"
3. Click "Buscar Perfil"

**Verify**:
- [ ] Loading state appears (spinner/skeleton)
- [ ] Button disabled during search
- [ ] Network request visible in DevTools (check /api/guest-search or similar)
- [ ] Results appear within 5 seconds
- [ ] At least 1 profile returned
- [ ] Each profile shows:
  - Name
  - Bio preview
  - Source/reference
  - Select button

**Expected**: AI search returns relevant profiles quickly.

**Test Case 2: Empty Search**
**Steps**:
1. Leave name field empty
2. Click "Buscar Perfil"

**Verify**:
- [ ] Validation error appears
- [ ] Error message: "Nome é obrigatório" or similar
- [ ] Input field highlighted (red border)
- [ ] Search not triggered

**Expected**: Form validation prevents empty submissions.

**Test Case 3: No Results**
**Steps**:
1. Enter name: "ZxQwErTyAsdfGhjkl12345" (gibberish)
2. Enter reference: "Teste"
3. Click "Buscar Perfil"

**Verify**:
- [ ] No results message appears
- [ ] Message suggests trying different keywords
- [ ] No errors in console
- [ ] User can try again

**Expected**: Graceful handling of no results.

#### 3.2 Step 2 - Profile Selection
**Steps**:
1. Search for "Lula da Silva"
2. View results

**Verify**:
- [ ] Multiple profiles listed (if available)
- [ ] Each profile card clickable
- [ ] Click profile to select it
- [ ] Visual feedback on selection (checkmark, border)
- [ ] "Continuar" button appears/enables
- [ ] Can deselect and choose different profile

**Expected**: Easy profile selection with clear feedback.

#### 3.3 Step 3 - Episode Details (Public Figure)
**Steps**:
1. Select a profile
2. Click "Continuar"

**Verify**:
- [ ] Step advances to episode details
- [ ] Guest info displayed (read-only):
  - Name
  - Bio
- [ ] Episode form fields visible:
  - Episode title
  - Description
  - Additional notes (optional)
- [ ] "Criar Episódio" button visible
- [ ] "Voltar" button visible

**Test Case: Create Episode**
**Steps**:
1. Fill episode title: "Entrevista com Lula"
2. Fill description: "Discussão sobre política brasileira"
3. Click "Criar Episódio"

**Verify**:
- [ ] Loading state during creation
- [ ] Success message/toast appears
- [ ] Modal closes automatically
- [ ] Redirected to episode page or dashboard
- [ ] New episode visible in episodes list

**Database Verification**:
```sql
-- Check last created episode
SELECT
  id,
  user_id,
  guest_name,
  guest_bio,
  guest_phone,
  guest_email,
  created_at
FROM episodes
ORDER BY created_at DESC
LIMIT 1;

-- Expected:
-- guest_name: "Lula da Silva" (or selected profile)
-- guest_bio: (AI-generated bio)
-- guest_phone: NULL
-- guest_email: NULL
```

**Expected**: Episode created successfully with public figure data.

---

### 4. Common Person Flow (15 min)

#### 4.1 Step 1b - Manual Form
**Steps**:
1. Open wizard
2. Select "Contato Direto"
3. Click "Continuar"

**Verify**:
- [ ] Manual form renders (`GuestManualForm` component)
- [ ] Three input fields visible:
  - Nome completo
  - Telefone
  - Email
- [ ] Placeholder text helpful
- [ ] "Continuar" button visible but disabled

#### 4.2 Form Validation - Name
**Test Case 1: Empty Name**
**Steps**:
1. Leave name field empty
2. Click in another field (blur event)

**Verify**:
- [ ] Error message appears: "Nome é obrigatório"
- [ ] Input border turns red
- [ ] "Continuar" button remains disabled

**Test Case 2: Valid Name**
**Steps**:
1. Enter name: "João Silva"

**Verify**:
- [ ] Error clears
- [ ] Input border normal
- [ ] Checkmark or success indicator (optional)

**Expected**: Real-time validation with clear feedback.

#### 4.3 Form Validation - Phone
**Test Case 1: Empty Phone**
**Steps**:
1. Leave phone empty
2. Blur field

**Verify**:
- [ ] Error message: "Telefone é obrigatório"

**Test Case 2: Invalid Format**
**Steps**:
1. Enter: "123"
2. Blur field

**Verify**:
- [ ] Error message: "Telefone inválido" or "Formato: (11) 99999-9999"

**Test Case 3: Valid Phone**
**Steps**:
1. Enter: "(11) 99999-9999"
   OR
2. Enter: "11999999999" (should auto-format)

**Verify**:
- [ ] Phone formatted correctly: "(11) 99999-9999"
- [ ] Error clears
- [ ] Success indicator

**Test Case 4: International Phone**
**Steps**:
1. Enter: "+5511999999999"

**Verify**:
- [ ] Accepted or formatted correctly
- [ ] No error

**Expected**: Robust phone validation with auto-formatting.

#### 4.4 Form Validation - Email
**Test Case 1: Empty Email**
**Steps**:
1. Leave email empty
2. Blur field

**Verify**:
- [ ] Error message: "Email é obrigatório"

**Test Case 2: Invalid Format**
**Steps**:
1. Enter: "invalid-email"
2. Blur field

**Verify**:
- [ ] Error message: "Email inválido"

**Test Case 3: Valid Email**
**Steps**:
1. Enter: "joao.silva@example.com"

**Verify**:
- [ ] Error clears
- [ ] Success indicator

**Expected**: Standard email validation.

#### 4.5 Form Submission - Common Person
**Steps**:
1. Fill valid data:
   - Nome: "Maria Santos"
   - Telefone: "(21) 98888-7777"
   - Email: "maria.santos@example.com"
2. Click "Continuar"

**Verify**:
- [ ] Form validates
- [ ] "Continuar" button enabled
- [ ] Advances to Step 3
- [ ] Guest info displayed in Step 3 (read-only)

#### 4.6 Step 3 - Episode Details (Common Person)
**Steps**:
1. Complete manual form
2. Advance to Step 3

**Verify**:
- [ ] Guest info visible (read-only):
  - Nome: "Maria Santos"
  - Telefone: "(21) 98888-7777"
  - Email: "maria.santos@example.com"
- [ ] Episode fields visible
- [ ] "Criar Episódio" button enabled

**Test Case: Create Episode**
**Steps**:
1. Fill episode title: "Entrevista com Maria Santos"
2. Fill description: "História inspiradora"
3. Click "Criar Episódio"

**Verify**:
- [ ] Loading state
- [ ] Success message
- [ ] Modal closes
- [ ] Episode appears in list

**Database Verification**:
```sql
-- Check last created episode
SELECT
  id,
  user_id,
  guest_name,
  guest_phone,
  guest_email,
  created_at
FROM episodes
ORDER BY created_at DESC
LIMIT 1;

-- Expected:
-- guest_name: "Maria Santos"
-- guest_phone: "(21) 98888-7777" or "21988887777"
-- guest_email: "maria.santos@example.com"
```

**Expected**: Episode created with contact information stored.

---

### 5. Data Integrity Tests (5 min)

#### 5.1 RLS Policy Verification
**Setup**:
1. Create episode with User A
2. Login as User B
3. Navigate to episodes list

**Verify**:
- [ ] User B does NOT see User A's episode
- [ ] User B only sees their own episodes
- [ ] No data leak in API responses (check Network tab)

**Database Test**:
```sql
-- As different user, try to access another user's episode
SELECT * FROM episodes WHERE user_id != auth.uid();

-- Expected: Empty result (RLS blocks it)
```

**Expected**: RLS policies prevent cross-user data access.

#### 5.2 Orphan Episodes Check
**Steps**:
1. Create 3 episodes
2. Check database

**Verify**:
```sql
-- No episodes without user_id
SELECT COUNT(*) FROM episodes WHERE user_id IS NULL;

-- Expected: 0
```

**Expected**: All episodes have valid user_id.

#### 5.3 Data Consistency
**Verify**:
```sql
-- Public figure episodes should have NULL phone/email
SELECT COUNT(*)
FROM episodes
WHERE guest_bio IS NOT NULL
  AND (guest_phone IS NOT NULL OR guest_email IS NOT NULL);

-- Expected: 0 (or minimal if there's valid mixed cases)

-- Common person episodes should have phone OR email
SELECT COUNT(*)
FROM episodes
WHERE guest_phone IS NULL
  AND guest_email IS NULL
  AND guest_bio IS NULL;

-- Expected: 0 (every episode should have some guest identifier)
```

**Expected**: Data model enforced correctly.

---

### 6. Performance Tests (5 min)

#### 6.1 Wizard Load Time
**Steps**:
1. Open DevTools > Performance tab
2. Start recording
3. Click "Criar Episódio"
4. Stop recording when modal fully loaded

**Verify**:
- [ ] Wizard opens in < 2 seconds
- [ ] No layout shifts (CLS score)
- [ ] Smooth animations (60fps)

**Metrics**:
- Time to Interactive (TTI): < 2s
- First Contentful Paint (FCP): < 1s
- Largest Contentful Paint (LCP): < 2s

#### 6.2 Form Validation Performance
**Steps**:
1. Open manual form
2. Type in name field quickly
3. Observe real-time validation

**Verify**:
- [ ] No lag while typing
- [ ] Validation debounced (doesn't validate every keystroke)
- [ ] Validation triggers on blur
- [ ] No performance warnings in console

#### 6.3 Episode Creation Time
**Steps**:
1. Fill all fields
2. Start timer
3. Click "Criar Episódio"
4. Stop timer when success message appears

**Verify**:
- [ ] Episode created in < 5 seconds
- [ ] Database insert fast (< 500ms)
- [ ] No timeout errors

**Database Query Performance**:
```sql
-- Check query plan for insert
EXPLAIN ANALYZE
INSERT INTO episodes (user_id, guest_name, guest_phone, guest_email)
VALUES (auth.uid(), 'Test', '+5511999999999', 'test@example.com');

-- Expected: < 100ms execution time
```

#### 6.4 Memory Leaks
**Steps**:
1. Open DevTools > Memory tab
2. Take heap snapshot
3. Open/close wizard 10 times
4. Take another heap snapshot
5. Compare

**Verify**:
- [ ] Memory usage stable (not increasing significantly)
- [ ] No detached DOM nodes
- [ ] No event listener leaks

**Expected**: No memory leaks after repeated usage.

---

### 7. Accessibility Tests (5 min)

#### 7.1 Keyboard Navigation
**Steps**:
1. Open wizard using keyboard only
2. Use Tab to navigate
3. Use Enter/Space to select
4. Use ESC to close

**Verify**:
- [ ] Can navigate to all interactive elements
- [ ] Focus indicator visible
- [ ] Tab order logical (top to bottom, left to right)
- [ ] Can select guest type with keyboard
- [ ] Can submit form with Enter
- [ ] ESC closes modal
- [ ] Focus trap works (can't tab outside modal)

#### 7.2 Screen Reader Support
**Setup**: Enable screen reader (NVDA, JAWS, or VoiceOver)

**Verify**:
- [ ] Modal announced when opened
- [ ] Step progress announced
- [ ] Form labels read correctly
- [ ] Validation errors announced
- [ ] Success messages announced
- [ ] Buttons have descriptive labels

**ARIA Attributes**:
- [ ] Modal has `role="dialog"`
- [ ] Modal has `aria-labelledby` and `aria-describedby`
- [ ] Form inputs have `aria-label` or associated `<label>`
- [ ] Errors have `aria-invalid` and `aria-describedby`

#### 7.3 Color Contrast
**Tools**: Use browser extension (aXe, WAVE)

**Verify**:
- [ ] Text has sufficient contrast (WCAG AA: 4.5:1)
- [ ] Interactive elements distinguishable
- [ ] Error messages visible to colorblind users

**Expected**: WCAG 2.1 Level AA compliance.

---

### 8. Error Handling Tests (5 min)

#### 8.1 Network Errors
**Test Case 1: Offline**
**Steps**:
1. Open DevTools > Network tab
2. Set throttling to "Offline"
3. Try to create episode

**Verify**:
- [ ] Error message appears: "Sem conexão com a internet"
- [ ] User can retry
- [ ] No crash or unhandled exception

**Test Case 2: API Error**
**Steps**:
1. Mock API failure (intercept request in DevTools or use test flag)
2. Try to create episode

**Verify**:
- [ ] Error message appears: "Erro ao criar episódio"
- [ ] User can retry
- [ ] Error logged (check Sentry/error tracking)

#### 8.2 Authentication Errors
**Steps**:
1. Logout or expire session
2. Try to create episode

**Verify**:
- [ ] Redirected to login page
- [ ] Session restored after re-login
- [ ] Can resume wizard (optional, nice-to-have)

#### 8.3 Validation Edge Cases
**Test Case 1: XSS Attempt**
**Steps**:
1. Enter in name field: `<script>alert('XSS')</script>`
2. Submit form

**Verify**:
- [ ] Script NOT executed
- [ ] Input sanitized or escaped
- [ ] No security warning in console

**Test Case 2: SQL Injection Attempt**
**Steps**:
1. Enter in name field: `'; DROP TABLE episodes; --`
2. Submit form

**Verify**:
- [ ] Query NOT executed
- [ ] Episode created safely (parameterized queries)
- [ ] No database error

**Expected**: All user input sanitized/escaped.

---

## Devices to Test

### Desktop Browsers
- [ ] Chrome (latest version)
- [ ] Firefox (latest version)
- [ ] Safari (if available on macOS)
- [ ] Edge (latest version)

### Mobile/Tablet (Responsive Testing)
- [ ] Chrome DevTools responsive mode (375px, 768px, 1024px)
- [ ] Physical mobile device (optional): iOS Safari or Android Chrome
- [ ] Landscape and portrait orientations

---

## Test Results Template

### Test Execution Log

| Test ID | Scenario | Status | Notes | Tester | Date/Time |
|---------|----------|--------|-------|--------|-----------|
| 1.1 | Smoke Test - App Health | ☐ Pass ☐ Fail | | | |
| 1.2 | Module Access | ☐ Pass ☐ Fail | | | |
| 2.1 | Wizard Launch | ☐ Pass ☐ Fail | | | |
| 2.2 | Step 0 - Guest Type | ☐ Pass ☐ Fail | | | |
| 3.1 | Public Figure Search | ☐ Pass ☐ Fail | | | |
| 3.3 | Episode Creation (Public) | ☐ Pass ☐ Fail | | | |
| 4.1 | Manual Form Render | ☐ Pass ☐ Fail | | | |
| 4.2-4.4 | Form Validation | ☐ Pass ☐ Fail | | | |
| 4.6 | Episode Creation (Common) | ☐ Pass ☐ Fail | | | |
| 5.1 | RLS Policies | ☐ Pass ☐ Fail | | | |
| 5.2 | Orphan Check | ☐ Pass ☐ Fail | | | |
| 6.1 | Performance - Load Time | ☐ Pass ☐ Fail | | | |
| 6.4 | Memory Leaks | ☐ Pass ☐ Fail | | | |
| 7.1 | Keyboard Navigation | ☐ Pass ☐ Fail | | | |
| 7.2 | Screen Reader | ☐ Pass ☐ Fail | | | |
| 8.1 | Network Errors | ☐ Pass ☐ Fail | | | |
| 8.3 | Security (XSS/SQL) | ☐ Pass ☐ Fail | | | |

---

## Bug Report Template

### Bug: [Short Description]

**Severity**: ☐ Critical ☐ High ☐ Medium ☐ Low

**Test Scenario**: [Test ID and name]

**Steps to Reproduce**:
1.
2.
3.

**Expected Result**:

**Actual Result**:

**Screenshots/Video**: [Attach if available]

**Environment**:
- Browser:
- OS:
- Staging URL:
- Date/Time:

**Console Errors** (if any):
```
[Paste console errors here]
```

**Network Logs** (if relevant):
```
[Paste network errors here]
```

**Additional Notes**:

---

## Success Criteria

### Must Pass (Critical)
- [ ] All smoke tests pass
- [ ] Both wizard flows (public figure + common person) work end-to-end
- [ ] Episodes created successfully in database
- [ ] guest_phone and guest_email columns populated correctly
- [ ] RLS policies prevent data leaks
- [ ] No critical console errors
- [ ] No 500 server errors
- [ ] Form validation works correctly

### Should Pass (High Priority)
- [ ] Performance metrics met (< 2s load, < 5s creation)
- [ ] Responsive design works on mobile
- [ ] Keyboard navigation functional
- [ ] Error handling graceful

### Nice to Have (Medium Priority)
- [ ] Screen reader support
- [ ] No memory leaks
- [ ] Cross-browser compatibility (all browsers)
- [ ] Advanced accessibility features

---

## Sign-Off

### QA Approval

**Tester Name**: ________________
**Date**: ________________
**Time Spent**: ________________

**Test Summary**:
- Total Tests: ____
- Passed: ____
- Failed: ____
- Blocked: ____

**Critical Bugs Found**: ____
**Recommendation**: ☐ Approve for Production ☐ Needs Fixes ☐ Major Issues

**Notes**:
```
[Additional observations, recommendations, or concerns]
```

**Signature**: ________________

---

## Appendix

### Useful SQL Queries

```sql
-- View all episodes created today
SELECT * FROM episodes
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;

-- Count episodes by type
SELECT
  CASE
    WHEN guest_phone IS NOT NULL OR guest_email IS NOT NULL THEN 'Common Person'
    ELSE 'Public Figure'
  END AS guest_type,
  COUNT(*) as count
FROM episodes
GROUP BY guest_type;

-- Find episodes with validation issues
SELECT * FROM episodes
WHERE guest_name IS NULL
   OR (guest_phone IS NULL AND guest_email IS NULL AND guest_bio IS NULL);

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'episodes';
```

### Browser Console Commands

```javascript
// Check for memory leaks
performance.memory

// Log all React components
window.__REACT_DEVTOOLS_GLOBAL_HOOK__

// Check localStorage/sessionStorage
console.log(localStorage)
console.log(sessionStorage)

// Force re-render (if needed for debugging)
// Find component in React DevTools and use "Force Update"
```

---

**Document Version**: 1.0
**Last Updated**: 2024-12-10
**Next Review**: After production deployment
