# ConnectionsView - Visual Guide

## Component Structure

```
┌─────────────────────────────────────────────────────────┐
│ Header Section                                          │
│ ┌─────────────────────────────────┬─────────────────┐  │
│ │ Minhas Conexões                 │      [+]        │  │
│ │ 12 espaços                      │                 │  │
│ └─────────────────────────────────┴─────────────────┘  │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ [Todos] [Habitat] [Ventures] [Academia] [Tribo]    ││ ← CeramicTabSelector
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌───────────┬───────────┬───────────┐                  │
│ │    12     │     8     │     0     │                  │ ← Quick Stats
│ │  Espaços  │  Ativos   │ Convites  │                  │
│ └───────────┴───────────┴───────────┘                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Main Content (scrollable)                               │
│                                                         │
│ Favorites Section (horizontal scroll) ──────────────────│
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                       │
│ │ ⭐  │ │ ⭐  │ │ ⭐  │ │ ⭐  │                       │
│ │Card │ │Card │ │Card │ │Card │ → → →                 │
│ └─────┘ └─────┘ └─────┘ └─────┘                       │
│                                                         │
│ Todos os espaços (12) ──────────────────────────────────│
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│ │          │ │          │ │          │                │
│ │  Card    │ │  Card    │ │  Card    │                │
│ │          │ │          │ │          │                │
│ └──────────┘ └──────────┘ └──────────┘                │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│ │          │ │          │ │          │                │
│ │  Card    │ │  Card    │ │  Card    │                │
│ │          │ │          │ │          │                │
│ └──────────┘ └──────────┘ └──────────┘                │
│                                                         │
└─────────────────────────────────────────────────────────┘
                                                    ┌────┐
                                                    │ +  │ ← FAB
                                                    └────┘
```

## Layout Breakdown

### 1. Header Section (Fixed)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Minhas Conexões                             [+]       │
│  12 espaços                                            │
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ [Todos] Habitat Ventures Academia Tribo       │    │
│  │  ▔▔▔▔▔                                        │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│  │   12    │  │    8    │  │    0    │               │
│  │ Espaços │  │ Ativos  │  │Convites │               │
│  └─────────┘  └─────────┘  └─────────┘               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Components:**
- Title: "Minhas Conexões" (text-etched)
- Subtitle: Space count
- Create button: ceramic-card with Plus icon
- CeramicTabSelector: Sliding tab selector
- Stats row: 3 ceramic-inset-shallow cards

### 2. Favorites Section (Scrollable)

```
📈 FAVORITOS
┌──────────────────────────────────────────────────┐
│ ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐ │
│ │🏠 ⭐  │  │💼 ⭐  │  │🎓 ⭐  │  │👥 ⭐  │ │
│ │        │  │        │  │        │  │        │ │
│ │Casa    │  │Startup │  │Curso   │  │Clube   │ │
│ │[→]     │  │[→]     │  │[→]     │  │[→]     │ │
│ └────────┘  └────────┘  └────────┘  └────────┘ │
└──────────────────────────────────────────────────┘
        ← Scroll horizontal →
```

**Features:**
- Only visible when favorites exist
- Horizontal scroll with thin scrollbar
- Compact SpaceCard variant
- Star indicator on cards

### 3. Main Grid (Responsive)

#### Mobile (1 column)
```
┌──────────────┐
│   Card 1     │
└──────────────┘
┌──────────────┐
│   Card 2     │
└──────────────┘
┌──────────────┐
│   Card 3     │
└──────────────┘
```

#### Tablet (2 columns)
```
┌──────────┐ ┌──────────┐
│  Card 1  │ │  Card 2  │
└──────────┘ └──────────┘
┌──────────┐ ┌──────────┐
│  Card 3  │ │  Card 4  │
└──────────┘ └──────────┘
```

#### Desktop (3 columns)
```
┌────────┐ ┌────────┐ ┌────────┐
│ Card 1 │ │ Card 2 │ │ Card 3 │
└────────┘ └────────┘ └────────┘
┌────────┐ ┌────────┐ ┌────────┐
│ Card 4 │ │ Card 5 │ │ Card 6 │
└────────┘ └────────┘ └────────┘
```

### 4. Empty State (No Spaces)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                      ✨                                 │
│              [Ceramic Inset Icon]                       │
│                                                         │
│         Comece sua primeira conexão                     │
│                                                         │
│   Escolha um arquétipo para criar seu primeiro         │
│         espaço de colaboração                          │
│                                                         │
│  ┌──────────┐ ┌──────────┐                             │
│  │ 🏠       │ │ 💼       │                             │
│  │ Habitat  │ │ Ventures │                             │
│  └──────────┘ └──────────┘                             │
│  ┌──────────┐ ┌──────────┐                             │
│  │ 🎓       │ │ 👥       │                             │
│  │ Academia │ │ Tribo    │                             │
│  └──────────┘ └──────────┘                             │
│                                                         │
│           [Criar primeiro espaço]                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5. SpaceCard (Full Variant)

```
┌────────────────────────────────────────┐
│                               ⭐       │ ← Favorite toggle
│  ┌────┐                               │
│  │ 🏠 │  Casa do João                 │
│  └────┘  Condomínio Vila Verde        │
│                                        │
│  Gestão compartilhada do nosso...     │ ← Description
│  (line-clamp-2)                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  👥 3 membros        há 2 horas    →  │ ← Footer
└────────────────────────────────────────┘
```

**Card Structure:**
- Icon: Ceramic inset with archetype emoji
- Title: Space name (bold, etched)
- Subtitle: Optional custom subtitle
- Description: 2-line clamp
- Footer: Member count, last accessed, chevron

### 6. Floating Action Button

```
                                    ┌────┐
                                    │    │
                                    │ +  │ ← FAB
                                    │    │
                                    └────┘
```

**Features:**
- Fixed position: bottom-6 right-6
- 56x56px ceramic-card
- Ceramic warm background
- Spring animation on mount
- Hover: lifts up 2px
- Tap: scale down to 0.95

## Color Theme Reference

### Archetype Colors

```
Habitat   → bg-blue-50   text-blue-600   (Earth)
Ventures  → bg-amber-50  text-amber-600  (Amber)
Academia  → bg-orange-50 text-orange-600 (Paper)
Tribo     → bg-green-50  text-green-600  (Warm)
```

### Ceramic System

```
ceramic-base           → Background (#E8EBE9)
ceramic-card           → Elevated card
ceramic-inset-shallow  → Subtle inset
ceramic-inset-deep     → Deep inset
ceramic-tray           → Container for groups
ceramic-cool           → Cool temperature (#E8EBE9)
ceramic-warm           → Warm temperature (#F5E6D3)
ceramic-accent         → Accent color (#B8860B)
```

## Animation Timeline

### Initial Load
```
0ms    → Header fades in
80ms   → Filter tabs slide in
160ms  → Stats row appears
240ms  → Favorites section fades in
320ms  → Grid card 1 appears
400ms  → Grid card 2 appears
480ms  → Grid card 3 appears
...    → (stagger continues)
```

### Filter Change
```
0ms    → Current grid fades out
150ms  → New grid fades in with stagger
```

### FAB
```
Mount  → Scale from 0 to 1 (spring)
Hover  → Y: 0 → -2px
Tap    → Scale: 1 → 0.95
```

## Interaction Flows

### 1. View Space Details
```
User clicks card
    ↓
onNavigateToSpace(spaceId) called
    ↓
Parent navigates to space detail
```

### 2. Create New Space
```
User clicks [+] button or FAB
    ↓
onCreateSpace() called
    ↓
Parent opens CreateSpaceWizard modal
    ↓
User completes wizard
    ↓
Space is created
    ↓
List refreshes automatically
```

### 3. Toggle Favorite
```
User clicks ⭐ on card
    ↓
handleToggleFavorite(spaceId, currentState)
    ↓
API call: toggleFavorite(spaceId, !currentState)
    ↓
Local state updates
    ↓
Card moves to/from favorites section
```

### 4. Filter by Archetype
```
User clicks tab (e.g., "Habitat")
    ↓
setActiveFilter('habitat')
    ↓
filteredSpaces recalculated
    ↓
Grid animates out → in
    ↓
Only Habitat spaces shown
```

## Accessibility

### ARIA Labels
```tsx
<button aria-label="Criar novo espaço">
<button aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
```

### Keyboard Navigation
```
Tab       → Move between interactive elements
Enter     → Activate button/card
Space     → Activate button/card
Escape    → Close modals (if any)
```

### Screen Reader
```
"Minhas Conexões, 12 espaços"
"Filtro: Todos"
"12 Espaços, 8 Ativos, 0 Convites"
"Favoritos, região"
"Casa do João, botão, Condomínio Vila Verde, 3 membros"
```

## Responsive Breakpoints

```
Mobile:  < 640px   → 1 column, compact header
Tablet:  640-1024  → 2 columns, full features
Desktop: > 1024    → 3 columns, full features
```

## File Structure

```
src/modules/connections/views/
├── ConnectionsView.tsx           ← Main component
├── ConnectionsView.README.md     ← Documentation
├── VISUAL_GUIDE.md              ← This file
└── index.ts                      ← Barrel export
```

## Related Files

```
src/modules/connections/
├── hooks/
│   └── useConnectionSpaces.ts   ← Data hook
├── components/
│   └── SpaceCard.tsx            ← Card component
├── services/
│   └── connectionSpaceService.ts ← API service
└── types.ts                      ← Type definitions
```

## Testing Checklist

- [ ] Renders loading state
- [ ] Renders empty state
- [ ] Renders error state
- [ ] Displays spaces in grid
- [ ] Filters by archetype
- [ ] Shows favorites section
- [ ] Toggles favorite status
- [ ] Navigates to space detail
- [ ] Opens create modal
- [ ] Responsive at all breakpoints
- [ ] Animations work smoothly
- [ ] Keyboard navigation
- [ ] Screen reader friendly

---

Last updated: December 14, 2025
