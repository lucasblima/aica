# Ceramic Design System - Visual Reference

## The Ceramic Metaphor

Imagine a physical ceramic surface. Elements can either:
- **Float above it** (elevated, like a button)
- **Sit flush with it** (neutral)
- **Sink into it** (pressed, like a dimple)

## Core Classes

### 1. ceramic-card (Elevated)
```
     ╭─────────╮
    ╱           ╲
   │   BUTTON    │  ← Floats ABOVE the surface
    ╲           ╱
     ╰─────────╯

Shadow: Outer (dark bottom-right, light top-left)
Use: Inactive tabs, cards, buttons
```

### 2. ceramic-concave (Pressed)
```
    ┌─────────┐
   ╱           ╲
  │  ┌───────┐  │
  │  │PRESSED│  │  ← Sinks INTO the surface
  │  └───────┘  │
   ╲           ╱
    └─────────┘

Shadow: Inset (dark top-left, light bottom-right)
Use: Active tabs, pressed buttons
```

### 3. ceramic-tray (Container)
```
   ┌─────────────┐
  ╱               ╲
 │  ┌───┐ ┌───┐   │  ← Recessed track
 │  │ 1 │ │ 2 │   │     holds elements
 │  └───┘ └───┘   │
  ╲               ╱
   └─────────────┘

Shadow: Subtle inset
Use: Tab containers, input fields
```

### 4. ceramic-inset (Deep Pressed)
```
  ┌───────────┐
 │             │
 │  ┌───────┐ │
 │  │ DEEP  │ │  ← Deep inset
 │  └───────┘ │
 │             │
  └───────────┘

Shadow: Strong inset
Use: Input wells, permanent pressed states
```

## Tab Pattern Visualization

### Complete Tab System
```
┌─────────────────────────────────────────────────┐
│               ceramic-tray (container)          │
│  ╭─────╮  ╭─────╮  ┌─────┐  ╭─────╮          │
│  │ Tab1│  │ Tab2│  │ TAB3│  │ Tab4│          │
│  ╰─────╯  ╰─────╯  └─────┘  ╰─────╯          │
│    ↑         ↑        ↑         ↑              │
│  Float    Float    PRESSED   Float             │
└─────────────────────────────────────────────────┘

Tab 1, 2, 4: ceramic-card (elevated)
Tab 3: ceramic-concave (active/pressed)
Container: ceramic-tray (recessed)
```

## Shadow Anatomy

### Outer Shadow (ceramic-card)
```
              Light Source
                   ↓
           ╭───────────╮
          ╱  ☀️       ╱│  ← Highlight (top-left)
         ╱___________╱ │
        │           │  │
        │  ELEMENT  │  │
        │___________│  │
        │               │
         ╲_____________╱
                 ↓
            Shadow (bottom-right)
```

### Inset Shadow (ceramic-concave)
```
        ┌─────────────┐
       ╱               ╲
      │  Shadow      Light│  ← Reversed!
      │    ↓            ↓  │
      │  ┌─────────────┐  │
      │  │   PRESSED   │  │
      │  └─────────────┘  │
       ╲               ╱
        └─────────────┘
```

## States & Transitions

### Tab Lifecycle
```
1. INACTIVE (ceramic-card)
   ╭────╮
   │Tab │  ← Floats above
   ╰────╯

2. HOVER (ceramic-card + scale)
   ╭────╮
   │Tab │  ← Lifts higher
   ╰────╯
     ↑ (y: -2px, scale: 1.02)

3. CLICK → ACTIVE (ceramic-concave)
   ┌────┐
   │Tab │  ← Sinks into surface
   └────┘

4. REMAINS ACTIVE
   ┌────┐
   │Tab │  ← Stays pressed
   └────┘
```

## Color Temperature

The ceramic system uses warm/cool color shifts:

```
INACTIVE (Cool)          ACTIVE (Warm)
   #E8EBE9     →            #F5E6D3

   ╭────╮                   ┌────┐
   │Tab │       Click       │Tab │
   ╰────╯        →          └────┘
   Cool tone              Warm tone
   Elevated               Pressed
```

## Real-World Examples

### Example 1: HeaderGlobal Tabs
```
┌───────────────────────────────────┐
│  ┌─────────┐  ╭─────────╮        │
│  │ PESSOAL │  │ CONEXÕES│        │
│  └─────────┘  ╰─────────╯        │
└───────────────────────────────────┘
     Active      Inactive
   (pressed)    (elevated)
```

### Example 2: Admin Dashboard Tabs
```
┌──────────────────────────────────────────────────┐
│ ceramic-tray                                    │
│  ┌─────┐ ╭─────╮ ╭─────╮ ╭─────╮ ╭──────╮    │
│  │OVER │ │CACHE│ │COSTS│ │FILES│ │HEALTH│    │
│  └─────┘ ╰─────╯ ╰─────╯ ╰─────╯ ╰──────╯    │
└──────────────────────────────────────────────────┘
   Pressed  Float   Float   Float   Float
```

## Depth Levels

### Spatial Hierarchy
```
Level 3: Modal / Dialog
         ┌─────────┐
         │  Modal  │  (z-index: 30)
         └─────────┘
              ↓
Level 2: Detail View
         ┌─────────┐
         │ Details │  (z-index: 20)
         └─────────┘
              ↓
Level 1: Card / Panel
         ╭─────────╮
         │  Card   │  (z-index: 10)
         ╰─────────╯
              ↓
Level 0: Dashboard / Base
    ═══════════════════  (z-index: 0)
```

## Animation Curves

### Spring Physics Visualization
```
ceramic-card hover:
  ╭─╮
 ╱   ╲    Bouncy, tactile
│     │───────────────
 ╲   ╱    stiffness: 400
  ╰─╯     damping: 28

ceramic-concave press:
 ╭╮
╱  ╲       Quick, immediate
│   │──────────────────
 ╲ ╱       stiffness: 450
  ╰        damping: 30
```

## Common Patterns

### Pattern 1: Navigation Tabs
```tsx
ceramic-tray (container)
  ├── ceramic-card (inactive tab 1)
  ├── ceramic-concave (active tab 2) ← PRESSED
  └── ceramic-card (inactive tab 3)
```

### Pattern 2: Input Field
```tsx
ceramic-card (label)
ceramic-inset (input field) ← User types HERE
```

### Pattern 3: Card Stack
```tsx
Level 2: ceramic-card (y: -4, selected)
Level 1: ceramic-card (y: 0, normal)
Level 0: ceramic-base (background)
```

## Anti-Patterns

### ❌ Don't Mix Styles
```tsx
// WRONG
<div className="border-b-2 border-blue-500"> // Flat
  <button className="ceramic-card">        // Ceramic
```

### ❌ Don't Use Both Elevations
```tsx
// WRONG
<button className="ceramic-card ceramic-concave">
// Pick ONE: either elevated or pressed
```

### ✅ Do Be Consistent
```tsx
// CORRECT
<div className="ceramic-tray">           // Ceramic
  <button className="ceramic-card">      // Ceramic
  <button className="ceramic-concave">   // Ceramic
</div>
```

## Quick Reference Card

| Want to... | Use Class | Visual |
|-----------|-----------|--------|
| Elevate element | `ceramic-card` | ╭──╮ |
| Press element | `ceramic-concave` | ┌──┐ |
| Create container | `ceramic-tray` | ⌈  ⌉ |
| Deep inset | `ceramic-inset` | ⌊  ⌋ |

## Developer Checklist

When implementing tabs:
- [ ] Container uses `ceramic-tray`
- [ ] Inactive tabs use `ceramic-card`
- [ ] Active tabs use `ceramic-concave`
- [ ] Gap between tabs is `gap-1`
- [ ] Container has `p-1` padding
- [ ] Tabs have `rounded-lg` or `rounded-full`
- [ ] Text uses `ceramic-text-primary` (active) / `ceramic-text-secondary` (inactive)
- [ ] Transitions use `transition-all`

---

**Remember:** The ceramic system is about creating a tactile, physical feeling in a digital interface. Users should FEEL the depth and weight of elements, not just see them.
