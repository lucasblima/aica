# Spatial Depth Navigation Pattern

**Workstream C: Visual Hierarchy of Movement**

## The Directive

> "Navigation elements lack tactile differentiation. Use spatial depth, not breadcrumbs."

This document outlines the spatial depth navigation pattern implemented across the Aica frontend, replacing breadcrumb trails with a physical, tactile navigation system based on layered depth.

---

## Core Principles

### 1. **No Breadcrumbs**
Breadcrumbs are **forbidden**. They create visual noise and do not provide tactile feedback. Instead, we use spatial depth to create a mental model of location.

### 2. **Tactile Active States**
Active navigation elements (tabs, buttons) must use `ceramic-concave` to create a "pressed" feeling. The user must **feel** they have pressed the destination.

- **Inactive tabs**: `ceramic-card` (elevated, raised)
- **Active tabs**: `ceramic-concave` (pressed, inset)

### 3. **Spatial Layers**
Navigation is organized in physical layers:
- **Depth 0**: Base dashboard layer
- **Depth 1**: Card layer (floats above dashboard)
- **Depth 2**: Detail layer (floats above card)

Closing a card returns the user to the layer below, creating a sense of "stepping back" through space.

### 4. **Reductive Transitions**
In focus modes (like Studio Mode), **everything else vanishes**. Only essential controls remain visible. This creates a sense of "stepping into a room" where distractions fade away.

---

## Implementation Guide

### Tab Navigation

#### ❌ Old Pattern (Breadcrumbs + Flat Tabs)
```tsx
// DON'T DO THIS
<Breadcrumbs items={[
  { label: 'Home', path: '/' },
  { label: 'Podcast', path: '/podcast' },
  { label: 'Episode 1', path: '/podcast/ep1' }
]} />

<div className="flex gap-2 border-b border-gray-200">
  <button className="px-4 py-2 bg-blue-100">Dashboard</button>
  <button className="px-4 py-2 hover:bg-gray-100">Settings</button>
</div>
```

#### ✅ New Pattern (Spatial Depth + Tactile Tabs)
```tsx
// DO THIS
<div className="ceramic-tray flex gap-1.5 p-1.5 rounded-full inline-flex">
  <motion.button
    className="ceramic-concave text-ceramic-text-primary rounded-full px-5 py-2.5 font-bold text-sm"
    aria-selected="true"
  >
    <span className="uppercase tracking-wide text-xs">Dashboard</span>
  </motion.button>

  <motion.button
    className="ceramic-card text-ceramic-text-secondary hover:text-ceramic-text-primary rounded-full px-5 py-2.5 font-bold text-sm"
    aria-selected="false"
  >
    <span className="uppercase tracking-wide text-xs">Settings</span>
  </motion.button>
</div>
```

**Key Differences:**
1. No breadcrumbs - spatial position is implied by visual depth
2. Active tab uses `ceramic-concave` (pressed/inset)
3. Inactive tabs use `ceramic-card` (elevated)
4. Container uses `ceramic-tray` for a recessed background
5. Uppercase labels with tracking for clarity

---

### Layout Components

Use `ConnectionsLayout` with the `depth` prop to create spatial layers:

```tsx
// Base dashboard (depth 0)
<ConnectionsLayout
  title="My Connections"
  depth={0}
>
  {/* Dashboard content */}
</ConnectionsLayout>

// Card view (depth 1) - floats above dashboard
<ConnectionsLayout
  title="Habitat Space"
  subtitle="Habitat"
  showBackButton
  depth={1}
>
  {/* Space detail content */}
</ConnectionsLayout>

// Detail view (depth 2) - floats above card
<ConnectionsLayout
  title="Property Detail"
  subtitle="Meu Apartamento"
  showBackButton
  depth={2}
>
  {/* Property detail content */}
</ConnectionsLayout>
```

**Visual Effect:**
- Each depth level has slightly different scale and z-index
- Transitions animate smoothly between layers
- Back button returns to previous depth
- No breadcrumbs needed - user knows where they are by visual position

---

### Studio Mode (Reductive Design)

For focus modes like podcast recording, use the `isStudioMode` prop:

```tsx
<StudioLayout
  title="Episode Recording"
  status="recording"
  onExit={handleExit}
  isStudioMode={true} // EVERYTHING else vanishes
>
  {/* Only essential recording controls */}
</StudioLayout>
```

**Behavior:**
- `isStudioMode=false`: Full header, navigation, context visible
- `isStudioMode=true`: Header vanishes, only minimal exit button remains
- Transition feels like "entering a room" - distractions fade away
- Smooth spatial animation (scale, opacity)

---

## Design System Classes

### Ceramic States

```css
/* Elevated (inactive state) */
.ceramic-card {
  box-shadow:
    6px 6px 12px rgba(163, 158, 145, 0.20),
    -6px -6px 12px rgba(255, 255, 255, 0.90);
}

/* Pressed (active state) */
.ceramic-concave {
  box-shadow:
    inset 6px 6px 12px rgba(163, 158, 145, 0.30),
    inset -6px -6px 12px rgba(255, 255, 255, 1.0);
}

/* Tray (container/background) */
.ceramic-tray {
  box-shadow:
    inset 4px 4px 8px rgba(163, 158, 145, 0.35),
    inset -4px -4px 8px rgba(255, 255, 255, 1.0);
}

/* Inset (subtle pressed) */
.ceramic-inset {
  box-shadow:
    inset 4px 4px 8px rgba(163, 158, 145, 0.35),
    inset -4px -4px 8px rgba(255, 255, 255, 1.0);
}
```

### When to Use Each

| State | Use Case | Example |
|-------|----------|---------|
| `ceramic-card` | Inactive tabs, elevated buttons | Dashboard tab (not selected) |
| `ceramic-concave` | Active tabs, pressed buttons | Dashboard tab (selected) |
| `ceramic-tray` | Container backgrounds, tab groups | Tab selector container |
| `ceramic-inset` | Subtle inputs, search bars | Text input fields |

---

## Migration Checklist

When converting a component to spatial depth navigation:

- [ ] **Remove breadcrumb imports and components**
  - Delete `<Breadcrumbs />` component usage
  - Remove `breadcrumbs` prop from layouts

- [ ] **Update tab navigation**
  - Replace `border-b` tabs with `ceramic-tray` container
  - Active tabs: `ceramic-concave`
  - Inactive tabs: `ceramic-card`
  - Add `aria-selected` attributes

- [ ] **Add depth prop to layouts**
  - Set `depth={0}` for base dashboards
  - Set `depth={1}` for card/space views
  - Set `depth={2}` for detail views

- [ ] **Update transitions**
  - Use `motion.div` with scale animations
  - Apply spatial easing: `ease: [0.4, 0, 0.2, 1]`

- [ ] **Test tactile feedback**
  - Active tabs should feel "pressed"
  - Inactive tabs should feel "elevated"
  - Back button returns to previous layer

---

## Examples

### Before and After

#### Before (Breadcrumbs)
```tsx
<ConnectionsLayout
  breadcrumbs={[
    { label: 'Conexões', path: '/connections' },
    { label: 'Habitat', path: '/connections/habitat' },
    { label: 'Meu Apartamento', path: '/connections/habitat/123' }
  ]}
  spaceName="Meu Apartamento"
>
  {/* Content */}
</ConnectionsLayout>
```

#### After (Spatial Depth)
```tsx
<ConnectionsLayout
  title="Meu Apartamento"
  subtitle="Habitat"
  showBackButton
  depth={1}
  onBackClick={() => navigate('/connections/habitat')}
>
  {/* Content */}
</ConnectionsLayout>
```

**Why Better:**
- No visual clutter from breadcrumb trail
- Spatial position creates mental model
- Back button provides clear exit
- Tactile feedback on navigation

---

## Files Modified

### Core Components
- `src/modules/connections/components/ConnectionsLayout.tsx`
  - Removed breadcrumbs
  - Added `depth` prop for spatial layers
  - Implemented spatial transitions

- `src/components/CeramicTabSelector.tsx`
  - Active tabs use `ceramic-concave`
  - Inactive tabs use `ceramic-card`
  - Removed sliding indicator (too playful)

### Module Updates
- `src/modules/connections/ventures/views/VenturesHome.tsx`
- `src/modules/connections/habitat/components/HabitatDashboard.tsx`
- `src/modules/podcast/components/StudioLayout.tsx`
  - Added `isStudioMode` for reductive design

---

## Design Philosophy

### Mental Model
Users navigate through **physical space**, not abstract hierarchy:
- **Dashboard**: Ground floor
- **Card**: First floor (elevated above dashboard)
- **Detail**: Second floor (elevated above card)

### Tactile Feedback
Every navigation action has **physical feedback**:
- Pressing a tab = `ceramic-concave` (pressed inset)
- Hovering a button = slight scale change
- Opening a card = spatial elevation animation
- Closing a card = return to layer below

### Reductive Clarity
In focus modes:
- **Everything else vanishes**
- Only essential controls remain
- Minimal cognitive load
- Feels like "entering a room"

---

## Testing Guidelines

1. **Tactile Differentiation**
   - [ ] Active tabs feel "pressed" (ceramic-concave)
   - [ ] Inactive tabs feel "elevated" (ceramic-card)

2. **Spatial Clarity**
   - [ ] User knows their position without breadcrumbs
   - [ ] Back button always returns to previous layer

3. **Smooth Transitions**
   - [ ] Animations use spatial easing
   - [ ] Scale changes feel natural
   - [ ] No jarring jumps

4. **Accessibility**
   - [ ] All tabs have `aria-selected` attributes
   - [ ] Back buttons have descriptive labels
   - [ ] Keyboard navigation works

---

## Future Enhancements

- [ ] Add subtle parallax effect between depth layers
- [ ] Implement gesture-based navigation (swipe to go back)
- [ ] Add spatial audio cues for navigation transitions
- [ ] Explore VR/AR spatial navigation concepts

---

**Last Updated:** 2025-12-14
**Workstream:** C - Visual Hierarchy of Movement
**Status:** ✅ Implemented
