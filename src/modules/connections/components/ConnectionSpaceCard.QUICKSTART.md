# ConnectionSpaceCard - Quick Start Guide

Get started with `ConnectionSpaceCard` in 5 minutes.

---

## Step 1: Import the Component

```tsx
import { ConnectionSpaceCard } from '@/modules/connections/components';
```

---

## Step 2: Use in Your View

### Basic Example (Simplest)

```tsx
export function MyView() {
  const mySpace = {
    id: '1',
    user_id: 'user-123',
    archetype: 'habitat',
    name: 'Condomínio Solar',
    subtitle: 'Apartamento 302',
    icon: '🏠',
    is_active: true,
    is_favorite: false,
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <ConnectionSpaceCard space={mySpace} />
  );
}
```

### With Click Handler

```tsx
import { useNavigate } from 'react-router-dom';

export function MyView() {
  const navigate = useNavigate();

  return (
    <ConnectionSpaceCard
      space={mySpace}
      onClick={() => navigate(`/connections/${mySpace.id}`)}
    />
  );
}
```

### Grid Layout (Multiple Cards)

```tsx
export function SpacesGrid({ spaces }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {spaces.map(space => (
        <ConnectionSpaceCard
          key={space.id}
          space={space}
          variant="default"
        />
      ))}
    </div>
  );
}
```

### Compact List

```tsx
export function SpacesList({ spaces }) {
  return (
    <div className="space-y-2 p-4">
      {spaces.map(space => (
        <ConnectionSpaceCard
          key={space.id}
          space={space}
          variant="compact"
        />
      ))}
    </div>
  );
}
```

---

## Step 3: Add Optional Features

### With Favorite Toggle

```tsx
const [spaces, setSpaces] = useState(mySpaces);

const toggleFavorite = (spaceId) => {
  setSpaces(prev =>
    prev.map(s =>
      s.id === spaceId ? { ...s, is_favorite: !s.is_favorite } : s
    )
  );
};

return (
  <ConnectionSpaceCard
    space={space}
    onFavoriteToggle={() => toggleFavorite(space.id)}
  />
);
```

### With Member Count

```tsx
<ConnectionSpaceCard
  space={space}
  memberCount={5}
/>
```

### With Last Activity

```tsx
<ConnectionSpaceCard
  space={space}
  lastActivity={space.last_accessed_at}
/>
```

### All Features Combined

```tsx
<ConnectionSpaceCard
  space={space}
  variant="default"
  memberCount={5}
  lastActivity={space.last_accessed_at}
  onFavoriteToggle={() => toggleFavorite(space.id)}
  onClick={() => navigate(`/connections/${space.id}`)}
/>
```

---

## Step 4: Choose Your Archetype

The component automatically styles based on `space.archetype`:

### 🏠 Habitat (Earthy Brown)
```tsx
space.archetype = 'habitat'  // Warm browns, Home/Key/Wrench icons
```

### 💼 Ventures (Deep Blue)
```tsx
space.archetype = 'ventures'  // Blue tones, TrendingUp/Target/Briefcase icons
```

### 🎓 Academia (Purple)
```tsx
space.archetype = 'academia'  // Purple tones, BookOpen/Brain/Lightbulb icons
```

### 👥 Tribo (Amber)
```tsx
space.archetype = 'tribo'  // Warm amber, Heart/Users/Calendar icons
```

---

## Common Patterns

### Pattern 1: Home Dashboard

```tsx
export function HomePage() {
  const { spaces } = useConnectionSpaces();
  const favorites = spaces.filter(s => s.is_favorite);

  return (
    <section className="p-6">
      <h2 className="text-2xl font-bold mb-4">Meus Espaços</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {favorites.map(space => (
          <ConnectionSpaceCard
            key={space.id}
            space={space}
            memberCount={space.member_count}
            onClick={() => navigate(`/connections/${space.id}`)}
          />
        ))}
      </div>
    </section>
  );
}
```

### Pattern 2: Sidebar Navigation

```tsx
export function Sidebar() {
  const { spaces } = useConnectionSpaces();

  return (
    <aside className="w-80 p-4">
      <h3 className="text-sm font-bold mb-3">ESPAÇOS</h3>
      <div className="space-y-2">
        {spaces.map(space => (
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

### Pattern 3: Filtered View

```tsx
export function FilteredSpaces() {
  const [filter, setFilter] = useState('all');
  const { spaces } = useConnectionSpaces();

  const filtered = filter === 'all'
    ? spaces
    : spaces.filter(s => s.archetype === filter);

  return (
    <div>
      {/* Filter buttons */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter('all')}>Todos</button>
        <button onClick={() => setFilter('habitat')}>🏠 Habitat</button>
        <button onClick={() => setFilter('ventures')}>💼 Ventures</button>
        <button onClick={() => setFilter('academia')}>🎓 Academia</button>
        <button onClick={() => setFilter('tribo')}>👥 Tribo</button>
      </div>

      {/* Filtered cards */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map(space => (
          <ConnectionSpaceCard key={space.id} space={space} />
        ))}
      </div>
    </div>
  );
}
```

---

## Props Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `space` | `ConnectionSpace` | ✅ Yes | - | Space data object |
| `variant` | `'default' \| 'compact'` | No | `'default'` | Display style |
| `onClick` | `() => void` | No | - | Click handler |
| `onFavoriteToggle` | `() => void` | No | - | Favorite toggle (shows ⭐ button) |
| `memberCount` | `number` | No | - | Member count badge |
| `lastActivity` | `string` | No | - | Last activity timestamp |

---

## Tips & Tricks

### Tip 1: Grid Responsiveness
```tsx
// Responsive grid that works on all screens
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
```

### Tip 2: Hover Effects
The component has built-in hover effects. No need to add extra CSS.

### Tip 3: Favorite Star
The star button only appears if you provide `onFavoriteToggle` prop.

### Tip 4: Member Count
If `memberCount` is `0` or `undefined`, the badge won't show.

### Tip 5: Compact for Mobile
Use `variant="compact"` for mobile list views to save space.

---

## Troubleshooting

### Card not showing?
Check that `space.archetype` is one of: `'habitat'`, `'ventures'`, `'academia'`, `'tribo'`

### Colors wrong?
Verify `space.archetype` value matches expected archetype.

### Animations choppy?
Reduce number of cards rendered at once or use virtual scrolling.

### Favorite button not appearing?
Make sure you provided the `onFavoriteToggle` prop.

---

## Next Steps

1. ✅ You're ready to use the component!
2. 📖 Read the full [README](./ConnectionSpaceCard.README.md) for advanced usage
3. 🎨 Check the [VISUAL_GUIDE](./ConnectionSpaceCard.VISUAL_GUIDE.md) for design details
4. 🔧 See [INTEGRATION](./ConnectionSpaceCard.INTEGRATION.md) for patterns
5. 💡 Browse [examples.tsx](./ConnectionSpaceCard.examples.tsx) for inspiration

---

**That's it!** You're now using ConnectionSpaceCard with archetype-specific visual personalities.

Happy coding! 🚀
