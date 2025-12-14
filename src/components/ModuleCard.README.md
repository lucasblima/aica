# ModuleCard - Normalized Ceramic Design Component

## Overview
The `ModuleCard` component is a normalized card with consistent height and visual weight, designed for use in the Bento grid layout on the Home page. It displays module information with pending tasks, loading states, and beautiful ceramic-style hover effects.

## File Location
`C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/components/ModuleCard.tsx`

## Key Design Features

### 1. Consistent Height (min-h-[180px])
All module cards now have a minimum height of 180px, ensuring visual consistency in the Bento grid layout regardless of content.

### 2. Uniform Padding (p-5)
Changed from `p-6` to `p-5` to follow Ceramic design standards and create balanced visual weight.

### 3. Framer Motion Integration
- Uses `cardElevationVariants` from `ceramic-motion.ts`
- Smooth hover state with elevation effect
- Press/tap feedback with `whileTap="pressed"`
- Replaces CSS-only hover animations with physics-based spring animations

### 4. Improved Icon Engraving
- Background icon now uses the `icon-engraved` CSS class
- More consistent with the Ceramic design system
- Better visual hierarchy

### 5. Task Count Badge
- Added a task count badge in the header
- Shows number of pending tasks when available
- Uses ceramic-inset styling with accent colors

### 6. Flexbox Layout Structure
- Header section with icon, title, and badge
- Flexible content area (flex-1) for task list
- Footer section with "Ver todos" CTA

### 7. Limited Task Display
- Shows maximum of 3 tasks using `tasks.slice(0, 3)`
- Prevents cards from becoming too tall or heavy
- Maintains consistent visual weight across cards

## Component Structure

```tsx
<motion.div>  // Card container with min-h-[180px]
  <div className="icon-engraved">  // Background decorative icon
    <Icon />
  </div>

  <div className="flex flex-col h-full">  // Content container
    {/* Header: Icon + Title + Badge */}
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="ceramic-inset">
          <Icon />
        </div>
        <h3>{title}</h3>
      </div>
      {/* Task count badge */}
      <div className="ceramic-inset">
        <span>{taskCount}</span>
      </div>
    </div>

    {/* Content: Task list (flexible) */}
    <div className="flex-1 min-h-[60px]">
      {/* Loading skeleton OR task list OR empty state */}
    </div>

    {/* Footer: View all CTA */}
    <div className="opacity-0 group-hover:opacity-100">
      <span>Ver todos</span>
      <ChevronRight />
    </div>
  </div>
</motion.div>
```

## Changes from Previous Version

### Added Dependencies
```tsx
import { motion } from 'framer-motion';
import { cardElevationVariants } from '../lib/animations/ceramic-motion';
```

### CSS Class Changes
| Before | After | Reason |
|--------|-------|--------|
| `p-6` | `p-5` | Ceramic standard padding |
| - | `min-h-[180px]` | Consistent card height |
| - | `flex flex-col` | Better layout control |
| `hover:scale-[1.02]` | Removed | Now handled by Framer Motion |
| `opacity-5` | `icon-engraved` | Better visual consistency |

### Structural Changes
1. Replaced `<div>` with `<motion.div>` for animation support
2. Added task count badge in header
3. Wrapped background icon in dedicated container with `icon-engraved`
4. Changed task list to show max 3 tasks with `.slice(0, 3)`
5. Added flexbox structure with `flex-1` for flexible content area
6. Centered empty state text vertically

### Animation Improvements
| State | Before | After |
|-------|--------|-------|
| Rest | CSS shadow | Ceramic elevation variants |
| Hover | CSS scale + transition | Spring animation with elevation |
| Tap | None | Press feedback with inset shadow |

## Usage Example

```tsx
import { ModuleCard } from '@/components/ModuleCard';
import { Heart } from 'lucide-react';

function MyComponent() {
  return (
    <ModuleCard
      moduleId="health"
      title="Saúde"
      icon={Heart}
      color="orange"
      accentColor="bg-orange-50 border-orange-100 text-orange-600"
      onTasksLoaded={(id, count) => {
        console.log(`Module ${id} has ${count} tasks`);
      }}
    />
  );
}
```

## Design Principles Applied

### Ceramic Design System
- **Tactile Feedback**: Spring-based animations mimic physical material
- **Shadow Hygiene**: Taupe/cool brown shadows for depth
- **Elevation States**: Rest, hover, pressed variants
- **Visual Weight**: Balanced icon, text, and whitespace

### Bento Grid Harmony
- **Consistent Heights**: All cards align in grid
- **Uniform Padding**: Visual rhythm across cards
- **Flexible Content**: Adapts to 0-3+ tasks gracefully
- **Empty States**: Centered, unobtrusive messaging

## Testing Checklist

- [ ] Card displays correctly with 0 tasks (empty state)
- [ ] Card displays correctly with 1-3 tasks
- [ ] Card displays correctly with 4+ tasks (shows only 3)
- [ ] Task count badge appears when tasks > 0
- [ ] Hover animation feels smooth and tactile
- [ ] Press animation provides feedback on click
- [ ] Loading skeleton displays during data fetch
- [ ] "Ver todos" footer appears on hover
- [ ] Card height is consistent across all modules
- [ ] Works in Bento grid layout without breaking alignment

## Related Files

- **Animation System**: `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/lib/animations/ceramic-motion.ts`
- **CSS Classes**: `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/index.css`
- **Usage Example**: `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/pages/Home.tsx`
- **Data Service**: `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/services/supabaseService.ts`

## Next Steps (FASE 4.2+)

1. Create similar normalized versions for other card types (FinanceCard, GrantsCard)
2. Extract common card structure to a base component
3. Add smooth entry animations with stagger effect
4. Implement card selection/focus states for keyboard navigation
5. Add accessibility attributes (ARIA labels, roles)
