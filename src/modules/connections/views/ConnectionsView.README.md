# ConnectionsView Component

## Overview

`ConnectionsView` is the main container component for displaying and managing Connection Spaces in Aica Life OS. It provides a comprehensive interface for viewing, filtering, and organizing all connection spaces across the four archetypes: Habitat, Ventures, Academia, and Tribo.

## Features

### 1. Header Section
- **Title**: "Minhas Conexões" with ceramic text styling
- **Filter Tabs**: All | Habitat | Ventures | Academia | Tribo
- **Create Button**: Quick access to create new spaces

### 2. Quick Stats Row
- **Total Spaces**: Count of all connection spaces
- **Active Collaborations**: Number of active spaces
- **Pending Invitations**: Count of pending invites (placeholder for future feature)

### 3. Favorites Section
- Horizontal scrollable row of favorite spaces
- Compact card variant for quick access
- Only displayed when favorites exist

### 4. Main Grid
- Responsive grid layout:
  - Mobile: 1 column
  - Tablet: 2 columns
  - Desktop: 3 columns
- Full card variant with rich information
- Animated transitions with Framer Motion
- Empty state with archetype suggestions

### 5. Floating Action Button
- Fixed bottom-right position
- Opens create space modal/flow
- Spring physics animation

## Component Interface

```typescript
interface ConnectionsViewProps {
  userId: string;
  onNavigateToSpace?: (spaceId: string) => void;
  onCreateSpace?: () => void;
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `userId` | `string` | Yes | Current user ID for fetching spaces |
| `onNavigateToSpace` | `(spaceId: string) => void` | No | Callback when user clicks a space card |
| `onCreateSpace` | `() => void` | No | Callback to open create space modal |

## Usage Example

```tsx
import { ConnectionsView } from '@/modules/connections/views';

function ConnectionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <>
      <ConnectionsView
        userId={user.id}
        onNavigateToSpace={(spaceId) => navigate(`/connections/${spaceId}`)}
        onCreateSpace={() => setShowCreateModal(true)}
      />

      {showCreateModal && (
        <CreateSpaceModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newSpace) => {
            navigate(`/connections/${newSpace.id}`);
          }}
        />
      )}
    </>
  );
}
```

## States

### Loading State
- Displays skeleton UI with animated pulse
- Header skeleton + grid of 6 card skeletons

### Error State
- Centered error card with retry button
- Shows error message from API
- Manual retry via button

### Empty State
- First-time user experience
- Grid of archetype suggestion cards
- Each archetype card links to create flow
- Primary CTA: "Criar primeiro espaço"

### Normal State
- Full-featured view with all sections
- Favorites (if any)
- Filtered grid based on active tab
- Stats row
- Floating action button

## Filtering

The component supports filtering by archetype via the `CeramicTabSelector`:

- **All**: Shows all connection spaces
- **Habitat**: Shows only Habitat spaces (home/condo management)
- **Ventures**: Shows only Ventures spaces (projects/businesses)
- **Academia**: Shows only Academia spaces (courses/mentorships)
- **Tribo**: Shows only Tribo spaces (clubs/communities)

Filters are animated with smooth transitions using `AnimatePresence`.

## Animations

The component uses the Ceramic Design System's animation library:

- **Stagger Container**: Parent container with staggered children
- **Stagger Item**: Individual cards fade in with 80ms delay
- **Spring Physics**: FAB and interactive elements use spring animations
- **Tab Transitions**: Smooth sliding indicator on tab selector

## Data Flow

1. Component mounts and calls `useConnectionSpaces` hook
2. Hook fetches spaces from API via `connectionSpaceService`
3. Spaces are filtered based on active tab
4. Favorites are computed from spaces with `is_favorite: true`
5. Stats are calculated from filtered spaces
6. User interactions trigger callbacks (navigate, create, toggle favorite)

## Dependencies

### Internal Dependencies
- `useConnectionSpaces`: Hook for managing connection spaces data
- `SpaceCard`: Card component for displaying individual spaces
- `CeramicTabSelector`: Tab selector with ceramic physics
- `ceramic-motion`: Animation utilities (stagger, spring)
- `ARCHETYPE_CONFIG`: Configuration for archetype metadata

### External Dependencies
- `framer-motion`: Animations and transitions
- `lucide-react`: Icons

## Responsive Behavior

### Mobile (< 640px)
- Single column grid
- Horizontal scroll for favorites
- Compact stats row
- Fixed FAB at bottom-right

### Tablet (640px - 1024px)
- Two column grid
- Horizontal scroll for favorites
- Stats row with all three metrics
- Fixed FAB at bottom-right

### Desktop (> 1024px)
- Three column grid
- Horizontal scroll for favorites
- Full stats row
- Fixed FAB at bottom-right

## Accessibility

- Semantic HTML structure
- ARIA labels on buttons
- Keyboard navigation support
- Focus management
- Screen reader friendly

## Future Enhancements

- [ ] Pull-to-refresh on mobile
- [ ] Real pending invitations count
- [ ] Member count per space
- [ ] Search/filter by name
- [ ] Sort options (recent, alphabetical, archetype)
- [ ] Batch actions (multi-select)
- [ ] Export/import spaces
- [ ] Archive/unarchive functionality

## Related Components

- `SpaceCard` - Individual space card component
- `CreateSpaceWizard` - Multi-step space creation flow
- `CeramicTabSelector` - Tab selector with ceramic design
- `FloatingActionButton` - Reusable FAB component

## Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectionsView } from './ConnectionsView';

describe('ConnectionsView', () => {
  it('renders loading state initially', () => {
    render(<ConnectionsView userId="123" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays empty state when no spaces exist', async () => {
    // Mock empty response
    render(<ConnectionsView userId="123" />);
    await waitFor(() => {
      expect(screen.getByText(/Comece sua primeira conexão/i)).toBeInTheDocument();
    });
  });

  it('filters spaces by archetype', async () => {
    render(<ConnectionsView userId="123" />);

    // Click Habitat tab
    fireEvent.click(screen.getByRole('tab', { name: /habitat/i }));

    // Verify only Habitat spaces are shown
    // ...
  });
});
```

## File Location

```
src/modules/connections/views/ConnectionsView.tsx
```

## Last Updated

December 14, 2025
