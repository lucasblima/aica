# MicrophoneFAB Visual States Reference

This document provides a visual reference for all states of the MicrophoneFAB component.

## State Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    MicrophoneFAB States                     │
└─────────────────────────────────────────────────────────────┘

       ┌──────────────┐
       │   INACTIVE   │ ◄─── Default State
       │              │
       │  ◯ Ceramic   │      • Background: #F0EFE9
       │  🎤 Lead     │      • Shadow: ceramic-concave
       │              │      • Icon: #5C554B
       └──────┬───────┘
              │
              │ onPress()
              ▼
       ┌──────────────┐
       │   ACTIVE     │
       │ (Recording)  │
       │              │      • Background: #F0EFE9
       │  ◯ Ceramic   │      • Shadow: concave + amber glow
       │  🎤 Amber    │      • Icon: #D97706
       │  ✨ Pulse    │      • Animation: 2s infinite pulse
       └──────┬───────┘
              │
              │ onPress()
              │
              └────────────► Back to INACTIVE


       ┌──────────────┐
       │   DISABLED   │ ◄─── disabled={true}
       │              │
       │  ◯ Ceramic   │      • Opacity: 50%
       │  🎤 Lead     │      • Cursor: not-allowed
       │  (Dimmed)    │      • No interactions
       └──────────────┘


       ┌──────────────┐
       │    HOVER     │ ◄─── Mouse over (when inactive)
       │  (Inactive)  │
       │              │      • ceramic-elevated
       │  ◯ Elevated  │      • Icon: slightly darker
       │  🎤 Darker   │      • Transform: translateY(-2px)
       └──────────────┘
```

## State Details

### 1. INACTIVE (Default)

**Visual Appearance:**
```
    ╔═══════════════════════╗
    ║                       ║
    ║                       ║
    ║         🎤            ║  ← Lead color (#5C554B)
    ║                       ║
    ║                       ║
    ╚═══════════════════════╝

    Background: #F0EFE9 (Ceramic Cream)
    Shadow: Deep concave inset
```

**CSS Shadow:**
```css
box-shadow:
  inset 6px 6px 12px rgba(163, 158, 145, 0.30),
  inset -6px -6px 12px rgba(255, 255, 255, 1.0);
```

**Trigger Conditions:**
- Component mounted
- Recording stopped
- Not disabled

---

### 2. ACTIVE (Recording)

**Visual Appearance:**
```
    ╔═══════════════════════╗
    ║    ✨  ~~ ✨  ~~     ║  ← Amber glow (pulsing)
    ║  ~~         ~~        ║
    ║    ✨  🎤  ✨        ║  ← Amber icon (#D97706)
    ║  ~~         ~~        ║
    ║    ✨  ~~ ✨  ~~     ║
    ╚═══════════════════════╝

    Background: #F0EFE9 (Ceramic Cream)
    Shadow: Concave + Amber Glow (pulsing)
```

**CSS Shadow (Animated):**
```css
/* Keyframe 1 (0%, 100%) */
box-shadow:
  inset 6px 6px 12px rgba(163, 158, 145, 0.30),
  inset -6px -6px 12px rgba(255, 255, 255, 1.0),
  0 0 20px rgba(217, 119, 6, 0.4);

/* Keyframe 2 (50%) */
box-shadow:
  inset 6px 6px 12px rgba(163, 158, 145, 0.30),
  inset -6px -6px 12px rgba(255, 255, 255, 1.0),
  0 0 30px rgba(217, 119, 6, 0.6);  /* ← Brighter glow */
```

**Animation Timeline:**
```
0s    ──────→  1s    ──────→  2s (loop)
Glow: 20px     Glow: 30px     Glow: 20px
Icon: 1.0x     Icon: 1.1x     Icon: 1.0x
```

**Trigger Conditions:**
- `isRecording={true}`
- User actively recording voice

---

### 3. HOVER (Over Inactive)

**Visual Appearance:**
```
    ╔═══════════════════════╗
    ║                       ║
    ║         🎤            ║  ← Darker shade (#4A463F)
    ║                       ║
    ║                       ║  ← Slightly elevated (transform)
    ╚═══════════════════════╝

    Background: #F0EFE9 (Ceramic Cream)
    Shadow: ceramic-elevated (raised)
```

**CSS Shadow:**
```css
box-shadow:
  6px 6px 12px rgba(163, 158, 145, 0.35),
  -6px -6px 12px rgba(255, 255, 255, 1.0);
transform: translateY(-2px);
```

**Trigger Conditions:**
- Mouse over component
- Component is inactive (not recording)
- Not disabled

---

### 4. DISABLED

**Visual Appearance:**
```
    ╔═══════════════════════╗
    ║                       ║
    ║         🎤            ║  ← Dimmed (50% opacity)
    ║       (greyed)        ║
    ║                       ║
    ╚═══════════════════════╝

    Background: #F0EFE9 (Ceramic Cream)
    Shadow: ceramic-concave (same as inactive)
    Opacity: 0.5
```

**CSS Override:**
```css
opacity: 0.5;
cursor: not-allowed;
pointer-events: auto; /* Still shows cursor change */
```

**Trigger Conditions:**
- `disabled={true}`
- No user permissions
- System unavailable

---

### 5. PRESSED (Tap Feedback)

**Visual Appearance:**
```
    ╔═══════════════════════╗
    ║                       ║
    ║         🎤            ║  ← Scale: 0.95 (slightly smaller)
    ║      (pressed)        ║
    ║                       ║
    ╚═══════════════════════╝

    Background: #F0EFE9 (Ceramic Cream)
    Shadow: Same as current state
    Transform: scale(0.95)
```

**Framer Motion:**
```typescript
whileTap={{ scale: 0.95 }}
```

**Trigger Conditions:**
- Mouse down or touch start
- Not disabled
- Duration: instant on press, spring back on release

---

## State Transitions

### Inactive → Active
```
Duration: 0.2s
Easing: ease-in-out

Changes:
- Icon color: #5C554B → #D97706
- Shadow: Add amber glow
- Start pulsing animation
```

### Active → Inactive
```
Duration: 0.2s
Easing: ease-in-out

Changes:
- Icon color: #D97706 → #5C554B
- Shadow: Remove amber glow
- Stop pulsing animation
```

### Inactive → Hover
```
Duration: 0.2s
Easing: ease-in-out

Changes:
- Shadow: ceramic-concave → ceramic-elevated
- Transform: translateY(0) → translateY(-2px)
- Icon: Slightly darker
```

### Any → Disabled
```
Duration: 0.2s
Easing: ease-in-out

Changes:
- Opacity: 1.0 → 0.5
- Cursor: pointer → not-allowed
- All animations stop
```

## Color Reference

| State | Background | Icon | Glow |
|-------|------------|------|------|
| Inactive | `#F0EFE9` | `#5C554B` | None |
| Active | `#F0EFE9` | `#D97706` | `rgba(217, 119, 6, 0.4-0.6)` |
| Hover | `#F0EFE9` | `#4A463F` | None |
| Disabled | `#F0EFE9` (50% opacity) | `#5C554B` (50% opacity) | None |

## Animation Parameters

| Animation | Duration | Easing | Repeat |
|-----------|----------|--------|--------|
| Pulse Glow | 2s | ease-in-out | Infinite |
| Icon Scale | 2s | ease-in-out | Infinite |
| State Transition | 0.2s | ease-in-out | Once |
| Tap Feedback | ~0.1s | Spring | Once |

## Accessibility States

| Visual State | ARIA State | aria-label |
|--------------|------------|------------|
| Inactive | `aria-pressed="false"` | "Start recording" |
| Active | `aria-pressed="true"` | "Stop recording" |
| Disabled | `aria-disabled="true"` | "Start recording" |
| Hover | No change | Inherits |

## Testing Checklist

- [ ] Inactive state renders correctly
- [ ] Active state shows amber glow
- [ ] Active state pulse animation runs smoothly
- [ ] Icon color changes between states
- [ ] Hover effect works (desktop only)
- [ ] Tap feedback (scale down) works
- [ ] Disabled state prevents interaction
- [ ] Transitions between states are smooth (0.2s)
- [ ] ARIA labels update correctly
- [ ] Keyboard accessible (space/enter to activate)
- [ ] Screen reader announces state changes
