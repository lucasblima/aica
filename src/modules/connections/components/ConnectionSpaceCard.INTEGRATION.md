# ConnectionSpaceCard - Integration Guide

## Quick Start

### 1. Import the Component

```typescript
import { ConnectionSpaceCard } from '@/modules/connections/components';
```

### 2. Basic Usage

```tsx
<ConnectionSpaceCard
  space={mySpace}
  onClick={() => navigate(`/connections/${mySpace.id}`)}
/>
```

### 3. With All Features

```tsx
<ConnectionSpaceCard
  space={mySpace}
  variant="default"
  memberCount={5}
  lastActivity={mySpace.last_accessed_at}
  onFavoriteToggle={() => toggleFavorite(mySpace.id)}
  onClick={() => navigate(`/connections/${mySpace.id}`)}
/>
```

---

## Integration Scenarios

### Scenario 1: Home Dashboard - Featured Spaces

Show user's favorite spaces in a grid on the home page.

```tsx
// src/pages/Home.tsx

import { ConnectionSpaceCard } from '@/modules/connections/components';
import { useConnectionSpaces } from '@/modules/connections/hooks';

export function Home() {
  const { spaces, toggleFavorite } = useConnectionSpaces();
  const favoriteSpaces = spaces.filter(s => s.is_favorite);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Meus Espaços</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {favoriteSpaces.map(space => (
          <ConnectionSpaceCard
            key={space.id}
            space={space}
            variant="default"
            memberCount={space.member_count}
            onFavoriteToggle={() => toggleFavorite(space.id)}
            onClick={() => navigate(`/connections/${space.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### Scenario 2: Connections Hub - All Spaces

Browse all connection spaces with filtering and search.

```tsx
// src/modules/connections/views/ConnectionsHub.tsx

import { useState } from 'react';
import { ConnectionSpaceCard } from '../components';
import { useConnectionSpaces } from '../hooks';
import { ArchetypeType } from '../types';

export function ConnectionsHub() {
  const { spaces, toggleFavorite } = useConnectionSpaces();
  const [filter, setFilter] = useState<ArchetypeType | 'all'>('all');

  const filteredSpaces = filter === 'all'
    ? spaces
    : spaces.filter(s => s.archetype === filter);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Espaços de Conexão</h1>

        {/* Archetype filter tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            Todos
          </FilterButton>
          <FilterButton
            active={filter === 'habitat'}
            onClick={() => setFilter('habitat')}
          >
            🏠 Habitat
          </FilterButton>
          <FilterButton
            active={filter === 'ventures'}
            onClick={() => setFilter('ventures')}
          >
            💼 Ventures
          </FilterButton>
          <FilterButton
            active={filter === 'academia'}
            onClick={() => setFilter('academia')}
          >
            🎓 Academia
          </FilterButton>
          <FilterButton
            active={filter === 'tribo'}
            onClick={() => setFilter('tribo')}
          >
            👥 Tribo
          </FilterButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredSpaces.map(space => (
          <ConnectionSpaceCard
            key={space.id}
            space={space}
            variant="default"
            memberCount={space.member_count}
            onFavoriteToggle={() => toggleFavorite(space.id)}
            onClick={() => navigate(`/connections/${space.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### Scenario 3: Sidebar Navigation - Quick Access

Show compact list of spaces in a sidebar for quick navigation.

```tsx
// src/components/ConnectionsSidebar.tsx

import { ConnectionSpaceCard } from '@/modules/connections/components';
import { useConnectionSpaces } from '@/modules/connections/hooks';

export function ConnectionsSidebar() {
  const { spaces } = useConnectionSpaces();
  const recentSpaces = spaces
    .sort((a, b) => {
      const dateA = new Date(a.last_accessed_at || 0).getTime();
      const dateB = new Date(b.last_accessed_at || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);

  return (
    <aside className="w-80 p-4 bg-ceramic-bg border-r border-ceramic-text-secondary/10">
      <h3 className="text-sm font-bold uppercase tracking-wider text-ceramic-text-secondary mb-3">
        Acesso Rápido
      </h3>

      <div className="space-y-2">
        {recentSpaces.map(space => (
          <ConnectionSpaceCard
            key={space.id}
            space={space}
            variant="compact"
            onClick={() => navigate(`/connections/${space.id}`)}
          />
        ))}
      </div>
    </aside>
  );
}
```

---

### Scenario 4: Mobile App - Swipe Navigation

Horizontal scrollable list for mobile.

```tsx
// src/modules/connections/views/MobileConnectionsView.tsx

import { ConnectionSpaceCard } from '../components';
import { useConnectionSpaces } from '../hooks';

export function MobileConnectionsView() {
  const { spaces, toggleFavorite } = useConnectionSpaces();

  return (
    <div className="pb-20"> {/* Account for mobile nav */}
      {/* Favorites section */}
      <section className="mb-6">
        <h2 className="text-xl font-bold px-4 mb-3">Favoritos</h2>

        <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2">
          {spaces
            .filter(s => s.is_favorite)
            .map(space => (
              <div key={space.id} className="flex-shrink-0 w-72">
                <ConnectionSpaceCard
                  space={space}
                  variant="default"
                  memberCount={space.member_count}
                  onFavoriteToggle={() => toggleFavorite(space.id)}
                  onClick={() => navigate(`/connections/${space.id}`)}
                />
              </div>
            ))}
        </div>
      </section>

      {/* All spaces section */}
      <section className="px-4">
        <h2 className="text-xl font-bold mb-3">Todos os Espaços</h2>

        <div className="space-y-2">
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
      </section>
    </div>
  );
}
```

---

### Scenario 5: Onboarding - Space Creation Preview

Show preview of what user's space will look like.

```tsx
// src/modules/connections/views/CreateSpacePreview.tsx

import { useState } from 'react';
import { ConnectionSpaceCard } from '../components';
import { ConnectionSpace, ArchetypeType } from '../types';

export function CreateSpacePreview() {
  const [archetype, setArchetype] = useState<ArchetypeType>('habitat');
  const [spaceName, setSpaceName] = useState('Meu Espaço');
  const [subtitle, setSubtitle] = useState('');

  // Create preview space object
  const previewSpace: ConnectionSpace = {
    id: 'preview',
    user_id: 'current-user',
    archetype,
    name: spaceName,
    subtitle,
    description: 'Este é um preview do seu novo espaço de conexão.',
    icon: '🏠', // Default, would be set based on archetype
    is_active: true,
    is_favorite: false,
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Criar Novo Espaço</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Arquétipo</label>
            <select
              value={archetype}
              onChange={e => setArchetype(e.target.value as ArchetypeType)}
              className="ceramic-inset w-full p-2"
            >
              <option value="habitat">🏠 Habitat</option>
              <option value="ventures">💼 Ventures</option>
              <option value="academia">🎓 Academia</option>
              <option value="tribo">👥 Tribo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              type="text"
              value={spaceName}
              onChange={e => setSpaceName(e.target.value)}
              className="ceramic-inset w-full p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Subtítulo</label>
            <input
              type="text"
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              className="ceramic-inset w-full p-2"
            />
          </div>
        </div>

        {/* Live preview */}
        <div>
          <p className="text-sm font-medium mb-3">Preview</p>
          <ConnectionSpaceCard
            space={previewSpace}
            variant="default"
            memberCount={1}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## Working with Hooks

### useConnectionSpaces Hook

Create a custom hook to manage space data and interactions.

```typescript
// src/modules/connections/hooks/useConnectionSpaces.ts

import { useState, useEffect } from 'react';
import { ConnectionSpace } from '../types';
import { spaceService } from '../services';

export function useConnectionSpaces() {
  const [spaces, setSpaces] = useState<ConnectionSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadSpaces();
  }, []);

  async function loadSpaces() {
    try {
      setLoading(true);
      const data = await spaceService.getUserSpaces();
      setSpaces(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFavorite(spaceId: string) {
    const space = spaces.find(s => s.id === spaceId);
    if (!space) return;

    // Optimistic update
    setSpaces(prev =>
      prev.map(s =>
        s.id === spaceId ? { ...s, is_favorite: !s.is_favorite } : s
      )
    );

    try {
      await spaceService.updateSpace(spaceId, {
        is_favorite: !space.is_favorite,
      });
    } catch (err) {
      // Revert on error
      setSpaces(prev =>
        prev.map(s =>
          s.id === spaceId ? { ...s, is_favorite: space.is_favorite } : s
        )
      );
      console.error('Failed to toggle favorite:', err);
    }
  }

  async function updateLastAccessed(spaceId: string) {
    try {
      await spaceService.updateSpace(spaceId, {
        last_accessed_at: new Date().toISOString(),
      });

      // Update local state
      setSpaces(prev =>
        prev.map(s =>
          s.id === spaceId
            ? { ...s, last_accessed_at: new Date().toISOString() }
            : s
        )
      );
    } catch (err) {
      console.error('Failed to update last accessed:', err);
    }
  }

  return {
    spaces,
    loading,
    error,
    toggleFavorite,
    updateLastAccessed,
    reload: loadSpaces,
  };
}
```

---

## Routing Integration

### React Router Setup

```tsx
// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConnectionsHub } from '@/modules/connections/views/ConnectionsHub';
import { SpaceDetailView } from '@/modules/connections/views/SpaceDetailView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/connections" element={<ConnectionsHub />} />
        <Route path="/connections/:spaceId" element={<SpaceDetailView />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Navigation Handler

```tsx
import { useNavigate } from 'react-router-dom';
import { useConnectionSpaces } from '@/modules/connections/hooks';

export function SpacesList() {
  const navigate = useNavigate();
  const { spaces, updateLastAccessed } = useConnectionSpaces();

  const handleSpaceClick = async (spaceId: string) => {
    // Update last accessed timestamp
    await updateLastAccessed(spaceId);

    // Navigate to detail view
    navigate(`/connections/${spaceId}`);
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {spaces.map(space => (
        <ConnectionSpaceCard
          key={space.id}
          space={space}
          onClick={() => handleSpaceClick(space.id)}
        />
      ))}
    </div>
  );
}
```

---

## State Management

### With Zustand

```typescript
// src/modules/connections/store/useConnectionStore.ts

import create from 'zustand';
import { ConnectionSpace } from '../types';
import { spaceService } from '../services';

interface ConnectionStore {
  spaces: ConnectionSpace[];
  loading: boolean;
  loadSpaces: () => Promise<void>;
  toggleFavorite: (spaceId: string) => Promise<void>;
  updateSpace: (spaceId: string, data: Partial<ConnectionSpace>) => void;
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  spaces: [],
  loading: false,

  loadSpaces: async () => {
    set({ loading: true });
    try {
      const spaces = await spaceService.getUserSpaces();
      set({ spaces, loading: false });
    } catch (error) {
      set({ loading: false });
      console.error('Failed to load spaces:', error);
    }
  },

  toggleFavorite: async (spaceId: string) => {
    const { spaces } = get();
    const space = spaces.find(s => s.id === spaceId);
    if (!space) return;

    // Optimistic update
    set({
      spaces: spaces.map(s =>
        s.id === spaceId ? { ...s, is_favorite: !s.is_favorite } : s
      ),
    });

    try {
      await spaceService.updateSpace(spaceId, {
        is_favorite: !space.is_favorite,
      });
    } catch (error) {
      // Revert
      set({
        spaces: spaces.map(s =>
          s.id === spaceId ? { ...s, is_favorite: space.is_favorite } : s
        ),
      });
    }
  },

  updateSpace: (spaceId: string, data: Partial<ConnectionSpace>) => {
    set({
      spaces: get().spaces.map(s =>
        s.id === spaceId ? { ...s, ...data } : s
      ),
    });
  },
}));
```

Usage:

```tsx
import { useConnectionStore } from '@/modules/connections/store';
import { ConnectionSpaceCard } from '@/modules/connections/components';

export function SpacesView() {
  const { spaces, toggleFavorite } = useConnectionStore();

  return (
    <div className="grid grid-cols-3 gap-4">
      {spaces.map(space => (
        <ConnectionSpaceCard
          key={space.id}
          space={space}
          onFavoriteToggle={() => toggleFavorite(space.id)}
        />
      ))}
    </div>
  );
}
```

---

## Testing

### Unit Test Example

```typescript
// src/modules/connections/components/__tests__/ConnectionSpaceCard.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectionSpaceCard } from '../ConnectionSpaceCard';
import { ConnectionSpace } from '../../types';

const mockSpace: ConnectionSpace = {
  id: '1',
  user_id: 'user-123',
  archetype: 'habitat',
  name: 'Test Space',
  subtitle: 'Test Subtitle',
  description: 'Test description',
  icon: '🏠',
  is_active: true,
  is_favorite: false,
  settings: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('ConnectionSpaceCard', () => {
  it('renders space name and subtitle', () => {
    render(<ConnectionSpaceCard space={mockSpace} />);

    expect(screen.getByText('Test Space')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const handleClick = jest.fn();
    render(<ConnectionSpaceCard space={mockSpace} onClick={handleClick} />);

    fireEvent.click(screen.getByText('Test Space'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows favorite button when onFavoriteToggle is provided', () => {
    const handleToggle = jest.fn();
    render(
      <ConnectionSpaceCard
        space={mockSpace}
        onFavoriteToggle={handleToggle}
      />
    );

    const favoriteButton = screen.getByLabelText(/favoritos/i);
    expect(favoriteButton).toBeInTheDocument();

    fireEvent.click(favoriteButton);
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('renders compact variant correctly', () => {
    const { container } = render(
      <ConnectionSpaceCard space={mockSpace} variant="compact" />
    );

    // Compact variant should not show description
    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });
});
```

---

## Performance Optimization

### Memoization

```tsx
import { memo } from 'react';
import { ConnectionSpaceCard } from '@/modules/connections/components';

// Memoize the card to prevent unnecessary re-renders
const MemoizedSpaceCard = memo(ConnectionSpaceCard, (prevProps, nextProps) => {
  return (
    prevProps.space.id === nextProps.space.id &&
    prevProps.space.is_favorite === nextProps.space.is_favorite &&
    prevProps.space.name === nextProps.space.name &&
    prevProps.memberCount === nextProps.memberCount
  );
});

export function SpacesList({ spaces }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {spaces.map(space => (
        <MemoizedSpaceCard
          key={space.id}
          space={space}
          memberCount={space.member_count}
        />
      ))}
    </div>
  );
}
```

### Virtual Scrolling (for large lists)

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { ConnectionSpaceCard } from '@/modules/connections/components';

export function VirtualizedSpaceList({ spaces }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: spaces.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimated height for compact variant
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ConnectionSpaceCard
              space={spaces[virtualItem.index]}
              variant="compact"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Troubleshooting

### Issue: Cards not rendering
**Solution**: Ensure `ConnectionSpace` data structure matches type definition.

### Issue: Animations stuttering
**Solution**: Reduce number of cards rendered at once, use virtual scrolling.

### Issue: Favorite toggle not working
**Solution**: Verify `onFavoriteToggle` prop is provided and handler updates state correctly.

### Issue: Colors not applying
**Solution**: Check that `space.archetype` is one of: `'habitat' | 'ventures' | 'academia' | 'tribo'`.

---

**Integration Complete!** You're now ready to use ConnectionSpaceCard throughout your application.
