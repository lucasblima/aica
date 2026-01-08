# Phase 5: Testing & Optimization Guide

## Overview

Phase 5 is the final testing and optimization phase for the UX Redesign project. This guide provides comprehensive testing procedures, accessibility checks, performance optimization strategies, and validation steps.

## Table of Contents

1. [Unit Tests](#unit-tests)
2. [Component Tests](#component-tests)
3. [E2E Tests](#e2e-tests)
4. [Accessibility Audit](#accessibility-audit-wcag-21-aa)
5. [Performance Optimization](#performance-optimization)
6. [Mobile Responsiveness](#mobile-responsiveness)
7. [Testing Checklist](#testing-checklist)

---

## Unit Tests

### Created Test Files

- **`tests/unit/services/taskRecurrenceService.test.ts`** (92 tests)
  - RRULE parsing (FREQ, INTERVAL, BYDAY, BYMONTHDAY, COUNT, UNTIL)
  - Pattern to RRULE string conversion
  - Human-readable descriptions in Portuguese
  - Edge cases: leap years, end-of-month dates, DST handling
  - Round-trip validation (pattern → RRULE → pattern)

### Running Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm run test:unit -- tests/unit/services/taskRecurrenceService.test.ts

# Run with coverage report
npm run test:coverage
```

### Coverage Targets

- **Goal:** >80% coverage for Phase 1-3 new code
- **Priority areas:**
  1. Service layer (taskRecurrenceService, googleContactsService)
  2. Component logic (SubtaskList, RecurrencePicker, TagInput)
  3. Utilities (parsing, validation, transformation)

---

## Component Tests

### Created Test Files

- **`tests/unit/components/SubtaskList.test.tsx`** (35+ test cases)
  - Rendering subtasks and empty states
  - Adding, editing, deleting subtasks
  - Completion toggle functionality
  - Keyboard shortcuts (Enter to add)
  - Character limit enforcement (200 chars)
  - Error handling and messages
  - Edge cases (special characters, unicode, large lists)

### Running Component Tests

```bash
# Run component tests with React Testing Library
npm run test:unit -- tests/unit/components/

# Watch mode for development
npm run test:watch
```

### Test Patterns Used

```typescript
// Component interaction
await userEvent.type(input, 'text');
await userEvent.keyboard('{Enter}');
await userEvent.click(button);

// Assertions
expect(screen.getByText('...')).toBeInTheDocument();
expect(screen.getByDisplayValue('...')).toHaveValue('...');
expect(component).toHaveClass('class-name');
```

---

## E2E Tests

### Created Test Files

- **`tests/e2e/ux-redesign-phase4.spec.ts`**
  - Page navigation via BottomNav
  - ContactsView page rendering
  - Search and filter functionality
  - RecentContactsWidget integration
  - Responsive design (375px, 768px, 1280px)
  - Accessibility keyboard navigation
  - Performance metrics
  - Error handling
  - Console error detection

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- tests/e2e/ux-redesign-phase4.spec.ts

# Run with UI (visual debugging)
npm run test:e2e -- --ui

# Run in headed mode (see browser)
npm run test:e2e -- --headed
```

### E2E Test Coverage

| Component | Test Cases | Coverage |
|-----------|-----------|----------|
| ContactsView | 8 | Page load, search, filters, empty state |
| RecentContactsWidget | 2 | Widget display, navigation |
| BottomNav | 3 | Button visibility, highlighting, icons |
| Navigation | 3 | Flow testing, scroll maintenance |
| Responsive | 4 | Mobile, tablet, desktop sizes |
| Accessibility | 3 | Labels, keyboard nav, focus |
| Performance | 2 | Load time <5s, render <2s |
| Error Handling | 2 | XSS prevention, console errors |

---

## Accessibility Audit (WCAG 2.1 AA)

### Manual Accessibility Checklist

#### 1.1 - Text Alternatives
- [ ] All images have `alt` text or `title` attributes
- [ ] Icons have `aria-label` if not accompanied by text
- [ ] Empty icons have empty `alt=""` and `aria-hidden="true"`

```html
<!-- Correct -->
<img src="contact.png" alt="User contact" />
<button aria-label="Add contact"><Plus /></button>

<!-- Incorrect -->
<img src="contact.png" />
<button><Plus /></button>
```

#### 1.4 - Color Contrast
- [ ] Text contrast ratio ≥ 4.5:1 for normal text
- [ ] Text contrast ratio ≥ 3:1 for large text (18pt+)
- [ ] UI components have ≥ 3:1 contrast

**Test with:**
```bash
# WebAIM Contrast Checker
# https://webaim.org/resources/contrastchecker/

# Automated check with axe DevTools
npm install --save-dev @axe-core/playwright
```

#### 2.1 - Keyboard Accessibility
- [ ] All interactive elements are keyboard accessible (Tab)
- [ ] Tab order is logical and intuitive
- [ ] No keyboard traps (can always Tab away)
- [ ] Focus indicators are visible (outline, underline, background)
- [ ] Keyboard shortcuts don't conflict with browser shortcuts

**Test steps:**
```
1. Tab through page: should hit all interactive elements in logical order
2. Shift+Tab: should reverse navigation
3. Enter: should activate buttons/links
4. Space: should activate buttons, scroll for textarea
5. Escape: should close modals/popups
6. Arrow keys: should navigate lists (if implemented)
```

#### 2.4 - Focus Visible
- [ ] `:focus-visible` outline shows when using keyboard
- [ ] Focus outline has minimum 2px width
- [ ] Focus outline contrasts with background

```css
/* Ensure visible focus for keyboard users */
button:focus-visible {
  outline: 2px solid #d97706; /* amber-600 */
  outline-offset: 2px;
}
```

#### 3.1 - Language
- [ ] Page language set: `<html lang="pt-BR">`
- [ ] Language changes marked: `<span lang="en-US">English word</span>`

#### 3.2 - Predictable
- [ ] Navigation consistent across pages
- [ ] No unexpected context changes
- [ ] Forms don't auto-submit without user action

#### 3.3 - Input Assistance
- [ ] Error messages are clear and specific
- [ ] Error messages linked to form fields
- [ ] Required fields marked with `*` or `aria-required="true"`

```html
<!-- Correct -->
<label for="title">Título *
  <input id="title" aria-required="true" />
</label>
<span id="title-error" role="alert">Título é obrigatório</span>

<!-- Link error to input -->
<input aria-describedby="title-error" />
```

#### 4.1 - Name, Role, Value
- [ ] Form inputs have associated labels
- [ ] Buttons have accessible names (text or aria-label)
- [ ] Custom components have proper ARIA roles

```html
<!-- Correct -->
<label for="search">Buscar:</label>
<input id="search" />

<button aria-label="Deletar contato">
  <Trash2 />
</button>
```

### Automated Accessibility Testing

```bash
# Run axe accessibility tests
npm install --save-dev @axe-core/playwright
npm run test:e2e -- --grep "@accessibility"

# Browser DevTools
# 1. Open DevTools (F12)
# 2. Install axe DevTools extension
# 3. Run scan on each page
```

### Screen Reader Testing

- [ ] Test with NVDA (Windows, free)
- [ ] Test with JAWS (Windows, commercial)
- [ ] Test with VoiceOver (Mac, built-in: Cmd+F5)

**Test steps:**
1. Enable screen reader
2. Navigate with Tab/Shift+Tab
3. Listen to element announcements
4. Verify forms read correctly
5. Verify lists announce count
6. Verify modals announce title

---

## Performance Optimization

### Lighthouse Audit

```bash
# Run Lighthouse via CLI
npm install -g @google/lighthouse

# Test locally
lighthouse https://aica-staging-5p22u2w6jq-rj.a.run.app/ --chrome-flags="--headless"

# Or use DevTools (F12 > Lighthouse)
```

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| First Contentful Paint (FCP) | <1.8s | ? |
| Largest Contentful Paint (LCP) | <2.5s | ? |
| Cumulative Layout Shift (CLS) | <0.1 | ? |
| Time to Interactive (TTI) | <3.8s | ? |
| Lighthouse Score | >90 | ? |

### Optimization Strategies

#### 1. Code Splitting
- [ ] Lazy load route components with `React.lazy()`
- [ ] Dynamic imports for heavy components
- [ ] Tree-shake unused dependencies

```typescript
// Good
const ContactsView = lazy(() => import('../pages/ContactsView'));

// Routes with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Route path="/contacts" element={<ContactsView />} />
</Suspense>
```

#### 2. Bundle Analysis
```bash
# Check bundle size
npm run build

# Analyze with Rollup Visualizer
npm install --save-dev rollup-plugin-visualizer
npm run build  # Generates dist/stats.html
```

**Acceptable bundle sizes:**
- Main bundle: <300KB gzipped
- Route chunks: <100KB gzipped each
- Vendor chunks: <200KB gzipped

#### 3. Image Optimization
- [ ] Use WebP with JPEG fallback
- [ ] Responsive images with srcset
- [ ] Lazy load images with `loading="lazy"`

```html
<picture>
  <source srcset="/contact.webp" type="image/webp" />
  <img src="/contact.jpg" alt="Contact" loading="lazy" />
</picture>
```

#### 4. Font Loading
- [ ] Subset fonts (only needed characters)
- [ ] Use `font-display: swap` for web fonts
- [ ] Preload critical fonts

```html
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
```

#### 5. CSS/JS Minification
```bash
# Already done by build process
npm run build  # Produces minified assets
```

---

## Mobile Responsiveness

### Viewport Sizes to Test

```
Mobile:
  - iPhone SE: 375×667 (smallest common)
  - iPhone 12: 390×844 (common)
  - Android: 360×800 (common)

Tablet:
  - iPad Air: 768×1024
  - iPad Pro: 1024×1366

Desktop:
  - Small: 1024×768
  - Normal: 1280×720
  - Large: 1920×1080
  - Wide: 2560×1440
```

### Testing Procedure

```bash
# Test using Playwright
npm run test:e2e -- --grep "@responsive"

# Manual testing in DevTools
# 1. F12 > Device Emulation (Ctrl+Shift+M)
# 2. Select device from dropdown
# 3. Test all interactions
# 4. Check text readability
# 5. Verify touch targets ≥48×48px
```

### Responsive Design Checklist

- [ ] Layout stacks vertically on mobile (<768px)
- [ ] Touch targets at least 48×48 pixels
- [ ] Text is readable without horizontal scroll
- [ ] Images scale properly
- [ ] Forms are easy to fill on mobile
- [ ] Navigation is accessible on small screens
- [ ] No content hidden that shouldn't be
- [ ] Performance acceptable on slower networks (3G)

---

## Testing Checklist

### Pre-Release Checklist

#### Code Quality
- [ ] All tests passing: `npm run test`
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] ESLint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] No console warnings/errors in dev

#### Testing Coverage
- [ ] Unit tests written for new services
- [ ] Component tests cover main flows
- [ ] E2E tests validate user journeys
- [ ] >80% code coverage for new code

#### Performance
- [ ] Lighthouse score >90
- [ ] FCP <1.8s
- [ ] LCP <2.5s
- [ ] CLS <0.1
- [ ] No layout shifts during interaction

#### Accessibility
- [ ] WCAG 2.1 AA compliant
- [ ] All form inputs labeled
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Screen reader tested
- [ ] Color contrast checked
- [ ] No keyboard traps

#### Browser Compatibility
- [ ] Chrome 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] Edge 90+

#### Mobile
- [ ] Works on 375px viewport
- [ ] Works on 768px viewport
- [ ] Works on 1280px viewport
- [ ] Touch targets ≥48px
- [ ] No horizontal scroll

#### Security
- [ ] No XSS vulnerabilities
- [ ] No SQL injection risks
- [ ] Input validation on all forms
- [ ] CSRF tokens present
- [ ] API calls use HTTPS

#### Documentation
- [ ] Code commented where needed
- [ ] README updated if needed
- [ ] CHANGELOG updated
- [ ] Test documentation complete

### Sign-Off Checklist

- [ ] All tests passing
- [ ] Code reviewed
- [ ] Accessibility audit passed
- [ ] Performance targets met
- [ ] Product owner approval
- [ ] Ready for production

---

## Commands Summary

```bash
# Testing
npm run test              # Run all unit tests
npm run test:watch       # Watch mode
npm run test:unit        # Unit tests only
npm run test:e2e         # E2E tests (Playwright)
npm run test:coverage    # Coverage report

# Quality
npm run typecheck        # TypeScript check
npm run lint             # ESLint check
npm run build            # Production build

# Development
npm run dev              # Dev server
npm run preview          # Preview build

# Specific Test Files
npm run test:unit -- tests/unit/services/taskRecurrenceService.test.ts
npm run test:e2e -- tests/e2e/ux-redesign-phase4.spec.ts
```

---

## Test Results Template

```markdown
# Phase 5 Test Results

## Date: YYYY-MM-DD
## Tester: Name

### Unit Tests
- [ ] taskRecurrenceService: ✓ 92/92 passing
- [ ] SubtaskList: ✓ 35/35 passing
- [ ] Coverage: __% (target: 80%)

### E2E Tests
- [ ] ux-redesign-phase4.spec.ts: ✓ 28/28 passing
- [ ] Execution time: __s

### Performance (Lighthouse)
- [ ] Performance: __/100 (target: >90)
- [ ] Accessibility: __/100 (target: 100)
- [ ] Best Practices: __/100 (target: >90)
- [ ] SEO: __/100 (target: >90)

### Accessibility
- [ ] Keyboard navigation: ✓ Pass
- [ ] Focus indicators: ✓ Pass
- [ ] Color contrast: ✓ Pass
- [ ] Screen reader: ✓ Pass

### Mobile (375px, 768px, 1280px)
- [ ] Layout: ✓ Pass
- [ ] Touch targets: ✓ Pass
- [ ] Readability: ✓ Pass

### Issues Found
1. (none / list any issues)

### Sign-Off
- [ ] Ready for staging
- [ ] Ready for production

Signed: ___________  Date: ___________
```

---

## Next Steps

1. ✅ Create unit tests for services
2. ✅ Create component tests
3. ✅ Create E2E tests
4. 🔄 Run all tests and fix failures
5. 📊 Generate coverage reports
6. ♿ Complete accessibility audit
7. 📱 Test mobile responsiveness
8. 🚀 Measure performance metrics
9. 📝 Document results
10. 🎉 Submit for production

---

**Last Updated:** 2026-01-08
**Phase Status:** 🟡 IN PROGRESS
**Target Completion:** 2026-01-15
