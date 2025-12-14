# ConnectionSpaceCard Component

## Overview

`ConnectionSpaceCard` is an enhanced card component that displays Connection Spaces with distinct visual personalities for each of the four archetypes. It follows the Ceramic Design System and uses Framer Motion for spring-based animations.

## Visual Design Philosophy

Each archetype has a unique aesthetic language that reflects its core purpose:

### HABITAT (🏠) - The Physical Anchor
- **Color Accent**: Warm browns and terracotta (#8B4513, #D2691E)
- **Visual Tone**: Earthy, grounded, stable
- **Decorative Icons**: Home, Key, Wrench
- **Design Emphasis**: Stability, comfort, physical presence
- **Use Case**: Condos, apartments, shared living spaces

### VENTURES (💼) - The Creation Engine
- **Color Accent**: Deep blue and charcoal (#1E3A8A, #3B82F6)
- **Visual Tone**: Precise, dashboard-like, technical
- **Decorative Icons**: TrendingUp, Target, Briefcase
- **Design Emphasis**: Metrics, progress, strategy
- **Use Case**: Startups, businesses, professional projects

### ACADEMIA (🎓) - The Mind Cultivation
- **Color Accent**: Deep purple and indigo (#4C1D95, #8B5CF6)
- **Visual Tone**: Serene, contemplative, spacious
- **Decorative Icons**: BookOpen, Brain, Lightbulb
- **Design Emphasis**: Knowledge, growth, learning
- **Use Case**: Courses, mentorships, study groups

### TRIBO (👥) - The Social Fabric
- **Color Accent**: Warm amber and coral (#D97706, #F59E0B)
- **Visual Tone**: Warm, embracing, human
- **Decorative Icons**: Heart, Users, Calendar
- **Design Emphasis**: Relationships, memories, belonging
- **Use Case**: Communities, clubs, friend groups, family

## Component Interface

```typescript
interface ConnectionSpaceCardProps {
  space: ConnectionSpace;
  onClick?: () => void;
  onFavoriteToggle?: () => void;
  variant?: 'default' | 'compact';
  memberCount?: number;
  lastActivity?: string;
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `space` | `ConnectionSpace` | Required | The connection space data object |
| `onClick` | `() => void` | Optional | Handler called when card is clicked |
| `onFavoriteToggle` | `() => void` | Optional | Handler for favorite star toggle. If provided, shows star button |
| `variant` | `'default' \| 'compact'` | `'default'` | Display variant |
| `memberCount` | `number` | Optional | Number of members to display in badge |
| `lastActivity` | `string` | Optional | ISO timestamp of last activity (falls back to `space.last_accessed_at`) |

## Variants

### Default Variant
- **Size**: Minimum 200px height
- **Layout**: Full card with description, stats, and metadata
- **Features**:
  - Large archetype icon (56x56)
  - Two decorative background icons with engraved effect
  - Favorite star toggle (if `onFavoriteToggle` provided)
  - Description text (line-clamp-2)
  - Member count badge
  - Last activity timestamp
  - Archetype label
  - Hover CTA ("Abrir" with chevron)
- **Use Case**: Grid views, featured spaces, main listings

### Compact Variant
- **Size**: 48px height (approx)
- **Layout**: Horizontal layout with minimal info
- **Features**:
  - Small archetype icon (40x40)
  - Single decorative background icon
  - Space name and subtitle
  - Favorite star indicator (non-interactive)
  - Chevron for navigation hint
- **Use Case**: Lists, sidebars, quick access menus

## Usage Examples

### Basic Usage
```tsx
import { ConnectionSpaceCard } from '@/modules/connections/components';

function MySpacesList({ spaces }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {spaces.map(space => (
        <ConnectionSpaceCard
          key={space.id}
          space={space}
          onClick={() => navigate(`/connections/${space.id}`)}
        />
      ))}
    </div>
  );
}
```

### With Favorite Toggle
```tsx
import { ConnectionSpaceCard } from '@/modules/connections/components';
import { useToggleFavorite } from '@/modules/connections/hooks';

function FavoriteSpaces({ spaces }) {
  const { toggleFavorite } = useToggleFavorite();

  return (
    <div className="space-y-3">
      {spaces.map(space => (
        <ConnectionSpaceCard
          key={space.id}
          space={space}
          variant="compact"
          onFavoriteToggle={() => toggleFavorite(space.id)}
          onClick={() => navigate(`/connections/${space.id}`)}
        />
      ))}
    </div>
  );
}
```

### With Member Count and Activity
```tsx
import { ConnectionSpaceCard } from '@/modules/connections/components';
import { useSpaceMembers } from '@/modules/connections/hooks';

function SpaceGrid({ spaces }) {
  const { getMemberCount } = useSpaceMembers();

  return (
    <div className="grid grid-cols-2 gap-4">
      {spaces.map(space => (
        <ConnectionSpaceCard
          key={space.id}
          space={space}
          memberCount={getMemberCount(space.id)}
          lastActivity={space.last_accessed_at}
          onFavoriteToggle={() => handleToggle(space.id)}
          onClick={() => openSpace(space.id)}
        />
      ))}
    </div>
  );
}
```

### Grid Layout Recommendations
```tsx
// For default variant - Bento-style grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
  {spaces.map(space => (
    <ConnectionSpaceCard
      key={space.id}
      space={space}
      variant="default"
    />
  ))}
</div>

// For compact variant - Vertical list
<div className="space-y-2 p-4">
  {spaces.map(space => (
    <ConnectionSpaceCard
      key={space.id}
      space={space}
      variant="compact"
    />
  ))}
</div>
```

## Design System Integration

### Ceramic Classes Used
- `ceramic-card`: Main card container with elevated shadows
- `ceramic-inset`: Icon backgrounds with inset effect
- `ceramic-concave`: Favorite button with concave effect
- `icon-engraved`: Background decorative icons with subtle engraved appearance

### Framer Motion Variants
- `cardElevationVariants`: Provides rest, hover, pressed states
- `springHover`: Quick responsive hover animation
- Custom pulse animation for favorite star

### Color System
Each archetype uses:
- **Primary accent**: Used for archetype label and icon borders
- **Secondary accent**: Used for hover states and highlights
- **Background tint**: Soft 50-level tint for icon backgrounds
- **Text colors**: 900-level for titles, 600-level for icons

## Animation Details

### Card States
- **Rest**: Base state with standard ceramic shadow
- **Hover**: 2% scale up, 2px lift, enhanced shadow
- **Pressed**: 2% scale down, 1px sink, inset shadow
- **Selected**: 4px lift, amplified shadow (not used in this component but available)

### Favorite Star
- **Toggle on**: Scale pulse animation (1 → 1.2 → 1)
- **Hover**: Scale 1.05 with color transition
- **Tap**: Scale 0.95

### Background Icons
- **Default**: 8% opacity with engraved filter effect
- **Hover**: 12% opacity with enhanced engraving
- **Effect**: Blur + drop shadows for carved appearance

## Accessibility

- Favorite button has proper `aria-label` based on state
- Interactive elements use semantic HTML (`<button>`)
- Proper focus states via Framer Motion
- Touch-friendly tap targets (44x44 minimum)

## Performance Considerations

- Uses CSS transforms for animations (GPU-accelerated)
- Spring animations are optimized with proper stiffness/damping values
- `line-clamp` for text truncation (CSS-only, no JS)
- Conditional rendering for optional elements
- Memoization recommended for large lists

## Related Components

- `SpaceCard`: Original card component with simpler design
- `ModuleCard`: Similar pattern used for module cards in Home
- `JourneyMasterCard`: Reference for ceramic design patterns

## Future Enhancements

Potential additions for future iterations:

1. **Status Indicators**: Show online members, pending tasks, unread messages
2. **Quick Actions**: Swipe gestures for quick favorite/archive
3. **Customization**: Allow users to pick custom accent colors
4. **Badges**: Show notifications, deadlines, or alerts
5. **Skeleton States**: Loading placeholder with shimmer effect
6. **Drag & Drop**: Reorder cards in grids
7. **Contextual Menu**: Right-click/long-press for actions

## Migration from SpaceCard

If you're currently using `SpaceCard` and want to migrate:

```tsx
// Before
<SpaceCard
  space={space}
  variant="full"
  showFavorite
  memberCount={5}
  onClick={handleClick}
  onToggleFavorite={handleFavorite}
/>

// After
<ConnectionSpaceCard
  space={space}
  variant="default"  // "full" → "default"
  memberCount={5}
  onClick={handleClick}
  onFavoriteToggle={handleFavorite}  // "onToggleFavorite" → "onFavoriteToggle"
/>
```

**Key Differences**:
- `variant="full"` → `variant="default"`
- `showFavorite` prop removed (auto-enabled if `onFavoriteToggle` provided)
- `onToggleFavorite` → `onFavoriteToggle`
- Enhanced visual personality per archetype
- More decorative background icons
- Improved animation polish

## Troubleshooting

### Icons not showing
- Ensure `lucide-react` is installed: `npm install lucide-react`
- Check that icon imports are correct at top of file

### Animations not smooth
- Verify `framer-motion` is installed: `npm install framer-motion`
- Check that ceramic-motion.ts is properly exported

### Colors not applying
- Ensure archetype is one of: `'habitat' | 'ventures' | 'academia' | 'tribo'`
- Check that space.archetype is correctly set in database

### Engraved effect not visible
- Verify `icon-engraved` class is defined in index.css
- Check that Ceramic Design System styles are loaded

## Contributing

When modifying this component:

1. Maintain archetype visual distinctions
2. Follow Ceramic Design System guidelines
3. Test all four archetypes thoroughly
4. Ensure accessibility standards
5. Optimize animations for 60fps
6. Update this README with changes

---

**Component Location**: `src/modules/connections/components/ConnectionSpaceCard.tsx`
**Design System**: Ceramic Design System (index.css)
**Animation Library**: Framer Motion
**Icon Library**: Lucide React
**Date Formatting**: date-fns
