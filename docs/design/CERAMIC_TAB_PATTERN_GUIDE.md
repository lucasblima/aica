# Ceramic Tab Pattern Guide

**Quick reference for implementing tabs with tactile ceramic differentiation**

## The Pattern

Active tabs should feel "pressed" (ceramic-concave), while inactive tabs should feel "elevated" (ceramic-card).

## Standard Implementation

```tsx
{/* Container: ceramic-tray creates a recessed track for tabs */}
<div className="flex gap-1 p-1 ceramic-tray rounded-full">
  {tabs.map(tab => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`
        flex-1 py-2.5 px-4
        flex items-center justify-center gap-2
        text-sm font-bold rounded-lg
        transition-all
        ${activeTab === tab.id
          ? 'ceramic-concave text-ceramic-text-primary'  // PRESSED
          : 'ceramic-card text-ceramic-text-secondary hover:text-ceramic-text-primary'  // ELEVATED
        }
      `}
    >
      {tab.icon && <tab.icon className="w-4 h-4" />}
      <span className="uppercase tracking-wide text-xs font-bold">
        {tab.label}
      </span>
    </button>
  ))}
</div>
```

## Why This Pattern?

From the Perennial Navigability Audit:

> "A pressed button 'sinks' (ceramic-concave); a hovered item 'lifts' slightly.
> The user must FEEL they have 'pressed' the destination."

## Components Using This Pattern

### ✅ Compliant Components

1. **CeramicTabSelector** - `src/components/CeramicTabSelector.tsx`
   - Used in HeaderGlobal for Personal/Network tabs
   - Used in ConnectionsView for archetype filters
   - Reference implementation

2. **PreProductionHub** - `src/modules/podcast/views/PreProductionHub.tsx`
   - Research tabs: Bio, Ficha, News
   - Lines 786-805

3. **AdminMonitoringDashboard** - `src/components/admin/AdminMonitoringDashboard.tsx`
   - Dashboard tabs: Overview, Cache, Costs, File Search, Health
   - Lines 131-153

## Visual States

| State | Class | Effect |
|-------|-------|--------|
| Inactive | `ceramic-card` | Elevated, floats above surface |
| Hover | `ceramic-card + hover:` | Slightly more elevated, text darkens |
| Active | `ceramic-concave` | Pressed, sinks into surface |
| Tap | Scale 0.97 (optional) | Further pressed feedback |

## CSS Classes Reference

```css
/* Elevated (inactive tabs) */
.ceramic-card {
  box-shadow: 3px 3px 6px rgba(163, 158, 145, 0.35),
              -3px -3px 6px rgba(255, 255, 255, 1.0);
}

/* Pressed (active tabs) */
.ceramic-concave {
  box-shadow: inset 3px 3px 6px rgba(163, 158, 145, 0.35),
              inset -3px -3px 6px rgba(255, 255, 255, 1.0);
}

/* Container (tab tray) */
.ceramic-tray {
  box-shadow: inset 2px 2px 4px rgba(163, 158, 145, 0.25),
              inset -2px -2px 4px rgba(255, 255, 255, 1.0);
}
```

## With Framer Motion (Optional)

```tsx
import { motion } from 'framer-motion';

<motion.button
  className={isActive ? 'ceramic-concave' : 'ceramic-card'}
  whileTap={{ scale: 0.97 }}
  transition={{ duration: 0.15 }}
>
  {tab.label}
</motion.button>
```

## Common Mistakes

### ❌ Don't Use Border-Bottom
```tsx
// OLD PATTERN - Don't use
className={isActive
  ? 'border-b-2 border-blue-500'  // ❌ Railroad track pattern
  : 'border-b-2 border-transparent'
}
```

### ❌ Don't Use Background Color Only
```tsx
// OLD PATTERN - Don't use
className={isActive
  ? 'bg-blue-100'  // ❌ No tactile feedback
  : 'bg-gray-50'
}
```

### ✅ Do Use Ceramic Classes
```tsx
// CORRECT PATTERN
className={isActive
  ? 'ceramic-concave text-ceramic-text-primary'  // ✅ Tactile pressed state
  : 'ceramic-card text-ceramic-text-secondary'    // ✅ Tactile elevated state
}
```

## Migration Checklist

When converting old tab patterns:

- [ ] Replace `border-b` with `ceramic-concave` for active state
- [ ] Replace `bg-*` with `ceramic-card` for inactive state
- [ ] Wrap tabs in `ceramic-tray` container
- [ ] Add `gap-1` between tabs
- [ ] Add `p-1` to container
- [ ] Use `rounded-lg` or `rounded-full` for tabs
- [ ] Ensure text uses `ceramic-text-primary` (active) and `ceramic-text-secondary` (inactive)

## Testing

Visual test: Active tab should appear "pressed into" the tray, while inactive tabs should appear to "float" above it.

Interaction test: When clicking a tab, it should feel like pressing a physical button - the visual feedback should be immediate and tactile.

## Questions?

See `WORKSTREAM_C_VISUAL_HIERARCHY_IMPLEMENTATION.md` for full implementation details and philosophy.
