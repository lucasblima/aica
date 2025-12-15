# Workstream C: Visual Guide
## Visual Hierarchy of Movement - Before & After

---

## 🎯 The Directive

> **"Navigation elements lack tactile differentiation. Use spatial depth, not breadcrumbs."**

This visual guide shows the transformation from flat, breadcrumb-based navigation to tactile, spatial depth navigation.

---

## 1. Tab Navigation Transformation

### ❌ BEFORE: Flat Tabs with Border

```
┌─────────────────────────────────────────────────────┐
│  Home > Podcast > Episode 1                         │ ← Breadcrumbs (visual clutter)
├─────────────────────────────────────────────────────┤
│  [Dashboard]  Settings  Analytics                   │ ← Flat, no tactile feedback
└─────────────────────────────────────────────────────┘
```

**Problems:**
- Breadcrumbs create visual noise
- No tactile differentiation
- Flat design lacks depth
- No "pressed" feeling

---

### ✅ AFTER: Tactile Ceramic Tabs

```
┌─────────────────────────────────────────────────────┐
│  Ventures                                           │ ← Title only (no breadcrumbs)
│                                                     │
│  ╔═══════════════════════════════════════╗         │
│  ║ ⌄ Dashboard  ⌃ Entidades             ║         │ ← Tactile tabs
│  ╚═══════════════════════════════════════╝         │
└─────────────────────────────────────────────────────┘

Legend:
⌄ = ceramic-concave (pressed/inset) = ACTIVE
⌃ = ceramic-card (elevated/raised) = INACTIVE
```

**Improvements:**
- ✅ No breadcrumb clutter
- ✅ Active tab feels "pressed" (concave)
- ✅ Inactive tabs feel "elevated" (convex)
- ✅ Clear tactile differentiation

---

## 2. Spatial Depth Layers

### Mental Model: Physical Floors

```
┌─────────────────────────────────────────────────────┐
│                  DEPTH 2                            │
│              (Detail View)                          │
│           ┌──────────────────┐                      │
│           │  Property Detail │                      │
│           │  Scale: 1.02     │                      │
│           │  z-index: 20     │                      │
│           └──────────────────┘                      │
│                    ↑                                │
│              [Back Button]                          │
│                    ↓                                │
├─────────────────────────────────────────────────────┤
│                  DEPTH 1                            │
│                (Card View)                          │
│       ┌────────────────────────────┐                │
│       │  Habitat Space Dashboard  │                │
│       │  Scale: 1.0                │                │
│       │  z-index: 10               │                │
│       └────────────────────────────┘                │
│                    ↑                                │
│              [Back Button]                          │
│                    ↓                                │
├─────────────────────────────────────────────────────┤
│                  DEPTH 0                            │
│            (Base Dashboard)                         │
│  ┌──────────────────────────────────────┐           │
│  │  Connections Dashboard               │           │
│  │  Scale: 1.0                          │           │
│  │  z-index: 0                          │           │
│  └──────────────────────────────────────┘           │
└─────────────────────────────────────────────────────┘
```

**Navigation:**
- Open card → Move UP one layer (depth increases)
- Close card → Move DOWN one layer (depth decreases)
- Visual feedback: scale and z-index change
- No breadcrumbs needed - position is spatial

---

## 3. Ceramic Design States

### Visual Representation

```
┌─────────────────────────────────────────────────────┐
│  CERAMIC-CARD (Elevated - Inactive)                │
│                                                     │
│     ╔═══════════════════════════╗                  │
│    ╔═══════════════════════════╗ ║                 │
│   ╔═══════════════════════════╗ ║║                 │
│  ║         INACTIVE TAB       ║║║                  │
│  ╚═══════════════════════════╝ ║                   │
│   ╚═══════════════════════════╝                    │
│                                                     │
│  Shadow: 6px outset (raised)                       │
│  Feel: Elevated, ready to press                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  CERAMIC-CONCAVE (Pressed - Active)                │
│                                                     │
│  ╔═════════════════════════════════╗                │
│  ║                                 ║                │
│  ║    ╔═══════════════════════╗    ║                │
│  ║   ╔═══════════════════════╗║    ║                │
│  ║  ║    ACTIVE TAB         ║║    ║                │
│  ║   ╚═══════════════════════╝     ║                │
│  ║    ╚═══════════════════════╝    ║                │
│  ╚═════════════════════════════════╝                │
│                                                     │
│  Shadow: 6px inset (pressed)                       │
│  Feel: Pressed, currently active                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  CERAMIC-TRAY (Container)                          │
│                                                     │
│  ╔═════════════════════════════════════════════╗    │
│  ║                                             ║    │
│  ║  ┌──────────┐  ┌──────────┐  ┌──────────┐  ║    │
│  ║  │ Tab 1    │  │ Tab 2    │  │ Tab 3    │  ║    │
│  ║  └──────────┘  └──────────┘  └──────────┘  ║    │
│  ║                                             ║    │
│  ╚═════════════════════════════════════════════╝    │
│                                                     │
│  Shadow: 4px inset (recessed background)           │
│  Purpose: Container for tab groups                 │
└─────────────────────────────────────────────────────┘
```

---

## 4. Studio Mode: Reductive Design

### Preparation Mode (isStudioMode=false)

```
┌─────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════╗          │
│  ║  ← Episode 1  •  Recording            ║ ← Header │
│  ╚═══════════════════════════════════════╝          │
│                                                     │
│  ┌─────────────────────────────────────────┐        │
│  │  Guest Information                      │        │
│  │  ─────────────────────────────────────  │        │
│  │  Name: [Input]                          │        │
│  │  Theme: [Input]                         │        │
│  │  Schedule: [Date/Time]                  │        │
│  │                                         │        │
│  │  [Generate Pauta]                       │        │
│  └─────────────────────────────────────────┘        │
│                                                     │
│  ┌─────────────────────────────────────────┐        │
│  │  Scheduled Interviews                   │        │
│  │  ─────────────────────────────────────  │        │
│  │  • Eduardo Paes - 15/12 10:00           │        │
│  │  • Sam Altman - 16/12 14:00             │        │
│  └─────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

---

### Studio Mode (isStudioMode=true)

```
┌─────────────────────────────────────────────────────┐
│  [←]                                                │ ← Minimal exit button only
│                                                     │
│                                                     │
│  ┌───────────┐  ┌─────────────────┐  ┌───────────┐ │
│  │  Topics   │  │   Biography     │  │   Live    │ │
│  │           │  │                 │  │  Console  │ │
│  │  • Intro  │  │  Guest: Sam     │  │           │ │
│  │  • Topic1 │  │  Theme: AI      │  │ ● REC     │ │
│  │  • Topic2 │  │  ...            │  │  00:15    │ │
│  └───────────┘  └─────────────────┘  └───────────┘ │
│                                                     │
│                                                     │
│         ══════════════════════════                  │ ← Audio console
│         │ ●  00:15:32  ⏸  ■  │                     │
│         ══════════════════════════                  │
└─────────────────────────────────────────────────────┘
```

**Changes:**
- ❌ Header **vanishes**
- ❌ All contextual UI **vanishes**
- ✅ Only essential controls remain
- ✅ Minimal exit button in top-left
- ✅ Feels like "entering a room"

---

## 5. Complete Tab Pattern Example

### VenturesHome.tsx

```tsx
// OLD PATTERN (Flat)
<div className="flex gap-2 border-b border-gray-200 pb-2">
  <button className="bg-blue-100 px-4 py-2 rounded-lg">
    Dashboard
  </button>
  <button className="hover:bg-gray-100 px-4 py-2 rounded-lg">
    Entidades
  </button>
</div>

// NEW PATTERN (Tactile)
<div className="ceramic-tray flex gap-1.5 p-1.5 rounded-full inline-flex">
  <motion.button
    className="ceramic-concave text-ceramic-text-primary rounded-full px-5 py-2.5 font-bold text-sm"
    aria-selected="true"
  >
    <LayoutDashboard className="w-4 h-4" />
    <span className="uppercase tracking-wide text-xs">Dashboard</span>
  </motion.button>

  <motion.button
    className="ceramic-card text-ceramic-text-secondary hover:text-ceramic-text-primary rounded-full px-5 py-2.5 font-bold text-sm"
    aria-selected="false"
  >
    <Briefcase className="w-4 h-4" />
    <span className="uppercase tracking-wide text-xs">Entidades</span>
  </motion.button>
</div>
```

**Visual Difference:**

```
OLD (Flat):
┌──────────────────────────────────┐
│ [Dashboard] Settings Analytics   │ ← All same elevation
└──────────────────────────────────┘

NEW (Tactile):
┌──────────────────────────────────┐
│ ╔═══════╗ ═══════ ═══════        │ ← Active is pressed
│ ║Dashbrd║ Settings Analytics     │ ← Others are raised
│ ╚═══════╝                        │
└──────────────────────────────────┘
```

---

## 6. Shadow Physics Comparison

### CSS Implementation

```css
/* INACTIVE (Elevated) */
.ceramic-card {
  box-shadow:
    6px 6px 12px rgba(163, 158, 145, 0.20),    /* Bottom-right shadow */
    -6px -6px 12px rgba(255, 255, 255, 0.90);  /* Top-left highlight */
  /* Result: Looks RAISED above surface */
}

/* ACTIVE (Pressed) */
.ceramic-concave {
  box-shadow:
    inset 6px 6px 12px rgba(163, 158, 145, 0.30),    /* Inner shadow */
    inset -6px -6px 12px rgba(255, 255, 255, 1.0);   /* Inner highlight */
  /* Result: Looks PRESSED into surface */
}
```

### Visual Cross-Section

```
CERAMIC-CARD (Elevated):
     Surface Level
─────────────────────────────────
          ╔═══════╗
         ║ RAISED ║
        ╚═══════╝
    Shadow ↓

CERAMIC-CONCAVE (Pressed):
     Surface Level
─────────────────────────────────
    ╔═══════════╗
    ║  PRESSED  ║
    ║   INTO    ║
    ╚═══════════╝
```

---

## 7. Navigation Flow Example

### User Journey Through Spatial Layers

```
Step 1: Base Dashboard (Depth 0)
┌─────────────────────────────────────┐
│  Minhas Conexões                    │
│  ┌──────┐ ┌──────┐ ┌──────┐         │
│  │ Hab  │ │ Vent │ │ Acad │         │
│  └──────┘ └──────┘ └──────┘         │
└─────────────────────────────────────┘

         ↓ [Click Habitat card]

Step 2: Space View (Depth 1)
┌─────────────────────────────────────┐
│  ← Habitat Dashboard                │ ← Back button
│  ┌─────────────────────────┐        │
│  │  Meu Apartamento        │        │
│  │  Sq Ft: 800             │        │
│  │  [View Details]         │        │
│  └─────────────────────────┘        │
└─────────────────────────────────────┘

         ↓ [Click View Details]

Step 3: Detail View (Depth 2)
┌─────────────────────────────────────┐
│  ← Property Detail                  │ ← Back button
│  ┌─────────────────────────┐        │
│  │  Address: 123 Main St   │        │
│  │  Owner: John Doe        │        │
│  │  Maintenance History:   │        │
│  │  • AC repair (2024-01)  │        │
│  │  • Paint (2023-12)      │        │
│  └─────────────────────────┘        │
└─────────────────────────────────────┘

         ↓ [Click Back]

Returns to Step 2 (Depth 1)
         ↓ [Click Back]

Returns to Step 1 (Depth 0)
```

**Mental Model:**
- Each click = "stepping UP into" a new layer
- Each back = "stepping DOWN to" previous layer
- No breadcrumbs needed - position is spatial
- Visual scale increases slightly with depth

---

## 8. Accessibility Considerations

### ARIA Attributes

```tsx
// Proper tab markup
<button
  className="ceramic-concave"
  role="tab"
  aria-selected="true"      // ← Screen reader knows it's active
  aria-controls="panel-1"   // ← Links to content panel
>
  Dashboard
</button>

// Back button
<button
  className="ceramic-concave"
  aria-label="Voltar para camada anterior"  // ← Clear description
  title="Voltar"
>
  <ArrowLeft />
</button>
```

---

## 9. Color & Shadow Palette

```
Ceramic Base:      #F0EFE9  (warm beige)
Text Primary:      #5C554B  (warm brown)
Text Secondary:    #948D82  (lighter brown)

Shadow Taupe:      rgba(163, 158, 145, 0.35)
Shadow White:      rgba(255, 255, 255, 1.0)
Accent (Warning):  rgba(217, 119, 6, 0.4)
```

---

## 10. Summary: Key Visual Changes

| Aspect | Before | After |
|--------|--------|-------|
| **Navigation** | Breadcrumbs | Spatial depth layers |
| **Tabs** | Flat with border | Tactile ceramic states |
| **Active State** | Color change | Pressed/inset (concave) |
| **Inactive State** | No feedback | Elevated/raised (card) |
| **Mental Model** | Hierarchical list | Physical floors |
| **Studio Mode** | All UI visible | Reductive (everything vanishes) |
| **Transitions** | Instant | Smooth spatial animations |
| **Feedback** | Visual only | Tactile + spatial |

---

## ✅ Implementation Checklist

When implementing these patterns:

- [ ] Remove all `<Breadcrumbs />` components
- [ ] Replace flat tabs with `ceramic-tray` containers
- [ ] Active tabs: `ceramic-concave`
- [ ] Inactive tabs: `ceramic-card`
- [ ] Add `depth` prop to layouts
- [ ] Implement back button with `ceramic-concave`
- [ ] Add smooth transitions with scale
- [ ] Include `aria-selected` on tabs
- [ ] Test keyboard navigation
- [ ] Verify tactile feel (press/raise)

---

**Visual Philosophy:**
Every navigation element should have **physical presence**. Users should **feel** the difference between active and inactive states, not just see it. Spatial depth replaces abstract hierarchy with physical layers.

---

**Last Updated:** 2025-12-14
**Workstream:** C - Visual Hierarchy of Movement
