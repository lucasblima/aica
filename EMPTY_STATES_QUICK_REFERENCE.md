# Empty States - Quick Reference Guide

## The Golden Rule

**An empty state is not a void; it is a call to action.**

---

## Quick Implementation Checklist

When you encounter an empty state:

- [ ] Does it use `ceramic-tray` container?
- [ ] Does it have a `ceramic-inset` icon container?
- [ ] Does it have a warm, supportive headline?
- [ ] Does it explain why it's empty?
- [ ] Does it have a primary CTA button?
- [ ] Are all CTAs keyboard accessible?
- [ ] Does it respect `prefers-reduced-motion`?
- [ ] Is text color contrast WCAG AA compliant?

If any checkbox is unchecked, improve the empty state!

---

## Common Empty State Scenarios

### Scenario 1: First Time User
```tsx
<EmptyState
  type="new_user"
  onPrimaryAction={() => navigate('/create')}
  onSecondaryAction={() => showTutorial()}
/>
```

### Scenario 2: No Data Today
```tsx
<EmptyState
  type="no_data_today"
  onPrimaryAction={() => openCapture()}
/>
```

### Scenario 3: List / Grid Empty
```tsx
<motion.div
  className="ceramic-tray p-8 text-center"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
>
  <div className="ceramic-inset w-20 h-20 flex items-center justify-center mx-auto mb-6 bg-blue-50">
    <IconComponent className="w-10 h-10 text-ceramic-accent" />
  </div>
  <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
    No items yet
  </h3>
  <p className="text-ceramic-text-secondary mb-6">
    Start creating your first item
  </p>
  <button
    onClick={handleCreate}
    className="ceramic-card px-6 py-3 font-bold text-white bg-ceramic-accent hover:scale-105"
  >
    Create First Item
  </button>
</motion.div>
```

---

## Key CSS Classes

| Class | Purpose | Appearance |
|-------|---------|-----------|
| `ceramic-tray` | Empty state container | Inset/depressed surface |
| `ceramic-inset` | Icon wrapper | Tactile, interactive pill |
| `ceramic-card` | CTA button | Elevated, pressable |
| `text-etched` | Headlines | Embossed text effect |

---

## Icon Size Guidelines

| Container | Icon Size | Use Case |
|-----------|-----------|----------|
| w-16 h-16 (64px) | w-8 h-8 | Compact empty states |
| w-20 h-20 (80px) | w-10 h-10 | Standard empty states |
| w-24 h-24 (96px) | w-12 h-12 | Large, prominent states |

---

## Text Guidelines

| Element | Font Size | Font Weight | Max Width |
|---------|-----------|-------------|-----------|
| Headline | 18-24px | **bold** (700) | 100% |
| Message | 14-16px | regular (400) | 560px |
| CTA Label | 14-16px | **bold** (700) | - |
| Supporting | 12px | regular (400) | 400px |

---

## Animation Patterns

### Container Entrance
```tsx
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.5 }}
```

### Icon Spring
```tsx
initial={{ scale: 0.8 }}
animate={{ scale: 1 }}
transition={{ type: 'spring', stiffness: 200, damping: 20 }}
```

### Button Interactions
```tsx
// Hover
whileHover={{ scale: 1.05 }}
// Click
whileTap={{ scale: 0.95 }}
// Or with class
className="hover:scale-105 active:scale-95 transition-transform"
```

---

## Color Usage

```css
/* Primary accent (CTA buttons) */
background: var(--ceramic-accent);  /* Amber #f59e0b */

/* Icon containers */
background: bg-blue-50;    /* Information */
background: bg-green-50;   /* Success */
background: bg-amber-50;   /* Caution */
background: bg-red-50;     /* Error */

/* Text */
color: text-ceramic-text-primary;     /* Headlines */
color: text-ceramic-text-secondary;   /* Body text */
```

---

## Accessibility Checklist

### ARIA Attributes
```tsx
<div
  role="status"
  aria-live="polite"
  aria-label={`Empty state: ${title}`}
>
```

### Keyboard Navigation
- All buttons must be keyboard accessible
- Tab order must be logical
- Focus indicators must be visible

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

### Color Contrast
- Normal text: 4.5:1 ratio (WCAG AA)
- Large text: 3:1 ratio (WCAG AA)

---

## Before & After Examples

### BEFORE: Cold Empty State
```tsx
// BAD - Generic, no CTA, uninviting
<div className="text-center py-8">
  <p>No items found</p>
</div>
```

### AFTER: Warm Empty State
```tsx
// GOOD - Warm, ceramic, CTA present
<motion.div
  className="ceramic-tray p-8 text-center"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
>
  <div className="ceramic-inset w-20 h-20 flex items-center justify-center mx-auto mb-6 bg-blue-50">
    <PlusIcon className="w-10 h-10 text-ceramic-accent" />
  </div>
  <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
    Create your first item
  </h3>
  <p className="text-ceramic-text-secondary mb-6">
    Start building your collection now
  </p>
  <button
    onClick={handleCreate}
    className="ceramic-card px-6 py-3 font-bold text-white bg-ceramic-accent hover:scale-105"
  >
    Create Item
  </button>
</motion.div>
```

---

## Warmer Language Examples

**AVOID**: Cold, passive language
- "No items"
- "Nothing here"
- "List is empty"

**USE**: Warm, actionable language
- "Create your first item"
- "Start your collection"
- "Begin your journey"
- "Explore what's possible"

---

## Common Mistakes to Avoid

1. **No CTA button** - Always provide a primary action
2. **Text too small** - Headlines should be 18px+
3. **Generic icons** - Use contextual icons that relate to content
4. **No ceramic styling** - Use `ceramic-tray` and `ceramic-inset`
5. **Cold language** - Warm tone guides users forward
6. **Missing ARIA labels** - Always include `role="status"` and `aria-live="polite"`
7. **Poor contrast** - Test with Lighthouse or WAVE
8. **No focus indicator** - Keyboard users need visible focus states

---

## Resources

- Full guide: `/EMPTY_STATES_GUIDE.md`
- Component: `src/components/EmptyState.tsx`
- Examples: `src/components/EmptyState.example.tsx`
- Completion report: `/WORKSTREAM_B_COMPLETION_REPORT.md`

---

## Need Help?

1. Check if your empty state follows the template above
2. Compare with working examples in:
   - `src/modules/connections/views/ConnectionsView.tsx`
   - `src/modules/podcast/views/PodcastDashboard.tsx`
   - `src/modules/atlas/components/TaskList.tsx`
3. Use the `EmptyState` component with preset types when possible
4. Reference the full guide for complex scenarios

---

## Remember

**An empty state is your opportunity to guide users toward meaningful action.**

Make it warm. Make it inevitable. Make it beautiful.
