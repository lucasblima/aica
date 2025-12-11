# Accessibility Testing Procedures - WCAG 3.0 Level AAA

**Purpose:** Step-by-step guide for manual and automated testing of accessibility compliance
**Target:** Comprehensive testing of Aicac onboarding module
**Duration:** 3-4 hours per test cycle

---

## Part 1: Keyboard Navigation Testing

### 1.1 Basic Keyboard Testing

**Objective:** Verify all interactive elements accessible via keyboard

**Prerequisites:**
- Test on Chrome, Firefox, Edge, Safari (if macOS)
- Disable mouse usage (optional but recommended)
- Use only: Tab, Shift+Tab, Enter, Space, Arrow keys, Escape

**Test Procedure:**

1. **Tab Navigation Through Landing Page**
   ```
   1. Open http://localhost:3000/
   2. Press Tab repeatedly from the beginning
   3. Verify order: Logo → Nav links → Auth buttons → Skip link → Main content
   4. Record any broken focus (Focus disappears, jumps unexpectedly)
   5. Expected: ~12-15 Tab stops on Landing Page
   ```

2. **Tab Order Verification**
   ```
   Document each Tab stop:
   ☐ Skip to main content link (sr-only, becomes visible on focus)
   ☐ Logo/Aica link
   ☐ Language selector (desktop)
   ☐ Login button (desktop)
   ☐ Sign up button (desktop)
   ☐ Mobile menu button
   ☐ Hero section CTA button 1
   ☐ Hero section CTA button 2
   ☐ Value prop card 1
   ☐ Value prop card 2
   ☐ Value prop card 3
   ☐ Footer links

   Issues to check:
   ☐ No elements skipped
   ☐ Order is logical (top-to-bottom, left-to-right)
   ☐ Focus visible on every element
   ☐ Focus ring is at least 3px visible
   ☐ Focus ring has sufficient contrast (3:1 minimum)
   ```

3. **Button Activation**
   ```
   For each button encountered:
   ☐ Can activate with Enter key
   ☐ Can activate with Space key
   ☐ Button shows active state during press
   ☐ Button returns to normal state after release
   ☐ Focus remains on button after activation

   Test locations:
   - Header: Login, Sign up buttons
   - Hero: CTA buttons
   - Footer: Any buttons
   ```

4. **Link Activation**
   ```
   For each link:
   ☐ Can activate with Enter key
   ☐ Can activate with Space key (if focusable)
   ☐ Link navigates on Enter
   ☐ Focus moves to new page
   ☐ Back button returns (Tab order restored)
   ```

5. **Mobile Menu Keyboard Test**
   ```
   Prerequisites: View at mobile width (< 768px)

   ☐ Tab to mobile menu button
   ☐ Press Enter to open menu
   ☐ Menu becomes visible
   ☐ Tab navigates menu items
   ☐ Press Escape to close menu
   ☐ Focus returns to menu button
   ```

6. **Form Input Navigation**
   ```
   Applicable to: MomentCaptureFlow

   ☐ Tab reaches all inputs
   ☐ Shift+Tab goes backwards
   ☐ Focus visible on inputs
   ☐ Can type in text inputs
   ☐ Can select options with Arrow keys
   ☐ Can check checkboxes with Space
   ☐ Can select radio with Arrow keys
   ☐ Form submission with Enter (optional for progressive forms)
   ```

7. **Modal/Dialog Navigation**
   ```
   Applicable to: PillarDetails modal

   ☐ Tab to modal trigger button
   ☐ Press Enter/Space to open modal
   ☐ Focus moves into modal
   ☐ Tab navigates modal content only (focus trap)
   ☐ Cannot Tab out of modal
   ☐ Close button accessible
   ☐ Escape key closes modal
   ☐ Focus returns to trigger button
   ```

8. **Keyboard Shortcuts Verification**
   ```
   Document any special shortcuts:
   ☐ Arrow Left/Right for carousel (WelcomeTour)
   ☐ Escape to close (modals, dropdowns)
   ☐ Enter to submit (forms)
   ☐ Space to activate buttons

   No requirements for: Vim keybindings, single-char shortcuts
   ```

### 1.2 Test Results Recording

**Create test_keyboard_results.txt:**

```markdown
# Keyboard Navigation Test Results

Date: 2025-12-11
Tester: [Name]
Browser: Chrome 131
OS: Windows 11

## Landing Page
Tab stops found: 14
Expected: 12-15
Status: ✓ PASS / ✗ FAIL

Issues found:
- (If any, describe here)

## Welcome Tour
Tab stops found: X
Expected: Y
Status: ✓ PASS / ✗ FAIL

Issues found:
- (If any, describe here)

## Overall Result: ✓ PASS / ✗ FAIL
```

---

## Part 2: Screen Reader Testing

### 2.1 Setup (VoiceOver - macOS/iOS)

**VoiceOver Activation:**
```
macOS:
1. System Preferences → Accessibility → VoiceOver
2. Enable: VO + F5
3. Or: Command + F5 (if keyboard shortcut enabled)

iOS:
1. Settings → Accessibility → VoiceOver
2. Toggle ON
3. Use Rotor: VO + U for special navigation
```

**Basic Commands:**
```
Command | Action
--------|--------
VO+U    | Open Rotor (navigate headings, links, etc.)
VO+→    | Next item
VO+←    | Previous item
VO+Space| Activate/select
VO+↓    | Read all (continuous reading)
VO+↑    | Stop reading
Tab     | Next focusable element
Escape  | Escape modal/dropdown
```

### 2.2 Setup (NVDA - Windows)

**NVDA Activation:**
```
Download: https://www.nvaccess.org/download/

1. Install NVDA
2. Launch NVDA
3. Press Insert (modify key) + 1 to speak typed characters
4. Press Insert + 2 to toggle speech on/off
```

**Basic Commands:**
```
Command | Action
--------|--------
Tab     | Next focusable element
Shift+Tab| Previous focusable element
Down Arrow | Read next line
Up Arrow | Read previous line
Insert+F | Find dialog
Insert+Home | Read current item
Insert+↓ | Read all (continuous)
Insert+Space | Activate link/button
Enter   | Follow link
```

### 2.3 Landing Page Screen Reader Test

**Test Procedure:**

1. **Page Load Announcement**
   ```
   Expected announcement: "Aica - [page title] - main content"

   Verify:
   ☐ Page title announced
   ☐ lang attribute respected (Portuguese recognition)
   ☐ No repetitive announcements
   ☐ No extraneous metadata announced
   ```

2. **Navigation Structure**
   ```
   Use Rotor (VO+U or Insert+F7):

   ☐ Landmarks found: navigation, main, contentinfo
   ☐ Heading structure:
     - Level 1: Page title
     - Level 2: Section headings
   ☐ Links listed with purpose clear
   ☐ Buttons listed with clear labels
   ```

3. **Header Navigation**
   ```
   Tab through header elements:
   ☐ "Aica" link announced as "Aica, home link"
   ☐ Language selector: "Language selector, dropdown, Portuguese Brasil selected"
   ☐ Login button: "Login button" or "Login to your account"
   ☐ Sign up button: "Create account button"

   Visual element announcements:
   ☐ No icon text announced without aria-hidden
   ☐ Logo image has aria-label: "Aica home"
   ```

4. **Hero Section**
   ```
   Read through content:
   ☐ Heading h1: "Know yourself, Transform your life"
   ☐ Subheading announced clearly
   ☐ CTA buttons announced:
     - "Start now button"
     - "Learn more button"
   ☐ Gradient text accessible (not just visual)
   ☐ Decorative elements (blobs) have aria-hidden
   ☐ No text cut off in output
   ```

5. **Value Proposition Cards**
   ```
   For each card (3 total):
   ☐ Heading announced
   ☐ Icon described (if aria-hidden, should be context)
   ☐ Description text announced
   ☐ Benefits listed
   ☐ No visual-only information
   ☐ Focus-within styles don't obscure content

   Verify with different screen readers:
   ☐ VoiceOver (macOS) handles as expected
   ☐ NVDA (Windows) handles as expected
   ☐ TalkBack (Android) handles as expected
   ☐ VoiceOver (iOS) handles as expected
   ```

6. **Form Elements (if any)**
   ```
   For each input field:
   ☐ Label announced before input
   ☐ Required status announced: "required field"
   ☐ Placeholder announced if used
   ☐ Help text announced (aria-describedby)
   ☐ Error messages announced immediately (aria-live)
   ☐ Input type announced: "text", "email", "number", etc.
   ```

7. **Links**
   ```
   Verify link announcements:
   ☐ Link purpose clear from text
   ☐ "Learn more" links have context (aria-label or full text)
   ☐ Icon-only links have labels
   ☐ New window targets announced (aria-label)
   ☐ External links marked (if applicable)

   Use Rotor to list all links:
   ☐ All links listed
   ☐ Duplicate link names identified
   ☐ Hidden links not listed
   ```

8. **Dynamic Content**
   ```
   When content updates:
   ☐ Changes announced without page reload
   ☐ aria-live="polite" updates announced
   ☐ aria-live="assertive" updates interrupt
   ☐ Status updates clear and useful
   ```

### 2.4 Welcome Tour Screen Reader Test

**Special Considerations:**

1. **Carousel Navigation**
   ```
   ☐ Slide position announced: "Slide 1 of 4: Consciência"
   ☐ Navigation buttons have clear labels:
     - "Previous pillar" / "Next pillar"
   ☐ Dot navigation announced:
     - "Navigate to Consciência, slide 1 of 4, currently selected"
   ☐ Keyboard: Arrow keys navigate carousel
   ```

2. **Pillar Details Modal**
   ```
   When modal opens:
   ☐ "Dialog, [Pillar name]" announced
   ☐ Focus moved to title (aria-labelledby)
   ☐ Modal title is h2
   ☐ Content structure clear
   ☐ Buttons announced with clear labels
   ☐ Escape key closes and announces closure
   ☐ Focus returns to trigger button
   ```

3. **Animation Announcements**
   ```
   ☐ No announcement spam from animations
   ☐ Slide transitions clear
   ☐ No distracting audio cues
   ☐ If audio present: can be muted
   ```

### 2.5 Moment Capture Flow Screen Reader Test

**Multi-Step Form:**

1. **Step Progression**
   ```
   When navigating steps:
   ☐ Step number announced: "Step 1 of 7"
   ☐ Step title announced: "What moment?"
   ☐ Progress indicator announced
   ☐ aria-live region announces: "Step 2 of 7, Choose emotion"
   ```

2. **Options/Selections**
   ```
   For each selection type:
   ☐ Options announced as buttons/checkboxes/radios
   ☐ Selection state announced: "selected" / "not selected"
   ☐ Emoji announced: "sad emoji" (if aria-label provided)
   ☐ Multiple selections clear (checkboxes vs radios)
   ```

3. **Form Validation**
   ```
   ☐ Required fields marked: "required"
   ☐ Validation errors announced immediately
   ☐ Error messages have role="alert"
   ☐ Error locations clear
   ☐ Error recovery instructions provided
   ☐ Success messages announced (aria-live)
   ```

4. **Audio Recording (if present)**
   ```
   ☐ Record button labeled: "Start recording"
   ☐ Recording status announced: "Recording in progress"
   ☐ Duration announced if displayed
   ☐ Stop button: "Stop recording"
   ☐ Playback controls accessible
   ☐ Transcript provided or link to transcription
   ```

### 2.6 Screen Reader Test Results

**Create test_screenreader_results.txt:**

```markdown
# Screen Reader Test Results

Date: 2025-12-11
Tester: [Name]
Screen Reader: NVDA 2024.1
Browser: Chrome 131
OS: Windows 11

## Landing Page
Status: ✓ PASS / ✗ FAIL

Findings:
- Page title announced correctly: ✓/✗
- Landmark structure present: ✓/✗
- Heading hierarchy correct: ✓/✗
- Button labels clear: ✓/✗
- Issues: [list any]

## Welcome Tour
Status: ✓ PASS / ✗ FAIL

Findings:
- Carousel position announced: ✓/✗
- Modal accessible: ✓/✗
- Focus trap working: ✓/✗
- Issues: [list any]

## Moment Capture Flow
Status: ✓ PASS / ✗ FAIL

Findings:
- Step progression clear: ✓/✗
- Options labeled: ✓/✗
- Errors announced: ✓/✗
- Issues: [list any]

## Overall Result: ✓ PASS / ✗ FAIL
```

---

## Part 3: Color Contrast Testing

### 3.1 Automated Contrast Testing

**Tool 1: WebAIM Contrast Checker**
```
Website: https://webaim.org/resources/contrastchecker/

1. Open tool in browser
2. For each element:
   a. Use browser DevTools to identify colors
   b. Extract: text color (HEX), background color (HEX)
   c. Enter both into checker
   d. Check: AA (4.5:1) and AAA (7:1) results

Sample test:
- Element: Header Login Button
- Text: #5C554B (medium brown)
- Background: #F8F7F5 (off-white)
- Result: 4.52:1 (FAILS AAA)
```

**Tool 2: Browser DevTools (Chrome)**
```
1. Open page in Chrome
2. Press F12 to open DevTools
3. Elements tab
4. Inspect element
5. Styles panel shows color values
6. Click color swatch for color picker
7. Shows contrast ratio (if Accessibility panel enabled)
```

**Tool 3: Color Contrast Analyzer (CCA)**
```
Download: https://www.tpgi.com/color-contrast-checker/

1. Install application
2. Use eyedropper tool on browser
3. Click text color, then background
4. Reads contrast ratio automatically
5. Shows Pass/Fail for AA and AAA
```

### 3.2 Manual Contrast Testing Procedure

**Test Each Component:**

**Landing Page Header:**
```
☐ Logo "Aica": Black text on white - LIKELY PASS
☐ "Login" button: #5C554B on #F8F7F5 - TEST: 4.52:1 FAIL AAA
☐ "Sign up" button: White on blue - TEST: 9.5:1 PASS
☐ Language selector label: #5C554B on #F8F7F5 - TEST: FAIL AAA
```

**Hero Section:**
```
☐ H1 "Know yourself": #2B1B17 on gradient - TEST: varies, CHECK ALL POINTS
☐ Subtext: #5C554B on gradient - TEST: varies, CHECK ALL POINTS
☐ "Start now" button: White on blue - PASS
☐ "Learn more" button: #6B9EFF on white - TEST: 4.28:1 FAIL AAA
☐ Beta badge: #948D82 on white - TEST: FAIL AAA
```

**Value Proposition Cards:**
```
☐ Card title: #2B1B17 on #F8F7F5 - TEST: Check contrast
☐ Card text: #5C554B on #F8F7F5 - TEST: ~5.5:1 FAIL AAA
☐ Icon color: Various colors on white/light - TEST: Each icon
```

**Focus Indicators:**
```
☐ Button focus ring: 2px ring - VISIBLE: Yes/No
☐ Ring color: #6B9EFF - CONTRAST with background: TEST 3:1+
☐ Ring thickness: 2px - VISIBLE SIZE: Too thin
☐ Ring offset: 2px - VISIBLE SEPARATION: Check
```

**Disabled States:**
```
☐ Disabled button: Opacity reduced - CONTRAST: TEST
☐ Problem: Opacity alone insufficient (may fail AAA)
☐ Solution: Darker color + different appearance
```

### 3.3 Contrast Testing Checklist

**Critical Elements to Test:**

```
Landing Page:
☐ Header text on header background
☐ All button text colors
☐ All link colors (default, hover, visited, focus)
☐ Form label text
☐ Helper text on light backgrounds
☐ Error messages
☐ Success messages
☐ Icon fills on backgrounds
☐ Focus rings on all elements

Welcome Tour:
☐ Pillar card text on gradient (check multiple points)
☐ Button text on pillar cards
☐ Navigation dot colors
☐ Navigation arrow colors

Moment Capture:
☐ Option button text
☐ Selection indicator colors
☐ Required field asterisk
☐ Input border color
☐ Error message color
☐ Helper text color

Footer:
☐ Link text color
☐ Text on colored backgrounds
```

### 3.4 Contrast Test Results

**Create test_contrast_results.txt:**

```markdown
# Color Contrast Test Results

Date: 2025-12-11
Tester: [Name]
Tool: WebAIM Contrast Checker
Target: WCAG AAA (7:1 for normal text)

## Landing Page - HEADER

Element: Login Button
Text Color: #5C554B
Background: #F8F7F5
Ratio: 4.52:1
Status: ✗ FAIL AAA (needs 7:1)
Fix: Darken text to #2B1B17 (ratio would be 11.2:1)

Element: Sign Up Button (Primary CTA)
Text Color: #FFFFFF
Background: #6B9EFF
Ratio: 9.2:1
Status: ✓ PASS AAA

[Continue for all elements...]

## Summary

Total Elements Tested: 47
Passing AAA (7:1): 12
Failing AAA: 35
Passing AA (4.5:1): 23
Failing AA: 24

Overall Status: ✗ NEEDS REMEDIATION
```

---

## Part 4: Zoom & Responsive Testing

### 4.1 Browser Zoom Testing

**Procedure:**

1. **200% Zoom Test**
   ```
   1. Open page in browser
   2. Press Ctrl++ (zoom in) 4 times (100% → 200%)
   3. Verify:
      ☐ Content readable without horizontal scroll
      ☐ No text truncated
      ☐ Buttons large enough
      ☐ Focus indicators visible
      ☐ Touch targets still accessible
   ```

2. **400% Zoom Test**
   ```
   1. Continue zooming to 400%
   2. Verify:
      ☐ Text reflows properly
      ☐ One-column layout (if applicable)
      ☐ Navigation accessible
      ☐ No overlapping content
   ```

3. **50% Zoom Test**
   ```
   1. Zoom to 50% (minimum for readability)
   2. Verify:
      ☐ Still readable
      ☐ Not too small to tap
   ```

### 4.2 Device/Screen Size Testing

**Mobile Testing:**

```
Device: iPhone 13 (390px width)
Browser: Safari

☐ Content reflows to single column
☐ Buttons enlarged for touch (48x48px)
☐ Navigation accessible (hamburger menu)
☐ Text readable without zoom
☐ No horizontal scroll

Device: iPhone SE (375px width)
Browser: Safari

☐ Same checks as above
☐ Smallest common width test

Device: iPad (768px width)
Browser: Safari

☐ 2-column layouts work
☐ Touch targets spaced properly
☐ Navigation tablet-appropriate
```

**Android Testing:**

```
Device: Pixel 6 (412px width)
Browser: Chrome

☐ Same checks as iPhone
☐ TalkBack integration test

Device: Samsung Galaxy S21 (360px width)
Browser: Chrome

☐ Smallest Android width
☐ Touch target verification
```

### 4.3 Responsive Test Results

```markdown
# Zoom & Responsive Test Results

Date: 2025-12-11
Tester: [Name]

## 200% Zoom Test
Landing Page: ✓ PASS / ✗ FAIL
Welcome Tour: ✓ PASS / ✗ FAIL
Moment Capture: ✓ PASS / ✗ FAIL
Issues: [list any]

## Mobile (390px)
Landing Page: ✓ PASS / ✗ FAIL
Issues: [list any]

## Tablet (768px)
Landing Page: ✓ PASS / ✗ FAIL
Issues: [list any]

## Overall: ✓ PASS / ✗ FAIL
```

---

## Part 5: Automated Testing with Tools

### 5.1 axe DevTools

**Installation:**
```
Chrome: https://chrome.google.com/webstore
Firefox: https://addons.mozilla.org/firefox/

Search: "axe DevTools"
```

**Usage:**
```
1. Navigate to page (http://localhost:3000)
2. Open DevTools (F12)
3. Click "axe DevTools" tab
4. Click "Scan ALL of my page"
5. Review results:
   - Critical (Red): Must fix
   - Serious (Orange): Should fix
   - Moderate (Yellow): Consider fixing
   - Minor (Blue): Nice to have
6. Click on each issue for code location
```

**What to Look For:**

```
Critical Issues (MUST FIX):
☐ Color contrast failures
☐ Missing alt text
☐ Form field labels missing
☐ Missing ARIA labels on buttons

Serious Issues (SHOULD FIX):
☐ Missing heading levels
☐ Focus indicators
☐ ARIA misuse

Moderate Issues (CONSIDER):
☐ Redundant ARIA labels
☐ Unused ARIA properties
☐ Link purposes unclear
```

### 5.2 WAVE Browser Extension

**Installation:**
```
Chrome: https://chrome.google.com/webstore
Firefox: https://addons.mozilla.org/firefox/

Search: "WAVE Evaluation Tool"
```

**Usage:**
```
1. Navigate to page
2. Click WAVE icon in toolbar
3. View results in sidebar:
   - Red flags: Errors
   - Yellow: Warnings
   - Green: Features
4. Hover over icons to see issues
```

**Test Results Interpretation:**

```
Errors (Red X):
- Empty alt text on images
- Missing form labels
- Missing heading levels
- Contrast problems
- Missing ARIA properties

Warnings (Yellow):
- Possible issues needing review
- Redundant alt text
- Suspicious links
- Very long alt text

Features (Green):
- Good: ARIA landmarks
- Good: ARIA labels
- Good: Headings
- Good: Lists
```

### 5.3 Lighthouse Audit

**Usage:**
```
1. Open DevTools (F12)
2. Click "Lighthouse" tab
3. Select audit type: "Accessibility"
4. Click "Analyze page load"
5. Wait for results
```

**Key Accessibility Metrics:**

```
Background and Foreground Colors Have a Sufficient Contrast Ratio
- Target: Pass (no issues)
- Check: All text meets 4.5:1 (AA) minimum

Heading Hierarchy Is Semantically Correct
- Target: Pass
- Check: h1 → h2, no skipping

Images Have Alternative Text
- Target: Pass
- Check: All images have alt attributes

Form Elements Have Associated Labels
- Target: Pass
- Check: <label for="id"> matches <input id="id">

Accessible Names Are Defined for Image Buttons
- Target: Pass
- Check: aria-label or title on icon buttons

ARIA Attributes Follow Usage Rules
- Target: Pass
- Check: ARIA roles, states, properties valid

Elements Are Focusable or Keyboard Accessible
- Target: Pass
- Check: Tab navigation works
```

### 5.4 Pa11y Command Line

**Installation:**
```bash
npm install -g pa11y
```

**Usage:**
```bash
# Test single URL
pa11y http://localhost:3000

# Test with WCAG AAA standard
pa11y --standard WCAG3AAA http://localhost:3000

# Generate JSON report
pa11y --reporter json http://localhost:3000 > report.json

# Run tests on multiple URLs
pa11y http://localhost:3000
pa11y http://localhost:3000/welcome
pa11y http://localhost:3000/moment-capture
```

**Interpretation:**

```
Errors: Must fix
Warnings: Should review
Notices: FYI

Output shows:
- Issue code (e.g., WCAG2AA.Principle1.Guideline1_4_3.Level_AA.G18.Fail)
- Description of issue
- Element causing issue
- Suggested fix
```

---

## Part 6: High Contrast Mode Testing

### 6.1 Windows High Contrast Mode

**Activation:**

```
Windows 11:
1. Settings → Accessibility → Contrast
2. Turn on "Contrast" toggle
3. Select theme: High contrast black/white/custom
4. Restart browser or reload page
```

**Test Procedure:**

```
☐ Text remains readable
☐ Buttons still distinguishable
☐ Focus indicators visible
☐ Images not invisible
☐ Colors map to high contrast palette
☐ No white text on white background
☐ No black text on black background
☐ Custom color CSS respected
```

### 6.2 macOS Dark Mode

**Activation:**

```
System Preferences → General
Light/Dark/Auto
```

**Test in Both Modes:**

```
Light Mode:
☐ Contrast sufficient
☐ Text readable
☐ Buttons visible

Dark Mode:
☐ Contrast sufficient (text + bg)
☐ Text readable
☐ Buttons visible (may need different colors)
```

---

## Part 7: Comprehensive Test Report Template

**Create ACCESSIBILITY_TEST_REPORT.md:**

```markdown
# Comprehensive Accessibility Test Report

Date: 2025-12-11
Test Cycle: Phase 1 - Critical Fixes Verification
Tester: [Name]

## Executive Summary

Overall Compliance: 72% (was 55% before fixes)
Critical Issues Remaining: 3
Major Issues: 8
Status: On track for 95%+ compliance

## Test Scope

✓ Keyboard Navigation: Landing Page, Welcome Tour, Moment Capture
✓ Screen Reader: NVDA on Windows
✓ Color Contrast: All components with WebAIM
✓ Touch Targets: Measured with 48px rule
✓ Zoom: 200% on all pages
✓ Automated Tools: axe, WAVE, Lighthouse

## Detailed Results

### 1. Keyboard Navigation (PASS/FAIL)

Landing Page: ✓ PASS
- 14 tab stops found (expected 12-15)
- Tab order logical
- All buttons accessible
- Focus rings visible (after fix to 4px)

Welcome Tour: ✓ PASS
- Carousel navigation with arrows: working
- Modal focus trap: working (after fix)
- Escape closes modal: working

Moment Capture: ✗ FAIL
- Step navigation incomplete
- Some option buttons not keyboard accessible
- Remediation: Priority - Week 2

### 2. Screen Reader Testing (NVDA)

Landing Page: ✓ PASS
- Page title announced
- Landmark structure present
- All buttons labeled
- Decorative elements hidden

Welcome Tour: ✓ PASS
- Slide position announced
- Modal title announced
- Focus trap working

Moment Capture: ✗ FAIL
- Step changes not announced (missing aria-live)
- Remediation: Priority - Week 2

### 3. Color Contrast

Landing Page Header: ✗ FIXED (was failing)
- Login button: Now 11.2:1 ✓ (was 4.52:1)

Overall: ✓ PASS
- 40+ elements tested
- 38 pass AAA (7:1)
- 2 marginal (require verification)

### 4. Touch Targets

Mobile Menu Button: ✓ FIXED
- Now 48x48px (was 36px)

Progress Dots: ✓ FIXED
- Now 48x48px with proper spacing

Overall: ✓ PASS

### 5. prefers-reduced-motion

Status: ✓ FIXED
- useReducedMotion hook implemented
- All animations respect setting
- Tested on macOS with setting enabled

### 6. ARIA Implementation

Missing aria-labels: ✓ FIXED (12 locations)
Modal accessibility: ✓ FIXED
Form validation: IN PROGRESS

### 7. Automated Tools Results

axe DevTools:
- Critical: 0 (was 5)
- Serious: 2 (was 8)
- Moderate: 3 (was 6)

WAVE:
- Errors: 1 (was 12)
- Warnings: 3 (was 9)
- Features: 18 (good landmarks present)

Lighthouse:
- Accessibility: 92/100 (was 78/100)

Pa11y:
- Errors: 1 (was 8)
- Warnings: 2 (was 5)

## Issues Requiring Attention

### Critical (Must Fix Before Launch)

1. Moment Capture Form Validation
   - Status: In progress
   - Impact: Users can't see errors
   - Timeline: Week 2

### Major (Complete Before Launch)

1. aria-live announcements for step changes
   - Status: In progress
   - Impact: Screen reader users miss updates
   - Timeline: Week 2

2. Help text system
   - Status: Pending
   - Impact: Users unclear on requirements
   - Timeline: Week 2

### Minor (Post-Launch)

1. Generic aria-labels improvement
   - Status: Pending
   - Impact: Screen reader verbosity
   - Timeline: Post-launch

## Recommendations

1. **Immediate**: Complete Moment Capture fixes
2. **This Week**: Implement aria-live regions and help text
3. **Next Week**: Full screen reader re-test on all pages
4. **Before Launch**: Run automated tests, fix any new issues

## Sign-Off

✓ Testing completed per plan
✓ Critical path items on track
✓ Ready for next phase

Tester: [Name]
Date: 2025-12-11
Approved By: [Manager]
```

---

## Part 8: Continuous Testing Process

### 8.1 Pre-Commit Testing

```bash
# Create .git/hooks/pre-commit

#!/bin/bash

echo "Running accessibility pre-commit checks..."

# Run Pa11y on localhost
npm run start &
sleep 5

pa11y --standard WCAG3AAA http://localhost:3000 \
  || exit 1

kill %1

echo "✓ Accessibility checks passed"
exit 0
```

### 8.2 Automated CI/CD Testing

**Create .github/workflows/a11y-tests.yml:**

```yaml
name: Accessibility Tests

on: [pull_request, push]

jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: 18

      - name: Install dependencies
        run: npm install

      - name: Build project
        run: npm run build

      - name: Run Pa11y audit
        run: npm run audit:a11y

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: accessibility-report
          path: a11y-report.json
```

### 8.3 Ongoing Monitoring

**Weekly Testing Schedule:**

```
Monday: Automated tool audit (axe, WAVE, Pa11y)
Tuesday: Screen reader testing (NVDA)
Wednesday: Keyboard navigation testing
Thursday: Mobile/responsive testing
Friday: Color contrast spot checks + report
```

---

## Conclusion

This testing procedure ensures comprehensive WCAG 3.0 AAA compliance through:
- Multiple automated tools
- Manual testing across devices
- Screen reader validation
- Regular monitoring

**Target:** 95%+ compliance achieved and maintained

---

**End of Accessibility Testing Procedures**
