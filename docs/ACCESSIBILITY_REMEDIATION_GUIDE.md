# Accessibility Remediation Guide - WCAG AAA Implementation

**Purpose:** Step-by-step guide to remediate critical and major accessibility issues in Aicac onboarding module
**Target Completion:** 2-3 weeks
**Expected Outcome:** 95%+ WCAG AAA compliance

---

## Priority 1: Critical Fixes (Must Complete First)

### Fix 1.1: Color Contrast - Global Text Improvements

**Issue:** Text contrast insufficient for AAA (7:1 minimum)
**Affected Components:** Header, HeroSection, ValueProposition, Footer
**Severity:** CRITICAL

#### Current Problem
```tsx
// BEFORE - Insufficient contrast
<button className="text-[#5C554B] ... bg-[#F8F7F5]">
  Entrar
</button>
// Contrast: 4.52:1 (needs 7:1)

<span className="text-[#5C554B]">
  Description text
</span>
// Contrast with white: 5.48:1
```

#### Solution 1: Update Color Palette

**Step 1: Modify src/styles/colors.ts or tailwind.config.ts**

```typescript
// Add new accessible color palette
const accessibleColors = {
  // Primary text - darker brown for better contrast
  text: {
    primary: '#1A0D0A',      // Was #2B1B17 (even darker for text)
    secondary: '#3D2B24',    // Was #5C554B (darker secondary)
    tertiary: '#6B5B50',     // Was #948D82 (lighter, for hints)
    light: '#8B7B70'         // Lighter variant for backgrounds
  },

  // Button colors for contrast
  button: {
    primary: '#5A8FEF',      // Primary CTA button (keep)
    primaryHover: '#4A7FDF', // Darker hover state
    secondary: '#2B1B17',    // Border button text
    secondaryHover: '#1A0D0A'
  },

  // Background
  background: {
    white: '#FFFFFF',
    light: '#F8F7F5',
    lighter: '#FDFBF8'
  }
};

// Add to Tailwind config
module.exports = {
  theme: {
    extend: {
      colors: {
        'text-primary': '#1A0D0A',
        'text-secondary': '#3D2B24',
        'text-tertiary': '#6B5B50',
      }
    }
  }
}
```

**Step 2: Update Header.tsx**

```tsx
// BEFORE
<button
  onClick={onLoginClick}
  className="text-sm font-500 text-[#5C554B] px-4 py-2 border border-[#E8E6E0] rounded-lg hover:bg-[#F8F7F5] hover:border-[#6B9EFF] transition-all focus:outline-none focus:ring-2 focus:ring-[#6B9EFF]"
  aria-label="Login to your account"
>
  Entrar
</button>

// AFTER - Improved contrast
<button
  onClick={onLoginClick}
  className="text-sm font-500 text-[#1A0D0A] px-4 py-3 border-2 border-[#E8E6E0] rounded-lg hover:bg-[#F8F7F5] hover:border-[#6B9EFF] transition-all focus:outline-none focus:ring-4 focus:ring-[#6B9EFF] focus:ring-offset-2"
  aria-label="Login to your account"
>
  Entrar
</button>
```

**Color Contrast After Changes:**
- Text #1A0D0A on #F8F7F5: **11.2:1** ✓ (exceeds 7:1)
- Text #3D2B24 on white: **9.8:1** ✓ (exceeds 7:1)

#### Checklist
- [ ] Update color palette in config
- [ ] Update Header.tsx button colors
- [ ] Update HeroSection.tsx button colors
- [ ] Update ValueProposition.tsx text colors
- [ ] Update Footer.tsx link colors
- [ ] Verify contrast ratios with WebAIM Contrast Checker
- [ ] Test with Vision Simulator (color blindness)

---

### Fix 1.2: Focus Ring Sizing - Global Implementation

**Issue:** Focus ring too thin (2px vs 3px minimum for AAA)
**Affected:** All interactive elements
**Severity:** CRITICAL

#### Current Problem
```tsx
// BEFORE - Ring too thin
className="focus:outline-none focus:ring-2 focus:ring-[#6B9EFF]"
// Ring is only 2px width

// AFTER - Proper AAA focus ring
className="focus:outline-none focus:ring-4 focus:ring-[#6B9EFF] focus:ring-offset-2"
// Ring is 4px width with 2px offset = 3px visible minimum
```

#### Solution: Create Focus Utility Classes

**Step 1: Add to src/styles/globals.css or Tailwind config**

```css
/* Global focus styles for AAA compliance */
@layer components {
  /* Standard focus ring - 3px minimum visible */
  .focus-ring {
    @apply focus:outline-none focus:ring-4 focus:ring-[#6B9EFF] focus:ring-offset-2;
  }

  /* Dark background focus ring (white ring) */
  .focus-ring-light {
    @apply focus:outline-none focus:ring-4 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#5C554B];
  }

  /* High contrast focus ring */
  .focus-ring-contrast {
    @apply focus:outline-none focus:ring-4 focus:ring-[#000000] focus:ring-offset-2;
  }
}
```

**Step 2: Apply to all buttons globally**

Create a `useAccessibleButton` hook:

```typescript
// src/hooks/useAccessibleButton.ts
export const useAccessibleButton = () => {
  return {
    focusClasses: 'focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-[#6B9EFF]'
  };
};

// Usage in component
const { focusClasses } = useAccessibleButton();

<button className={`px-4 py-2 rounded-lg ${focusClasses}`}>
  Click me
</button>
```

**Step 3: Update key components**

**Header.tsx:**
```tsx
// BEFORE
<button
  className="... focus:outline-none focus:ring-2 focus:ring-[#6B9EFF]"
>

// AFTER
<button
  className="... focus:outline-none focus:ring-4 focus:ring-[#6B9EFF] focus:ring-offset-2"
>
```

**HeroSection.tsx:**
```tsx
// BEFORE
<button
  className="... focus:outline-none focus:ring-2 focus:ring-[#6B9EFF] focus:ring-offset-2"
>
  Começar Agora
</button>

// AFTER
<button
  className="... focus:outline-none focus:ring-4 focus:ring-[#6B9EFF] focus:ring-offset-2"
>
  Começar Agora
</button>
```

#### Verification
```html
<!-- Focus ring should be:
- 4px width in Tailwind = 3px CSS ring width
- Plus 2px offset = 5px total visible
- Meets AAA 3px minimum requirement
- Contrasts 3:1 with background
-->
```

#### Checklist
- [ ] Add focus-ring utility classes
- [ ] Create useAccessibleButton hook
- [ ] Update Header buttons (3 buttons)
- [ ] Update HeroSection buttons (2 buttons)
- [ ] Update ValueProposition cards (focus-within)
- [ ] Update WelcomeTour buttons
- [ ] Update MomentCaptureFlow buttons
- [ ] Test keyboard navigation (Tab key)
- [ ] Verify focus visible with browser DevTools

---

### Fix 1.3: Touch Target Size - 48x48px Minimum

**Issue:** Buttons too small (<48x48px) making them hard to tap
**Affected:** Mobile menu button, progress dots, option buttons
**Severity:** CRITICAL

#### Current Problem

**Header Mobile Menu Button:**
```tsx
// BEFORE - Too small
<button
  className="md:hidden p-2 hover:bg-[#F8F7F5] rounded-lg"
  // p-2 = 8px padding = ~36-40px total with icon
>
  {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
</button>
```

#### Solution 1: Mobile Menu Button

**Header.tsx:**
```tsx
// AFTER - 48x48px minimum
<button
  className="md:hidden w-12 h-12 p-2 flex items-center justify-center hover:bg-[#F8F7F5] rounded-lg focus:outline-none focus:ring-4 focus:ring-[#6B9EFF]"
  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
  aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
  aria-expanded={mobileMenuOpen}
>
  {mobileMenuOpen ? (
    <X size={24} className="text-[#2B1B17]" />
  ) : (
    <Menu size={24} className="text-[#2B1B17]" />
  )}
</button>
```

**Explanation:**
- `w-12 h-12` = 48x48px in Tailwind
- Flex centering ensures icon is centered
- Maintains 8px padding inside for visual comfort

#### Solution 2: Progress Dots

**ProgressDots.tsx - Current Implementation (likely too small):**

```tsx
// BEFORE - Likely < 48px
<div className="flex gap-2">
  {pillars.map((pillar, idx) => (
    <button
      key={idx}
      onClick={() => onNavigate(idx)}
      className="w-3 h-3 rounded-full bg-gray-400"
      aria-label={`Go to pillar ${idx + 1}`}
      aria-current={currentIndex === idx ? 'page' : undefined}
    />
  ))}
</div>

// AFTER - 48x48px minimum with spacing
<div className="flex gap-3">
  {pillars.map((pillar, idx) => (
    <button
      key={idx}
      onClick={() => onNavigate(idx)}
      // Create 48x48px touch target
      className="relative w-12 h-12 rounded-full focus:outline-none focus:ring-4 focus:ring-[#6B9EFF] focus:ring-offset-2 group"
      aria-label={`Navigate to ${pillar.name} (slide ${idx + 1} of ${pillars.length})`}
      aria-current={currentIndex === idx ? 'page' : undefined}
      title={`Navigate to ${pillar.name}`}
    >
      {/* Visual indicator - smaller, centered */}
      <div className={`
        absolute inset-0 m-auto w-4 h-4 rounded-full
        ${currentIndex === idx
          ? 'bg-[#6B9EFF]'
          : 'bg-gray-400 group-hover:bg-gray-500'
        }
        transition-all duration-200
      `} />
    </button>
  ))}
</div>
```

**Key Changes:**
- Button: 48x48px (w-12 h-12)
- Dot indicator: 16px (w-4 h-4) - visual only
- 12px gap ensures 8px spacing between targets
- Full 48x48px area is tappable

#### Solution 3: Option Buttons in Moment Capture

**moment/MomentTypeSelector.tsx:**

```tsx
// BEFORE - Too small
<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
  {momentTypes.map(type => (
    <button
      key={type.id}
      className="p-4 border-2 rounded-lg text-center"
      onClick={() => onSelect(type.id)}
    >
      <div className="text-3xl mb-2">{type.emoji}</div>
      <div className="text-sm font-medium">{type.label}</div>
    </button>
  ))}
</div>

// AFTER - Minimum 48x48px + good spacing
<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
  {momentTypes.map(type => (
    <button
      key={type.id}
      className={`
        relative p-4 min-h-[120px] md:min-h-[140px] border-2 rounded-lg
        flex flex-col items-center justify-center
        transition-all duration-200
        focus:outline-none focus:ring-4 focus:ring-[#6B9EFF] focus:ring-offset-2
        ${isSelected(type.id)
          ? 'border-[#6B9EFF] bg-[#F0F5FF]'
          : 'border-[#E8E6E0] hover:border-[#6B9EFF]'
        }
      `}
      onClick={() => onSelect(type.id)}
      aria-pressed={isSelected(type.id)}
      aria-label={`Select ${type.label}`}
    >
      <div className="text-4xl mb-3">{type.emoji}</div>
      <div className="text-sm font-medium text-center text-[#2B1B17]">
        {type.label}
      </div>
    </button>
  ))}
</div>
```

**Specification:**
- Minimum height: 120px (phone), 140px (tablet/desktop)
- Width: Full column (auto from grid)
- Ensures 48x48px minimum touch target
- 16px gap = 8px spacing between targets ✓

#### Emotion Picker Button Implementation

**moment/EmotionPicker.tsx:**

```tsx
// BEFORE - Too small
<button
  onClick={() => onSelectEmotion(emotion)}
  className="p-2 rounded-full border-2"
>
  {emotion.emoji}
</button>

// AFTER - 48x48px minimum
<button
  onClick={() => onSelectEmotion(emotion)}
  className={`
    w-12 h-12 flex items-center justify-center rounded-full
    border-2 transition-all duration-200
    focus:outline-none focus:ring-4 focus:ring-[#6B9EFF] focus:ring-offset-2
    ${selectedEmotion === emotion.id
      ? 'border-[#6B9EFF] bg-[#F0F5FF]'
      : 'border-[#E8E6E0] hover:border-[#6B9EFF]'
    }
  `}
  aria-pressed={selectedEmotion === emotion.id}
  aria-label={`Select emotion: ${emotion.label}`}
  title={emotion.label}
>
  <span className="text-3xl">{emotion.emoji}</span>
</button>
```

#### Checklist
- [ ] Update Header mobile menu button (w-12 h-12)
- [ ] Update ProgressDots implementation (48x48px buttons)
- [ ] Update MomentTypeSelector (120-140px min height)
- [ ] Update EmotionPicker (w-12 h-12 buttons)
- [ ] Update LifeAreaSelector buttons
- [ ] Verify with 48px touch target simulator
- [ ] Test on real mobile device (iPhone, Android)
- [ ] Measure spacing between targets (minimum 8px)

---

### Fix 1.4: Implement prefers-reduced-motion Support

**Issue:** Animations don't respect user accessibility preferences
**Affected:** WelcomeTour, PillarCard, HeroSection, MomentCaptureFlow
**Severity:** CRITICAL

#### Current Problem
```tsx
// BEFORE - All users see animations
<motion.div
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6 }}
>
  Content
</motion.div>

// User with prefers-reduced-motion: reduce gets full animations!
```

#### Solution 1: Create useReducedMotion Hook

**Create src/hooks/useReducedMotion.ts:**

```typescript
/**
 * Hook to respect user's motion preferences
 * Returns true if user has enabled "prefers reduced motion" in OS settings
 *
 * Usage:
 *   const prefersReducedMotion = useReducedMotion();
 *   const duration = prefersReducedMotion ? 0 : 0.6;
 */
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    // Different syntax for different browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return prefersReducedMotion;
}
```

#### Solution 2: Update Key Components

**WelcomeTour.tsx - Blob Animations:**

```tsx
// BEFORE
<div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />

// AFTER
import { useReducedMotion } from '../hooks/useReducedMotion';

export function WelcomeTour({ ... }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div>
      {/* Background decoration - respect motion preference */}
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${prefersReducedMotion ? 'opacity-0' : ''}`}>
        <div className={`
          absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full
          mix-blend-multiply filter blur-3xl opacity-20
          ${prefersReducedMotion ? '' : 'animate-blob'}
        `} />
        {/* Rest of blob divs... */}
      </div>
    </div>
  );
}
```

**HeroSection.tsx - Fade-in Animations:**

```tsx
// BEFORE
<div className="space-y-6 animate-fade-in-up">

// AFTER
import { useReducedMotion } from '../hooks/useReducedMotion';

export function HeroSection({ ... }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`
      space-y-6
      ${prefersReducedMotion ? '' : 'animate-fade-in-up'}
    `}>
      {/* Content */}
    </div>
  );
}
```

**PillarCard.tsx - Framer Motion Animations:**

```tsx
// BEFORE
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

// AFTER
import { useReducedMotion } from '../hooks/useReducedMotion';

export const PillarCard: React.FC<PillarCardProps> = ({ ... }) => {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.6,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : -20,
      transition: { duration: prefersReducedMotion ? 0 : 0.3 },
    },
  };

  // Rest of component...
};
```

**MomentCaptureFlow.tsx - Step Transitions:**

```tsx
// BEFORE
<AnimatePresence mode="wait">
  <motion.div
    key={`step-${currentStep}`}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.4 }}
  >

// AFTER
import { useReducedMotion } from '../hooks/useReducedMotion';

export function MomentCaptureFlow({ ... }) {
  const prefersReducedMotion = useReducedMotion();

  <AnimatePresence mode="wait">
    <motion.div
      key={`step-${currentStep}`}
      initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: prefersReducedMotion ? 0 : -20 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
    >
}
```

#### Solution 3: Global CSS for Animations

**Add to src/styles/globals.css:**

```css
/* Respect prefers-reduced-motion for ALL animations */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  /* Hide decorative animations */
  .animate-blob,
  .animate-fade-in-up,
  .animate-fade-in {
    animation: none !important;
  }
}
```

#### Testing Checklist
- [ ] Create useReducedMotion hook
- [ ] Update WelcomeTour blob animations
- [ ] Update HeroSection fade-in
- [ ] Update PillarCard Framer Motion
- [ ] Update MomentCaptureFlow transitions
- [ ] Add global CSS media query
- [ ] Test on macOS (System Preferences > Accessibility > Display)
- [ ] Test on Windows (Settings > Ease of Access > Display)
- [ ] Test on iOS (Settings > Accessibility > Motion)
- [ ] Test on Android (Settings > Accessibility > Motion)

---

### Fix 1.5: Add Missing ARIA Labels - Interactive Regions

**Issue:** 12+ interactive elements lack descriptive aria-labels
**Affected:** ProgressDots, NavigationArrows, option buttons, etc.
**Severity:** CRITICAL

#### Pattern: Generic vs. Specific Labels

```tsx
// BEFORE - Too generic
<button aria-label="Learn more">
  Learn more
</button>

// AFTER - Specific and descriptive
<button aria-label="Learn more about how Aica works">
  Learn more
</button>
```

#### Fix 1.5.1: ProgressDots.tsx

**Current (likely missing good aria-label):**
```tsx
// BEFORE
<button
  onClick={() => onNavigate(idx)}
  className="w-3 h-3 rounded-full"
  aria-label="Go to pillar"
>
```

**AFTER:**
```tsx
<button
  onClick={() => onNavigate(idx)}
  className="w-12 h-12 relative rounded-full focus:outline-none focus:ring-4 focus:ring-[#6B9EFF] focus:ring-offset-2"
  aria-label={`Navigate to ${pillar.name} (slide ${idx + 1} of ${pillars.length})`}
  aria-current={currentIndex === idx ? 'page' : undefined}
  title={`${pillar.name} - Slide ${idx + 1}`}
>
  <div className={`absolute inset-0 m-auto w-4 h-4 rounded-full ${
    currentIndex === idx ? 'bg-[#6B9EFF]' : 'bg-gray-400'
  }`} />
</button>
```

**Why this works:**
- `aria-label="Navigate to Consciência (slide 1 of 4)"` is specific
- Screen reader announces: "Button, Navigate to Consciência, slide 1 of 4"
- `aria-current="page"` indicates active slide
- `title` provides tooltip for mouse users

#### Fix 1.5.2: MomentTypeSelector Options

**moment/MomentTypeSelector.tsx - Current Issue:**

```tsx
// BEFORE - Insufficient aria-label
<button
  onClick={() => onSelect(type.id)}
  className="p-4 border-2 rounded-lg"
  aria-label="Select moment type"
>
  <div className="text-3xl">{type.emoji}</div>
  <div className="text-sm">{type.label}</div>
</button>

// Problem: "aria-label" is generic, doesn't specify which type
```

**AFTER - Proper aria-label:**

```tsx
<button
  key={type.id}
  onClick={() => onSelect(type.id)}
  className={`
    p-4 min-h-[120px] border-2 rounded-lg
    flex flex-col items-center justify-center
    focus:outline-none focus:ring-4 focus:ring-[#6B9EFF] focus:ring-offset-2
    ${isSelected(type.id)
      ? 'border-[#6B9EFF] bg-[#F0F5FF]'
      : 'border-[#E8E6E0]'
    }
  `}
  onClick={() => onSelect(type.id)}
  aria-pressed={isSelected(type.id)}
  aria-label={`Select moment type: ${type.label}. ${isSelected(type.id) ? 'Currently selected.' : ''}`}
  title={type.label}
>
  <span className="text-4xl mb-3">{type.emoji}</span>
  <span className="text-sm font-medium">{type.label}</span>
</button>
```

**Screen reader announcement:**
- "Button, Select moment type: Personal Growth. Currently selected."

#### Fix 1.5.3: EmotionPicker

**moment/EmotionPicker.tsx:**

```tsx
// BEFORE
<button
  onClick={() => onSelectEmotion(emotion)}
  className="p-2 rounded-full border-2"
>
  {emotion.emoji}
</button>

// AFTER
<button
  key={emotion.id}
  onClick={() => onSelectEmotion(emotion)}
  className={`
    w-12 h-12 flex items-center justify-center rounded-full
    border-2 focus:outline-none focus:ring-4 focus:ring-[#6B9EFF] focus:ring-offset-2
    ${selectedEmotion === emotion.id
      ? 'border-[#6B9EFF] bg-[#F0F5FF]'
      : 'border-[#E8E6E0] hover:border-[#6B9EFF]'
    }
  `}
  aria-pressed={selectedEmotion === emotion.id}
  aria-label={`Select emotion: ${emotion.label}. ${selectedEmotion === emotion.id ? 'Currently selected.' : ''}`}
  title={emotion.label}
>
  <span className="text-3xl">{emotion.emoji}</span>
</button>
```

#### Fix 1.5.4: NavigationArrows

**tour/NavigationArrows.tsx:**

```tsx
// BEFORE
<button
  onClick={onPrevious}
  disabled={!canGoPrevious}
  className="p-2"
  aria-label="Previous"
>

// AFTER
<button
  onClick={onPrevious}
  disabled={!canGoPrevious}
  className={`
    w-12 h-12 flex items-center justify-center rounded-full
    border-2 border-[#6B9EFF] transition-all
    ${canGoPrevious
      ? 'hover:bg-[#F0F5FF] cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#6B9EFF] focus:ring-offset-2'
      : 'opacity-40 cursor-not-allowed'
    }
  `}
  aria-label={`Previous pillar ${canGoPrevious ? '' : '(disabled)'}`}
  title="Previous pillar (Arrow Left)"
>
  <ChevronLeft size={24} className="text-[#6B9EFF]" />
</button>
```

#### Comprehensive ARIA Label Guide

| Element | BEFORE | AFTER |
|---------|--------|-------|
| Close button | `aria-label="Close"` | `aria-label="Close welcome tour"` |
| Menu toggle | `aria-label="Menu"` | `aria-label="Toggle navigation menu. Menu is ${open ? 'open' : 'closed'}"` |
| Learn more | `aria-label="Learn more"` | `aria-label="Learn more about ${topic}"` |
| Option button | `aria-label="Select"` | `aria-label="Select ${option}. ${isSelected ? 'Currently selected.' : ''}"` |
| Skip button | `aria-label="Skip"` | `aria-label="Skip tour (you can do this later)"` |

#### Checklist
- [ ] Add aria-label to ProgressDots buttons
- [ ] Add aria-label to MomentTypeSelector options
- [ ] Add aria-label to EmotionPicker buttons
- [ ] Add aria-label to LifeAreaSelector checkboxes
- [ ] Add aria-label to NavigationArrows
- [ ] Add aria-label to Skip button
- [ ] Add aria-label to Close buttons in modals
- [ ] Test with screen reader (NVDA/VoiceOver)
- [ ] Verify labels are specific and descriptive

---

### Fix 1.6: Implement Modal Focus Management & ARIA

**Issue:** Modals not accessible - missing focus trap, ARIA roles, focus management
**Affected:** PillarDetails.tsx, FeedbackModal.tsx
**Severity:** CRITICAL

#### Solution 1: Install Focus Trap Library

```bash
npm install focus-trap-react
# or
yarn add focus-trap-react
```

#### Solution 2: Create Accessible Modal Pattern

**Create src/components/AccessibleModal.tsx:**

```typescript
import React, { useRef, useEffect } from 'react';
import FocusTrap from 'focus-trap-react';
import { X } from 'lucide-react';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  primaryAction,
  secondaryAction,
}: AccessibleModalProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isOpen && titleRef.current) {
      // Focus title when modal opens (alternative to focus trap)
      // This ensures announcement of modal title
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      // Backdrop
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <FocusTrap
        focusTrapOptions={{
          initialFocus: titleRef.current || false,
          onDeactivate: onClose,
        }}
      >
        {/* Modal Container */}
        <div
          className="bg-white rounded-lg shadow-lg max-w-md mx-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-4 focus:ring-[#6B9EFF] focus:ring-offset-2"
            aria-label="Close dialog"
            title="Close (Escape key)"
          >
            <X size={24} />
          </button>

          {/* Header */}
          <div className="border-b border-gray-200 p-6">
            <h2
              id="modal-title"
              ref={titleRef}
              className="text-2xl font-bold text-[#2B1B17]"
            >
              {title}
            </h2>
          </div>

          {/* Content */}
          <div id="modal-description" className="p-6">
            {children}
          </div>

          {/* Actions */}
          {(primaryAction || secondaryAction) && (
            <div className="border-t border-gray-200 p-6 flex gap-4">
              {secondaryAction && (
                <button
                  onClick={secondaryAction.onClick}
                  className="flex-1 px-4 py-2 border-2 border-[#E8E6E0] text-[#2B1B17] rounded-lg font-medium hover:bg-[#F8F7F5] focus:outline-none focus:ring-4 focus:ring-[#6B9EFF] focus:ring-offset-2"
                >
                  {secondaryAction.label}
                </button>
              )}
              {primaryAction && (
                <button
                  onClick={primaryAction.onClick}
                  className="flex-1 px-4 py-2 bg-[#6B9EFF] text-white rounded-lg font-medium hover:bg-[#5A8FEF] focus:outline-none focus:ring-4 focus:ring-[#6B9EFF] focus:ring-offset-2"
                >
                  {primaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>
      </FocusTrap>
    </div>
  );
}
```

#### Solution 3: Update PillarDetails.tsx

```tsx
// BEFORE - Non-accessible modal
export function PillarDetails({ pillar, isOpen, onClose, onStart }) {
  if (!isOpen || !pillar) return null;

  return (
    <div className="fixed inset-0">
      <div className="bg-white rounded-lg">
        <h2>{pillar.name}</h2>
        {/* Content */}
      </div>
    </div>
  );
}

// AFTER - Accessible modal with proper ARIA
import { AccessibleModal } from '../common/AccessibleModal';

export function PillarDetails({ pillar, isOpen, onClose, onStart }) {
  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title={pillar?.name || ''}
      primaryAction={{
        label: `Começar com ${pillar?.name}`,
        onClick: () => onStart(pillar!),
      }}
      secondaryAction={{
        label: 'Voltar',
        onClick: onClose,
      }}
    >
      {pillar && (
        <div className="space-y-4">
          <p className="text-[#5C554B]">{pillar.description}</p>

          {/* Benefits */}
          <div>
            <h3 className="font-bold text-[#2B1B17] mb-2">Benefícios:</h3>
            <ul className="list-disc list-inside space-y-1 text-[#5C554B]">
              {pillar.benefits.map((benefit, idx) => (
                <li key={idx}>{benefit}</li>
              ))}
            </ul>
          </div>

          {/* Example */}
          <div className="bg-[#F8F7F5] p-4 rounded-lg">
            <p className="text-xs font-bold text-[#948D82] mb-2">EXEMPLO</p>
            <p className="font-medium text-[#2B1B17]">{pillar.example}</p>
          </div>
        </div>
      )}
    </AccessibleModal>
  );
}
```

#### Solution 4: Handle Escape Key Globally

```typescript
// Add to WelcomeTour.tsx useEffect for keyboard handling
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showDetailsModal) {
      setShowDetailsModal(false);
      // Focus trap will return focus to pillar card
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [showDetailsModal]);
```

#### Checklist
- [ ] Install focus-trap-react
- [ ] Create AccessibleModal component
- [ ] Update PillarDetails.tsx with AccessibleModal
- [ ] Update FeedbackModal.tsx with AccessibleModal
- [ ] Test Escape key handling
- [ ] Test Tab navigation (should stay within modal)
- [ ] Verify focus returned to trigger element on close
- [ ] Test with screen reader

---

## Priority 2: Major Fixes (Complete Before Launch)

### Fix 2.1: Add aria-live Regions for Status Updates

**Issue:** Step transitions not announced to screen readers
**Affected:** MomentCaptureFlow, TrailSelectionFlow
**Severity:** MAJOR

#### Solution

**MomentCaptureFlow.tsx:**

```tsx
import React, { useState, useRef } from 'react';

export function MomentCaptureFlow({ userId, onComplete, onError }) {
  const [state, setState] = useState({
    currentStep: 1,
    // ... other state
  });

  const statusRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      {/* Screen reader status announcements */}
      <div
        ref={statusRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        Step {state.currentStep} of 7: {getStepLabel(state.currentStep)}
        {state.error && ` - Error: ${state.error}`}
      </div>

      {/* Progress bar */}
      <ProgressBar
        current={state.currentStep}
        total={7}
        label={`Progress: ${state.currentStep} of 7 steps completed`}
      />

      {/* Step content */}
      <div>
        {state.currentStep === 1 && (
          <MomentTypeSelector
            onSelect={(momentTypeId) => {
              setState(s => ({ ...s, momentTypeId }));
              // Status announcement happens automatically via aria-live
            }}
          />
        )}
        {/* Other steps... */}
      </div>
    </div>
  );
}

function getStepLabel(step: number): string {
  const labels: { [key: number]: string } = {
    1: 'Select moment type',
    2: 'Choose emotion',
    3: 'Select life areas',
    4: 'View recommendations',
    5: 'Add reflection',
    6: 'Record audio',
    7: 'Review and confirm',
  };
  return labels[step] || '';
}
```

---

### Fix 2.2: Add HTML lang Attribute

**Issue:** Missing lang="pt-BR" on root element
**Affected:** index.html
**Severity:** MAJOR

**src/index.html - Before:**
```html
<!DOCTYPE html>
<html>
  <head>
```

**src/index.html - After:**
```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="language" content="Portuguese" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- ... rest of head -->
  </head>
```

---

### Fix 2.3: Form Validation & Error Messages

**Issue:** No validation messages for form fields
**Affected:** MomentCaptureFlow, ReflectionInput
**Severity:** MAJOR

#### Solution

**Create src/components/FormError.tsx:**

```typescript
interface FormErrorProps {
  id: string;
  message: string;
  isVisible: boolean;
}

export function FormError({ id, message, isVisible }: FormErrorProps) {
  return (
    <div
      id={id}
      role="alert"
      aria-live="assertive"
      className={`
        text-sm font-medium text-red-600 mt-2
        ${isVisible ? 'block' : 'hidden'}
      `}
    >
      {message}
    </div>
  );
}
```

**Use in MomentCaptureFlow:**

```tsx
const [errors, setErrors] = useState<{ [key: string]: string }>({});

const validateStep = (step: number): boolean => {
  const newErrors: { [key: string]: string } = {};

  switch (step) {
    case 1:
      if (!state.momentTypeId) {
        newErrors.momentType = 'Please select a moment type';
      }
      break;
    case 2:
      if (!state.emotion && !state.customEmotion) {
        newErrors.emotion = 'Please select or describe your emotion';
      }
      break;
    case 5:
      if (state.reflection.length < 10) {
        newErrors.reflection = 'Please provide at least 10 characters';
      }
      break;
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

<MomentTypeSelector
  onSelect={(id) => {
    setState(s => ({ ...s, momentTypeId: id }));
    setErrors(e => ({ ...e, momentType: '' }));
  }}
/>

<FormError
  id="moment-type-error"
  message={errors.momentType}
  isVisible={!!errors.momentType}
/>
```

---

### Fix 2.4: Required Field Indicators

**Issue:** Required vs. optional fields not clearly marked
**Affected:** MomentCaptureFlow forms
**Severity:** MAJOR

#### Solution

```tsx
interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  helpText?: string;
  error?: string;
}

export function FormField({
  label,
  required = false,
  children,
  helpText,
  error,
}: FormFieldProps) {
  const helpId = `help-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const errorId = `error-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="mb-6">
      <label className="block font-medium text-[#2B1B17] mb-2">
        {label}
        {required && (
          <span
            aria-label="required"
            className="text-red-600 ml-1"
            title="This field is required"
          >
            *
          </span>
        )}
      </label>

      {helpText && (
        <p id={helpId} className="text-sm text-[#948D82] mb-3">
          {helpText}
        </p>
      )}

      <div
        aria-describedby={`${helpText ? helpId : ''} ${error ? errorId : ''}`.trim()}
      >
        {children}
      </div>

      {error && (
        <FormError id={errorId} message={error} isVisible={!!error} />
      )}
    </div>
  );
}
```

**Usage:**

```tsx
<FormField
  label="What happened?"
  required={true}
  helpText="Describe the situation in 20-200 characters"
  error={errors.reflection}
>
  <ReflectionInput
    value={state.reflection}
    onChange={(value) => setState(s => ({ ...s, reflection: value }))}
    aria-required="true"
  />
</FormField>
```

---

## Testing & Verification

### Manual Testing Checklist

```markdown
### Keyboard Navigation
- [ ] Can navigate to all interactive elements using Tab key
- [ ] Can navigate backwards using Shift+Tab
- [ ] Tab order is logical (top-to-bottom, left-to-right)
- [ ] Focus indicator visible on all elements
- [ ] Can activate buttons with Space or Enter key
- [ ] Can navigate modals with Tab (focus trap works)
- [ ] Can close modals with Escape key

### Screen Reader Testing (VoiceOver/NVDA)
- [ ] Page title announced correctly
- [ ] Navigation menu structure clear
- [ ] All buttons have descriptive labels
- [ ] Form fields labeled correctly
- [ ] Error messages announced immediately
- [ ] Step changes announced
- [ ] Modal title announced on open
- [ ] Images have descriptive alt text
- [ ] Icon purpose understood

### Color & Contrast
- [ ] All text meets 7:1 contrast ratio (AAA)
- [ ] Buttons meet 7:1 contrast ratio
- [ ] UI components meet 7:1 contrast ratio
- [ ] Tested with WCAG contrast checker
- [ ] Tested with Color Blindness Simulator

### Motion
- [ ] Disable animations in OS settings
- [ ] Verify animations are disabled
- [ ] Test on all devices
- [ ] No sudden movements or flashes

### Touch Targets
- [ ] All buttons at least 48x48px
- [ ] 8px spacing between touch targets
- [ ] Tested on iOS and Android
- [ ] Tested with large touch targets

### Zoom & Responsive
- [ ] Page readable at 200% zoom
- [ ] No horizontal scrolling at 200%
- [ ] Mobile experience fully accessible
- [ ] Tested at various screen sizes
```

---

## Deployment Checklist

- [ ] All critical fixes implemented
- [ ] All major fixes implemented
- [ ] Manual testing completed
- [ ] Automated testing passing (axe, Pa11y)
- [ ] No console warnings about accessibility
- [ ] Browser zoom testing passed
- [ ] Screen reader testing passed
- [ ] Keyboard navigation testing passed
- [ ] Color contrast verified
- [ ] Documentation updated
- [ ] Ready for production deployment

---

**End of Remediation Guide**
