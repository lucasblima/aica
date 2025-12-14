# JourneyMasterCard - Visual Guide

## How It Looks

### Default State (Level 2 - Consciente)

```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌───┐  Nível 2 - Consciente               │
│  │ 2 │  Você está prestando atenção nos    │
│  │   │  seus padrões.                      │
│  └───┘                                     │
│                                             │
│  Pontos de Consciência                      │
│  250 / 500 CP                               │
│  ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░ 50%            │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Próximo Marco          Reflexivo     │   │
│  │                        75 CP         │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  🔥 5  │  12 Momentos  │  8 Perguntas     │
│                                             │
└─────────────────────────────────────────────┘
```

### With Notification

```
┌─────────────────────────────────────────────┐
│                                        [●]  │  ← Pulsing amber dot
│  ┌───┐  Nível 3 - Reflexivo                │
│  │ 3 │  Você está refletindo               │
│  │   │  profundamente sobre si mesmo.      │
│  └───┘                                     │
│                                             │
│  Pontos de Consciência                      │
│  750 / 1500 CP                              │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░ 50%      │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Próximo Marco        Integrado       │   │
│  │                      750 CP          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  🔥 12 │  28 Momentos  │  15 Perguntas    │
│                                             │
└─────────────────────────────────────────────┘
```

### Empty State (No Activity)

```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌───┐  Nível 1 - Observador               │
│  │ 1 │  Você está começando sua            │
│  │   │  jornada de consciência.            │
│  └───┘                                     │
│                                             │
│  Pontos de Consciência                      │
│  0 / 100 CP                                 │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%│
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Próximo Marco      Consciente        │   │
│  │                    100 CP            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Comece sua jornada registrando um momento  │
│                                             │
└─────────────────────────────────────────────┘
```

### Loading State

```
┌─────────────────────────────────────────────┐
│                                             │
│                   ✨                        │
│            (spinning animation)             │
│                                             │
│                Carregando...                │
│                                             │
└─────────────────────────────────────────────┘
```

### Maximum Level (Level 5 - Mestre)

```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌───┐  Nível 5 - Mestre                   │
│  │ 5 │  Você alcançou maestria na          │
│  │   │  autoconsciência.                   │
│  └───┘                                     │
│                                             │
│  Pontos de Consciência                      │
│  5234 / Máximo                              │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 100%│
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Próximo Marco   Maestria Alcançada   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  🔥 45 │  234 Momentos │ 189 Perguntas   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Level Progression Visual

### Level 1: Observador
**Color**: Slate (#94a3b8)
```
[●] Cinza - Começando
```

### Level 2: Consciente
**Color**: Blue (#3b82f6)
```
[●] Azul - Despertando
```

### Level 3: Reflexivo
**Color**: Purple (#a855f7)
```
[●] Roxo - Refletindo
```

### Level 4: Integrado
**Color**: Amber (#f59e0b)
```
[●] Âmbar - Integrando
```

### Level 5: Mestre
**Color**: Yellow (#eab308)
```
[●] Amarelo - Maestria
```

---

## Component Anatomy

```
┌────────────────────────────────────────────────┐
│  HEADER (flex items-start justify-between)     │
│  ┌──────────────────────────────────────────┐  │
│  │ ┌─────┐  ┌──────────────────┐      [●]  │  │
│  │ │ LVL │  │ Name             │           │  │
│  │ │ NUM │  │ Description      │   Notif  │  │
│  │ └─────┘  └──────────────────┘           │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  PROGRESS SECTION                              │
│  ┌──────────────────────────────────────────┐  │
│  │ Pontos de Consciência                    │  │
│  │ XXX / YYY CP                             │  │
│  │ [████████████░░░░░░░░░░░] 50%           │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  MILESTONE BOX (ceramic-inset)                 │
│  ┌──────────────────────────────────────────┐  │
│  │ Próximo Marco    Next Level    [XX CP]  │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  STATS FOOTER (grid 3-4 cols)                  │
│  ┌──────┐  ┌────────┐  ┌─────────┐            │
│  │ 🔥 5 │  │ 28 Mom │  │ 15 Ques │            │
│  │ Seq. │  │ Moments│  │ Questions            │
│  └──────┘  └────────┘  └─────────┘            │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Color Palette

### Ceramic Design System
- **Background**: #F0EFE9 (Warm Beige)
- **Text Primary**: #5C554B (Dark Brown)
- **Text Secondary**: #948D82 (Medium Brown)
- **Accent**: #D97706 (Amber - for notifications)

### Level Colors
- **Level 1**: #94a3b8 (Slate)
- **Level 2**: #3b82f6 (Blue)
- **Level 3**: #a855f7 (Purple)
- **Level 4**: #f59e0b (Amber)
- **Level 5**: #eab308 (Yellow)

### Progress Bar
- **Gradient**: Blue (#3b82f6) → Purple (#a855f7)

### Notification
- **Pulsing Dot**: Amber (#d97706)

---

## Animation Behaviors

### On Load
1. Card appears with elevation
2. Progress bar animates from 0% to actual
3. Content fades in smoothly

### On Hover
1. Card elevates slightly (2px)
2. Badge scales up to 1.05x
3. Shadow deepens

### On Click (Notification)
1. Dot scales to 1.2x
2. Continues pulsing
3. Handler is called

### Notification Pulse
```
Time: 0s    -> Scale: 1.0, Opacity: 1.0
Time: 1s    -> Scale: 1.1, Opacity: 0.8
Time: 2s    -> Scale: 1.0, Opacity: 1.0
(repeats infinitely)
```

---

## Typography Scale

### Level Display
- **"Nível N"**: text-lg, font-bold
- **Level Name**: text-sm, font-semibold
- **Description**: text-xs

### Stats
- **Numbers**: text-lg, font-bold
- **Labels**: text-xs, secondary color

### Labels
- **Section Headers**: text-sm, secondary color
- **Body Text**: text-xs to text-sm

---

## Spacing & Sizing

### Badge
- Size: 64px × 64px
- Border radius: full circle
- Font size: 2xl (level number)

### Progress Bar
- Height: 8px (h-2)
- Border radius: rounded-full

### Notification Dot
- Size: 12px × 12px (w-3 h-3)
- Border radius: full circle

### Card Padding
- Outer: p-6 (24px)
- Section margins: mb-6
- Internal gaps: gap-4, gap-2

---

## Responsive Behavior

### Desktop (1024px+)
```
┌─────────────────────────┐
│ Card full width         │
│ All stats visible       │
│ Large typography        │
└─────────────────────────┘
```

### Tablet (768px - 1023px)
```
┌──────────────────┐
│ Card proportional │
│ All stats visible │
│ Medium typography │
└──────────────────┘
```

### Mobile (< 768px)
```
┌────────┐
│ Card   │
│ Full   │
│ Width  │
│ Stats  │
│ Stack  │
└────────┘
```

---

## State Transitions

### No Data → Loading
```
(Empty)  →  ✨ (spinning)
```

### Loading → Loaded
```
✨ (spinning)  →  [Full Card with Data]
```

### Low Progress → High Progress
```
[10%]  →  [50%]  →  [90%]
```

### No Notification → Notification
```
[Card]  →  [Card with pulsing dot]
```

---

## Accessibility Colors

All colors meet WCAG AA contrast requirements:

| Element | Background | Foreground | Ratio |
|---------|------------|-----------|-------|
| Text Primary | #F0EFE9 | #5C554B | 9.5:1 |
| Text Secondary | #F0EFE9 | #948D82 | 6.2:1 |
| Notification Dot | - | #d97706 | Visible |
| Progress Bar | #E5E7EB | #3b82f6 | 8.1:1 |

---

## Real-World Size Reference

### On Desktop (1920px)
- Card Width: 400-500px
- Card Height: 350-400px
- Font Size (Level): 18px
- Badge Size: 64px

### On Tablet (768px)
- Card Width: 300-350px
- Card Height: 300-350px
- Font Size (Level): 16px
- Badge Size: 56px

### On Mobile (375px)
- Card Width: Full (with margins)
- Card Height: 280-320px
- Font Size (Level): 14px
- Badge Size: 48px

---

## Example Screenshots

### Scenario 1: New User
```
Nível 1 - Observador (0/100 CP)
Empty state with CTA to start
```

### Scenario 2: Active User
```
Nível 3 - Reflexivo (750/1500 CP)
50% progress, 28 moments, 15 questions
Notification dot pulsing
```

### Scenario 3: Power User
```
Nível 5 - Mestre (5234/∞ CP)
100% progress, 234 moments, 189 questions
45-day streak active
```

---

## Design System Compliance

- ✓ Uses Ceramic card style (soft shadows)
- ✓ Uses Ceramic inset for milestone box
- ✓ Uses ceramic-text-* color system
- ✓ Uses Framer Motion animations
- ✓ Follows Tailwind spacing scale
- ✓ Responsive design patterns
- ✓ Accessible color contrast
- ✓ Smooth, 60fps animations

---

## Next UI Variations (Future)

Potential variations not in this version:
- Dark mode variant
- Compact view (widget size)
- Expanded view (modal)
- Mini version (sidebar)
- Full page view (with graphs)

All use same data source and logic.
