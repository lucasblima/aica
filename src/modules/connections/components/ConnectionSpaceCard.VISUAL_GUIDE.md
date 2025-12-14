# ConnectionSpaceCard - Visual Design Guide

## Design Philosophy

Each archetype in the Aica Life OS has a distinct **visual personality** that reflects its core purpose and emotional resonance. The ConnectionSpaceCard component brings these personalities to life through carefully chosen colors, icons, and design treatments.

---

## Archetype Visual Identities

### 🏠 HABITAT - The Physical Anchor

**Essence**: Stability, groundedness, home

**Color Palette**:
```
Primary Accent:    #8B4513  (Saddle Brown)
Secondary Accent:  #D2691E  (Chocolate/Terracotta)
Background:        Orange-50 tint
Icons:             Orange-600
```

**Visual Treatment**:
- Heavy visual weight suggesting permanence
- Earthy, warm tones
- Dense shadows for "ceramic mass" feeling
- Icons: Home, Key, Wrench

**Design Cues**:
- Think: Solid oak furniture, terra cotta pottery, stone foundations
- Typography: Grounded, stable
- Spacing: Tighter, more compact (suggests substance)

**Use Cases**:
- Apartments and condos
- Shared living spaces
- Property management
- Household organization

**Emotional Resonance**: "This is where I belong. This is my foundation."

---

### 💼 VENTURES - The Creation Engine

**Essence**: Precision, metrics, strategic vision

**Color Palette**:
```
Primary Accent:    #1E3A8A  (Deep Blue)
Secondary Accent:  #3B82F6  (Bright Blue)
Background:        Blue-50 tint
Icons:             Blue-600
```

**Visual Treatment**:
- Dashboard-like precision
- Clean lines and sharp edges
- Technical typography
- Icons: TrendingUp, Target, Briefcase

**Design Cues**:
- Think: Braun instruments, Swiss watches, cockpit displays
- Typography: Tabular numerals, monospaced for metrics
- Spacing: Precise, grid-aligned (suggests order)
- Surgical amber accents for alerts

**Use Cases**:
- Startups and businesses
- Professional projects
- OKR tracking
- Runway management

**Emotional Resonance**: "I'm building something meaningful. Every metric matters."

---

### 🎓 ACADEMIA - The Mind Cultivation

**Essence**: Serenity, contemplation, intellectual growth

**Color Palette**:
```
Primary Accent:    #4C1D95  (Deep Purple)
Secondary Accent:  #8B5CF6  (Bright Purple/Indigo)
Background:        Purple-50 tint
Icons:             Purple-600
```

**Visual Treatment**:
- Generous white space (library atmosphere)
- Serene, contemplative feel
- Soft shadows (less aggressive than other archetypes)
- Icons: BookOpen, Brain, Lightbulb

**Design Cues**:
- Think: High-quality paper, library reading room, monastery
- Typography: Serif for headings, generous line-height
- Spacing: Expansive, breathing room (suggests reflection)
- Muted palette (avoids distraction)

**Use Cases**:
- Graduate programs
- Online courses
- Mentorships
- Research projects
- Study groups

**Emotional Resonance**: "I'm becoming wiser. Knowledge is my treasure."

---

### 👥 TRIBO - The Social Fabric

**Essence**: Warmth, belonging, human connection

**Color Palette**:
```
Primary Accent:    #D97706  (Amber)
Secondary Accent:  #F59E0B  (Bright Amber/Coral)
Background:        Amber-50 tint
Icons:             Amber-600
```

**Visual Treatment**:
- Warm, embracing aesthetic
- Rounded corners (more than other archetypes)
- Gentle shadows suggesting softness
- Icons: Heart, Users, Calendar

**Design Cues**:
- Think: Family photo album, handwritten invites, warm lighting
- Typography: Humanist, friendly
- Spacing: Balanced (neither too tight nor too sparse)
- Subtle glow effects for "warmth"

**Use Cases**:
- Family coordination
- Friend groups
- Community clubs
- Sports teams
- Faith communities

**Emotional Resonance**: "These are my people. We're in this together."

---

## Visual Hierarchy

### Default Variant Layout

```
┌─────────────────────────────────────────┐
│  ┌────┐                          ★      │  ← Favorite toggle
│  │ICON│  Space Name                     │  ← Header with archetype icon
│  │ 🏠 │  Subtitle                       │
│  └────┘                                 │
│                                         │
│  Description text here spanning         │  ← Description (2 lines max)
│  multiple lines...                      │
│                                         │
│  ┌──────────┐                          │
│  │          │  (decorative icons)      │  ← Background decorations
│  │ CONTENT  │  engraved effect         │
│  │          │                           │
│  └──────────┘                          │
│  ─────────────────────────────────────  │  ← Divider
│  👥 5   • 2h ago        HABITAT  →     │  ← Footer: stats + archetype
└─────────────────────────────────────────┘
```

### Compact Variant Layout

```
┌───────────────────────────────────────┐
│  ┌──┐  Space Name             ★  →   │  ← Single row layout
│  │🏠│  Subtitle                       │
│  └──┘                                 │
└───────────────────────────────────────┘
```

---

## Interaction States

### Rest State
- Base ceramic shadow
- Standard color saturation
- Icon opacity: 8% (engraved effect)

### Hover State
- Lifts 2px upward
- 2% scale increase
- Enhanced shadow depth
- Icon opacity: 12% (more visible)
- CTA ("Abrir →") fades in

### Pressed State
- Sinks 1px downward
- 2% scale decrease
- Inset shadow (concave effect)
- Haptic feedback (if supported)

### Favorite Toggle Animation
- Scale pulse: 1 → 1.2 → 1
- Color fill animation
- Subtle rotation (optional)
- Spring physics (stiffness: 400)

---

## Typography Scale

```
Space Name (Title):    16px, Bold, Archetype color
Subtitle:              12px, Regular, Secondary text
Description:           12px, Regular, Secondary text, 1.5 line-height
Footer Labels:         10px, Bold, Uppercase, Letter-spacing: 0.1em
Footer Stats:          12px, Bold, Archetype color
```

---

## Spacing System

All spacing follows 4px base unit:

```
Card Padding:         20px (5 units)
Icon Size (Default):  56px (14 units)
Icon Size (Compact):  40px (10 units)
Element Gap:          12px (3 units)
Section Gap:          16px (4 units)
```

---

## Shadow Treatments

### Card Shadows (Ceramic System)

**Rest**:
```css
box-shadow:
  6px 6px 12px rgba(163, 158, 145, 0.20),
  -6px -6px 12px rgba(255, 255, 255, 0.90);
```

**Hover (Elevated)**:
```css
box-shadow:
  6px 6px 12px rgba(163, 158, 145, 0.35),
  -6px -6px 12px rgba(255, 255, 255, 1.0);
transform: translateY(-2px) scale(1.02);
```

**Pressed (Concave)**:
```css
box-shadow:
  inset 3px 3px 6px rgba(163, 158, 145, 0.35),
  inset -3px -3px 6px rgba(255, 255, 255, 1.0);
transform: translateY(1px) scale(0.98);
```

### Icon Inset Shadows

```css
box-shadow:
  inset 4px 4px 8px rgba(163, 158, 145, 0.35),
  inset -4px -4px 8px rgba(255, 255, 255, 1.0),
  0 0 0 1px {archetype-color-20%};  /* Subtle border */
```

### Engraved Icons (Background Decorations)

```css
opacity: 0.08;
filter:
  blur(0.5px)
  drop-shadow(1px 1px 0 rgba(255, 255, 255, 0.8))
  drop-shadow(-1px -1px 0 rgba(163, 158, 145, 0.15));
```

On hover:
```css
opacity: 0.12;
```

---

## Animation Specifications

### Spring Physics

All animations use Framer Motion springs:

**Elevation (hover/press)**:
```typescript
{
  type: 'spring',
  stiffness: 350,
  damping: 28,
  mass: 1.1
}
```

**Quick Hover**:
```typescript
{
  type: 'spring',
  stiffness: 400,
  damping: 28,
  mass: 0.8
}
```

**Favorite Pulse**:
```typescript
{
  scale: [1, 1.2, 1],
  duration: 0.3,
  ease: 'easeInOut'
}
```

### Timing Values
- Hover delay: None (instant response)
- Press feedback: <100ms (perceived as instant)
- Favorite toggle: 300ms
- CTA fade-in: 200ms

---

## Accessibility

### Color Contrast
All text meets WCAG AA standards:
- Primary text (archetype color): ≥4.5:1
- Secondary text: ≥4.5:1
- Icon backgrounds: ≥3:1 (UI components)

### Focus States
- 2px outline in archetype color
- Offset: 2px
- Visible on keyboard navigation

### Touch Targets
- Minimum: 44x44px (iOS/Android guidelines)
- Favorite button: 36x36 (acceptable for secondary action)
- Card entire surface: tappable

### Screen Readers
- `aria-label` on favorite button
- Semantic HTML structure
- Proper heading hierarchy

---

## Responsive Breakpoints

```
Mobile:     < 640px  → 1 column, compact variant
Tablet:     640-1024px → 2 columns, default variant
Desktop:    1024-1280px → 3 columns, default variant
Large:      > 1280px → 4 columns, default variant
```

---

## Component Composition

### Layers (z-index)
```
Layer 5: Favorite button (z-20)
Layer 4: Card content (z-10)
Layer 3: Decorative icons (default, behind content)
Layer 2: Card background (ceramic-card)
Layer 1: Page background
```

### Rendering Order
1. Decorative background icons
2. Card container with ceramic shadows
3. Space icon (inset effect)
4. Text content
5. Footer metadata
6. Favorite toggle (if enabled)

---

## Usage Patterns

### Grid Layouts
**Best for**: Default variant, multiple spaces

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {spaces.map(space => (
    <ConnectionSpaceCard key={space.id} space={space} variant="default" />
  ))}
</div>
```

### List Layouts
**Best for**: Compact variant, sidebars, quick access

```tsx
<div className="space-y-2">
  {spaces.map(space => (
    <ConnectionSpaceCard key={space.id} space={space} variant="compact" />
  ))}
</div>
```

### Bento Grid (Mixed)
**Best for**: Featured + secondary content

```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="col-span-2">
    <ConnectionSpaceCard space={featured} variant="default" />
  </div>
  {others.map(space => (
    <ConnectionSpaceCard key={space.id} space={space} variant="compact" />
  ))}
</div>
```

---

## Design Tokens Reference

### Colors by Archetype

| Archetype | Primary    | Secondary  | BG         | Icon       |
|-----------|------------|------------|------------|------------|
| Habitat   | #8B4513    | #D2691E    | orange-50  | orange-600 |
| Ventures  | #1E3A8A    | #3B82F6    | blue-50    | blue-600   |
| Academia  | #4C1D95    | #8B5CF6    | purple-50  | purple-600 |
| Tribo     | #D97706    | #F59E0B    | amber-50   | amber-600  |

### Border Radii

| Element        | Radius  |
|----------------|---------|
| Card           | 24px    |
| Icon Container | 9999px  |
| Badges         | 9999px  |

---

## Comparison: SpaceCard vs ConnectionSpaceCard

| Feature               | SpaceCard | ConnectionSpaceCard |
|-----------------------|-----------|---------------------|
| Archetype colors      | Generic   | ✅ Distinct         |
| Background icons      | 1         | ✅ 2 (layered)      |
| Engraved effect       | ❌        | ✅                  |
| Favorite animation    | Basic     | ✅ Pulse            |
| Visual personality    | Unified   | ✅ Per archetype    |
| Hover CTA             | ❌        | ✅ "Abrir →"        |
| Icon border accent    | ❌        | ✅ Subtle glow      |

**Recommendation**: Use `ConnectionSpaceCard` for archetype-focused views. Use `SpaceCard` for neutral contexts.

---

## Future Enhancements

Planned improvements for future iterations:

1. **Micro-interactions**:
   - Parallax effect on background icons
   - Magnetic hover for favorite button
   - Card flip animation for settings

2. **Status Indicators**:
   - Online member count badge
   - Unread notification dot
   - Pending task counter

3. **Customization**:
   - User-selectable accent colors
   - Custom icon uploads
   - Theme variants (dark mode)

4. **Performance**:
   - Virtual scrolling for large lists
   - Lazy loading of images
   - Optimized re-renders with React.memo

5. **Accessibility**:
   - High contrast mode
   - Reduced motion preference
   - Voice navigation support

---

**Last Updated**: December 14, 2025
**Component Version**: 1.0.0
**Design System**: Ceramic v2.0
