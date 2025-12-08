# Ceramic Design System - Component Reference

**Last Updated**: 2025-12-06
**Version**: 1.0
**Principles**: Tátil, Calmo, Focado (Tactile, Calm, Focused)

---

## Design Philosophy

The Ceramic Design System follows the "Silent Luxury" aesthetic - sophistication through subtlety. Visual hierarchy comes from **depth, weight, and texture** rather than size, color saturation, or excessive decoration.

### Core Principles

1. **Tray Principle**: Group related elements in containers (ceramic-tray) to create visual anchors
2. **Scale Control**: Icons serve as recognition markers (w-6 h-6), not illustrations
3. **Color Restraint**: Use ceramic-accent (amber/gold) as precious details, not backgrounds
4. **Weight > Size**: Build hierarchy through font-weight and color, not font-size
5. **Whitespace**: Generous gaps (gap-6, gap-8) allow shadows to breathe

---

## Utility Classes

### Surface Types

#### `.ceramic-card` (Elevated Surface)
**Purpose**: Primary container for distinct content blocks
**Visual Effect**: Raised from the background with soft outset shadows
**Shadow Formula**:
- Light source: Top-left (-6px -6px white highlight)
- Shadow: Bottom-right (6px 6px taupe)

```tsx
// Usage Example
<div className="ceramic-card p-6 rounded-3xl">
  <h3 className="text-lg font-bold text-ceramic-text-primary">Card Title</h3>
  <p className="text-sm text-ceramic-text-secondary">Supporting text</p>
</div>
```

**Best Practices**:
- Use for standalone content modules (podcast episodes, task cards, stat panels)
- Maintain consistent border-radius: `rounded-3xl` (24px) or `rounded-[32px]`
- Pair with padding: `p-4` to `p-8` depending on content density

---

#### `.ceramic-tray` (Recessed Container)
**Purpose**: Visual grouping for related form fields, settings, or data clusters
**Visual Effect**: Depressed into the background with inset shadows
**Shadow Formula**:
- Inner shadow: Top-left (inset 4px 4px taupe)
- Inner highlight: Bottom-right (inset -4px -4px white)

```tsx
// Usage Example - Form Section
<section className="ceramic-tray p-8 rounded-[40px] border border-white/40">
  <header className="mb-4">
    <h3 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest">
      Episode Details
    </h3>
  </header>

  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-1">
      <label className="text-xs font-bold ml-2 text-ceramic-text-secondary">Title</label>
      <input className="ceramic-inset w-full px-4 py-3 text-sm" placeholder="Episode title" />
    </div>
    <div className="space-y-1">
      <label className="text-xs font-bold ml-2 text-ceramic-text-secondary">Guest</label>
      <input className="ceramic-inset w-full px-4 py-3 text-sm" placeholder="Guest name" />
    </div>
  </div>
</section>
```

**Best Practices**:
- Use when 3+ elements belong to the same logical context
- Add subtle border: `border border-white/20` or `border-white/40`
- Deeper border-radius than cards: `rounded-[40px]` to `rounded-[48px]`
- Pair with generous padding: `p-6` to `p-8`

**❌ Anti-pattern**:
```tsx
// Don't: Elements floating without grouping
<div className="flex flex-col gap-4">
  <input className="ceramic-inset" />
  <input className="ceramic-inset" />
  <input className="ceramic-inset" />
</div>
```

---

#### `.ceramic-inset` (Input/Button Surface)
**Purpose**: Form inputs, pill buttons, search bars
**Visual Effect**: Pressed into the surface with pill-shaped inset
**Border Radius**: 9999px (full pill)

```tsx
// Usage Example - Input Field
<input
  className="ceramic-inset w-full px-4 py-3 text-sm placeholder:text-ceramic-text-secondary/50
             focus:outline-none focus:ring-2 focus:ring-ceramic-accent/30"
  placeholder="Enter text..."
/>

// Usage Example - Pill Button
<button className="ceramic-inset px-6 py-2 text-sm font-bold text-ceramic-text-primary
                   hover:text-ceramic-accent transition-colors">
  Filter
</button>
```

**Best Practices**:
- Always full pill radius (do not override border-radius)
- Use for interactive elements that should feel "pressable"
- Pair with focus states using ceramic-accent

---

#### `.ceramic-concave` (Circular Buttons)
**Purpose**: Icon-only action buttons (mic, record, settings)
**Visual Effect**: Circular depression with deeper inset than ceramic-inset
**Border Radius**: 9999px (full circle)

```tsx
// Usage Example - Icon Button
<button className="ceramic-concave w-14 h-14 flex items-center justify-center
                   hover:bg-ceramic-highlight transition-colors">
  <Mic2 className="w-6 h-6 text-ceramic-accent" />
</button>
```

**Best Practices**:
- Use square dimensions (w-12 h-12, w-14 h-14, w-16 h-16)
- Icon size should be 40-50% of button size (w-14 button → w-6 icon)
- Center icon with `flex items-center justify-center`

---

#### `.ceramic-trough` (Toggle Channels)
**Purpose**: Background track for toggle switches, sliders
**Visual Effect**: Deep channel, slightly darker than body background

```tsx
// Usage Example - Toggle Track
<div className="ceramic-trough w-12 h-6 relative">
  <div className="ceramic-card w-5 h-5 absolute top-0.5 left-0.5 transition-transform" />
</div>
```

---

#### `.ceramic-groove` (Progress/Timer Bars)
**Purpose**: Linear grooves for progress indicators, timers
**Visual Effect**: Sharp milled channel (no border-radius)

```tsx
// Usage Example - Progress Bar
<div className="ceramic-groove h-2 relative overflow-hidden">
  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-ceramic-accent to-amber-500"
       style={{ width: '67%' }} />
</div>
```

---

### Typography System

#### Hierarchy Rules

**Primary Text** (Main Content):
- Color: `text-ceramic-text-primary` (#5C554B)
- Weight: `font-bold` or `font-black`
- Size: `text-base` to `text-2xl` (never exceed text-2xl for body content)

**Secondary Text** (Metadata, Labels):
- Color: `text-ceramic-text-secondary` (#948D82)
- Weight: `font-bold` with `uppercase`
- Size: `text-xs` or custom `text-[10px]`
- Spacing: `tracking-wide` or `tracking-widest`

**Etched Text** (Luxury Headings):
- Class: `text-etched`
- Creates subtle embossed effect via text-shadow

#### Typography Examples

```tsx
// Page Title (Hero)
<h1 className="text-2xl font-black text-ceramic-text-primary text-etched">
  Podcast Library
</h1>

// Section Header
<h2 className="text-lg font-bold text-ceramic-text-primary">
  Recent Episodes
</h2>

// Metadata Label
<span className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-widest">
  Pre-Production
</span>

// Body Text
<p className="text-sm text-ceramic-text-primary leading-relaxed">
  This is standard body content with comfortable line height.
</p>

// Subtle Supporting Text
<p className="text-xs text-ceramic-text-secondary">
  Last updated 2 hours ago
</p>
```

**❌ Anti-patterns**:
```tsx
// Don't: Excessive font size
<h1 className="text-5xl">Giant Title</h1> // ❌ Use text-2xl max

// Don't: Size without weight hierarchy
<h2 className="text-3xl font-normal">Weak Header</h2> // ❌ Use font-bold/black

// Don't: Lowercase metadata
<span className="text-xs">metadata</span> // ❌ Use uppercase tracking-widest
```

---

### Color Palette

#### Core Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `ceramic-base` | #F0EFE9 | Body background, card surfaces |
| `ceramic-text-primary` | #5C554B | Primary content text |
| `ceramic-text-secondary` | #948D82 | Metadata, labels, secondary text |
| `ceramic-accent` | #D97706 | Glazed Amber - CTAs, active states, progress |
| `ceramic-highlight` | #E6D5C3 | Hover states, subtle backgrounds |

#### Color Usage Rules

**✅ Correct Usage**:
```tsx
// Accent as text/icon color
<Zap className="w-6 h-6 text-ceramic-accent" />

// Accent in gradients (small areas)
<div className="bg-gradient-to-br from-amber-50 to-transparent" />

// Accent in progress bars
<div className="h-1 bg-ceramic-accent rounded-full" style={{ width: '45%' }} />

// Accent in borders/outlines
<button className="border-2 border-ceramic-accent text-ceramic-accent">
  Action
</button>
```

**❌ Incorrect Usage**:
```tsx
// Don't: Large solid amber/yellow backgrounds
<div className="bg-amber-400 p-8"> // ❌ Too saturated, too large

// Don't: Bright yellow backgrounds
<div className="bg-yellow-300"> // ❌ Breaks "calm" principle

// Don't: Amber as card background
<div className="ceramic-card bg-amber-200"> // ❌ Use neutral bg only
```

**Color Saturation Guideline**:
- Backgrounds: Always neutral (ceramic-base, white, or desaturated)
- Accents: Only in text, icons, thin lines, or small decorative elements
- If amber/yellow appears in bg-*, it should be -50 or -100 at most

---

### Icon System

#### Size Standards

| Context | Size | Tailwind Class | Example Use Case |
|---------|------|----------------|------------------|
| Functional | 24px | `w-6 h-6` | Nav icons, inline actions |
| Emphasis | 32px | `w-8 h-8` | Section markers, featured actions |
| Hero | 40px | `w-10 h-10` | Empty states, onboarding |
| ❌ Oversized | 48px+ | `w-12+` | Avoid unless exceptional (splash screen) |

#### Icon Examples

```tsx
// Functional Icon (Standard)
<Search className="w-6 h-6 text-ceramic-text-secondary" />

// Featured Icon (Card Accent)
<Mic2 className="w-8 h-8 text-ceramic-accent" />

// Hero Icon (Empty State)
<CloudOff className="w-10 h-10 text-ceramic-text-secondary/40" />

// Icon in Button
<button className="ceramic-inset flex items-center gap-2 px-4 py-2">
  <Plus className="w-5 h-5 text-ceramic-accent" />
  <span className="text-sm font-bold">Create New</span>
</button>
```

**❌ Anti-patterns**:
```tsx
// Don't: Oversized icon dominating card
<Mic2 className="w-20 h-20 text-yellow-400" /> // ❌ Too large, wrong color

// Don't: Icon without purpose scaling
<Icon className="w-16 h-16" /> // ❌ Unjustified size
```

---

### Button Patterns

#### Primary Action Button

```tsx
<button className="ceramic-card px-6 py-3 rounded-2xl
                   flex items-center gap-2
                   hover:shadow-lg transition-shadow">
  <Sparkles className="w-5 h-5 text-ceramic-accent" />
  <span className="text-sm font-bold text-ceramic-text-primary">
    Start Episode
  </span>
</button>
```

**Characteristics**:
- Elevated (ceramic-card)
- Compact height (py-2 to py-3)
- Icon + text pairing
- Hover enhances elevation

---

#### Secondary Action Button

```tsx
<button className="ceramic-inset px-5 py-2
                   text-sm font-bold text-ceramic-text-secondary
                   hover:text-ceramic-accent transition-colors">
  Cancel
</button>
```

**Characteristics**:
- Depressed (ceramic-inset)
- Secondary text color
- Color shift on hover

---

#### Ghost Button

```tsx
<button className="px-4 py-2
                   text-sm font-bold text-ceramic-text-secondary
                   hover:text-ceramic-accent hover:bg-ceramic-highlight/50
                   rounded-xl transition-all">
  View Details
</button>
```

**Characteristics**:
- No surface style
- Minimal visual weight
- Subtle hover state

---

#### Creation Button (+ Add New)

```tsx
<button className="ceramic-card min-h-[12rem]
                   border-2 border-dashed border-ceramic-text-secondary/30
                   rounded-3xl flex flex-col items-center justify-center gap-3
                   hover:border-ceramic-accent hover:bg-ceramic-highlight/30
                   transition-all">
  <Plus className="w-8 h-8 text-ceramic-accent" />
  <span className="text-sm font-bold text-ceramic-text-primary">
    Create New Podcast
  </span>
</button>
```

**Characteristics**:
- **Same size as content cards** (critical!)
- Dashed border to communicate "empty slot"
- Hover reveals interest
- Icon + text, not icon alone

**❌ Anti-pattern**:
```tsx
// Don't: Oversized creation button
<button className="w-full h-64 bg-amber-100"> // ❌ Too prominent
  <Plus className="w-24 h-24" /> // ❌ Icon too large
</button>
```

---

### Layout Patterns

#### Card Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => (
    <article key={item.id} className="ceramic-card p-6 rounded-3xl">
      {/* Card content */}
    </article>
  ))}
</div>
```

**Standards**:
- Gap: `gap-6` (24px) minimum, `gap-8` (32px) preferred
- Responsive columns: 1 → 2 → 3
- Consistent border-radius across all cards

---

#### Form Section (Tray Pattern)

```tsx
<section className="ceramic-tray p-8 rounded-[40px] border border-white/40 space-y-6">
  {/* Section header */}
  <header className="flex justify-between items-center">
    <h3 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest">
      Episode Information
    </h3>
    <span className="text-[10px] text-ceramic-text-secondary">Required</span>
  </header>

  {/* Form fields */}
  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-1">
      <label className="text-xs font-bold ml-2 text-ceramic-text-secondary">Title</label>
      <input className="ceramic-inset w-full px-4 py-3" />
    </div>
  </div>
</section>
```

---

#### Dashboard Metrics Panel

```tsx
<div className="ceramic-card p-6 rounded-3xl">
  {/* Primary metric */}
  <div className="text-center mb-4">
    <div className="text-4xl font-black text-ceramic-text-primary">87</div>
    <div className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest">
      Efficiency Score
    </div>
  </div>

  {/* Secondary metrics grid */}
  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-ceramic-text-secondary/10">
    <div className="text-center">
      <div className="text-lg font-bold text-ceramic-accent">12</div>
      <div className="text-[10px] text-ceramic-text-secondary uppercase">Streak</div>
    </div>
    {/* More metrics */}
  </div>
</div>
```

**Pattern Notes**:
- Single unified card instead of scattered metrics
- Large primary value (text-4xl allowed for numeric display)
- Grid of supporting data
- Visual separator between sections

---

## Implementation Checklist

Before committing a component, verify:

### Visual Hierarchy
- [ ] No text larger than `text-2xl` (except pure numeric displays)
- [ ] Font weight used for hierarchy (`font-bold` → `font-black`)
- [ ] Secondary text uses `uppercase` + `tracking-widest`

### Color Discipline
- [ ] No `bg-yellow-[3-9]` or `bg-amber-[3-9]` in backgrounds
- [ ] Ceramic-accent used only in: text, icons, borders, thin progress bars
- [ ] All surfaces use ceramic-base or white

### Icon Scale
- [ ] Functional icons: `w-6 h-6`
- [ ] Featured icons: `w-8 h-8`
- [ ] Hero icons: `w-10 h-10` (max)
- [ ] No icons above `w-12 h-12` unless splash screen

### Grouping & Spacing
- [ ] Related fields (3+) wrapped in `ceramic-tray`
- [ ] Card grids use `gap-6` or `gap-8` (not gap-4)
- [ ] Trays have `p-6` to `p-8` padding
- [ ] Cards have `p-4` to `p-6` padding

### Button Affordance
- [ ] Primary actions: `ceramic-card` (elevated)
- [ ] Secondary actions: `ceramic-inset` or ghost
- [ ] Creation buttons match content card dimensions
- [ ] All buttons have clear hover states

---

## Migration Guide

### Converting Noisy Components to Ceramic

#### Step 1: Identify Violations
```bash
# Find color violations
grep -r "bg-yellow-[3-9]" src/
grep -r "bg-amber-[3-9]" src/

# Find typography violations
grep -r "text-4xl\|text-5xl\|text-6xl" src/

# Find icon violations
grep -r "w-12 h-12\|w-16 h-16\|w-20 h-20" src/
```

#### Step 2: Apply Fixes

**Color Fix**:
```tsx
// Before
<div className="bg-amber-400 p-8">
  <Mic2 className="w-16 h-16 text-white" />
</div>

// After
<div className="ceramic-card p-6 rounded-3xl">
  <Mic2 className="w-8 h-8 text-ceramic-accent" />
</div>
```

**Typography Fix**:
```tsx
// Before
<h1 className="text-5xl text-gray-800">Dashboard</h1>

// After
<h1 className="text-2xl font-black text-ceramic-text-primary text-etched">
  Dashboard
</h1>
```

**Grouping Fix**:
```tsx
// Before
<div className="space-y-4">
  <input className="ceramic-inset" />
  <input className="ceramic-inset" />
  <input className="ceramic-inset" />
</div>

// After
<section className="ceramic-tray p-8 rounded-[40px] border border-white/40 space-y-4">
  <h3 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest mb-4">
    Form Section
  </h3>
  <input className="ceramic-inset w-full" />
  <input className="ceramic-inset w-full" />
  <input className="ceramic-inset w-full" />
</section>
```

---

## Design Tokens Reference

### Shadows

```css
/* Outset (Raised) - ceramic-card */
box-shadow:
  6px 6px 12px rgba(163, 158, 145, 0.20),
  -6px -6px 12px rgba(255, 255, 255, 0.90);

/* Inset (Depressed) - ceramic-tray, ceramic-inset */
box-shadow:
  inset 4px 4px 8px rgba(163, 158, 145, 0.35),
  inset -4px -4px 8px rgba(255, 255, 255, 1.0);

/* Deep Inset - ceramic-concave */
box-shadow:
  inset 6px 6px 12px rgba(163, 158, 145, 0.30),
  inset -6px -6px 12px rgba(255, 255, 255, 1.0);
```

### Border Radius Scale

| Element | Size | Tailwind |
|---------|------|----------|
| Pill (Inputs) | 9999px | `rounded-full` |
| Button | 16-20px | `rounded-2xl` |
| Card | 24px | `rounded-3xl` |
| Tray | 32-48px | `rounded-[32px]` to `rounded-[48px]` |

### Spacing Scale (Gaps)

| Context | Size | Tailwind |
|---------|------|----------|
| Tight (Inline) | 8px | `gap-2` |
| Standard (Vertical stack) | 16px | `gap-4` |
| Comfortable (Card grid) | 24px | `gap-6` |
| **Generous (Preferred)** | **32px** | **`gap-8`** |
| Section separator | 48px+ | `gap-12` |

---

## Examples from Codebase

### Good Example: Card-based Layout

**File**: `src/modules/podcast/views/PodcastLibrary.tsx` (after refactor)

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <button className="ceramic-card min-h-[12rem] border-2 border-dashed">
    <Plus className="w-8 h-8 text-ceramic-accent" />
    <span className="text-sm font-bold">Create New Podcast</span>
  </button>
</div>
```

**Why it's good**:
- ✅ Consistent gap-6
- ✅ Creation button matches card size
- ✅ Icon at w-8 (appropriate scale)
- ✅ Dashed border communicates affordance

---

### Anti-example to Avoid

```tsx
// ❌ Multiple violations
<div className="bg-yellow-400 p-12 rounded-lg gap-4 grid">
  <Mic2 className="w-24 h-24 text-white" />
  <h1 className="text-6xl font-light">Podcast Studio</h1>
  <button className="w-full py-8 bg-amber-500 text-white text-2xl">
    Start Recording
  </button>
</div>
```

**Violations**:
- ❌ bg-yellow-400 background (too saturated)
- ❌ w-24 h-24 icon (too large)
- ❌ text-6xl title (too large)
- ❌ font-light (insufficient hierarchy)
- ❌ gap-4 (too tight for this layout)
- ❌ Oversized button (py-8, text-2xl)

**Corrected Version**:

```tsx
// ✅ Ceramic-compliant
<section className="ceramic-tray p-8 rounded-[40px] border border-white/40 space-y-6">
  <header className="flex items-center gap-3">
    <div className="ceramic-concave w-12 h-12 flex items-center justify-center">
      <Mic2 className="w-6 h-6 text-ceramic-accent" />
    </div>
    <h1 className="text-2xl font-black text-ceramic-text-primary">
      Podcast Studio
    </h1>
  </header>

  <button className="ceramic-card px-6 py-3 rounded-2xl w-full
                     flex items-center justify-center gap-2
                     hover:shadow-lg transition-shadow">
    <Circle className="w-5 h-5 text-red-500" />
    <span className="text-sm font-bold text-ceramic-text-primary">
      Start Recording
    </span>
  </button>
</section>
```

---

## Accessibility Notes

- **Focus States**: Always provide visible focus rings using `focus:ring-2 focus:ring-ceramic-accent/30`
- **Color Contrast**: Ceramic-text-primary on ceramic-base meets WCAG AA (4.5:1)
- **Touch Targets**: Minimum button size 44x44px (use `min-h-[44px] min-w-[44px]`)
- **Semantic HTML**: Use proper heading hierarchy (h1 → h2 → h3), not just visual sizing

---

## Questions & Support

For questions about applying Ceramic principles, reference:
- **Design Guide**: `docs/design/UI_UX_GUIDELINES.md`
- **Decluttering Guide**: (User-provided document)
- **CSS Source**: `index.css` (lines 50-113)

---

**Remember**: If everything is emphasized, nothing is emphasized. The goal is **calm focus**, not **visual excitement**.
