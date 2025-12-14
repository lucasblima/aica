# ConnectionsView - Quick Start Guide

## 5-Minute Integration

### 1. Import the Component

```tsx
import { ConnectionsView } from '@/modules/connections/views';
```

### 2. Use in Your Page/Route

```tsx
function ConnectionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <ConnectionsView
      userId={user.id}
      onNavigateToSpace={(spaceId) => navigate(`/connections/${spaceId}`)}
      onCreateSpace={() => {/* Open your create modal */}}
    />
  );
}
```

### 3. That's It!

The component handles:
- Data fetching via `useConnectionSpaces` hook
- Loading states
- Error handling
- Empty states
- Filtering
- Favorites
- All animations

## Common Patterns

### With Create Modal

```tsx
function ConnectionsPage() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <ConnectionsView
        userId={user.id}
        onCreateSpace={() => setShowCreate(true)}
      />

      {showCreate && (
        <CreateSpaceModal onClose={() => setShowCreate(false)} />
      )}
    </>
  );
}
```

### With React Router

```tsx
import { useNavigate } from 'react-router-dom';

function ConnectionsPage() {
  const navigate = useNavigate();

  return (
    <ConnectionsView
      userId={user.id}
      onNavigateToSpace={(id) => navigate(`/spaces/${id}`)}
    />
  );
}
```

### Standalone (No Navigation)

```tsx
function ConnectionsPage() {
  return (
    <ConnectionsView userId={user.id} />
  );
}
```

## Props Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `userId` | `string` | Yes | - | User ID for fetching spaces |
| `onNavigateToSpace` | `(id: string) => void` | No | `undefined` | Called when user clicks a space |
| `onCreateSpace` | `() => void` | No | `undefined` | Called when user clicks create button |

## States

The component automatically handles:

1. **Loading** - Shows skeleton UI
2. **Error** - Shows error message with retry
3. **Empty** - Shows empty state with suggestions
4. **Data** - Shows full interface

## Customization

### Styling

The component uses the Ceramic Design System. To customize:

```css
/* Override ceramic variables in your global CSS */
:root {
  --ceramic-accent: #YOUR_COLOR;
  --ceramic-base: #YOUR_BACKGROUND;
}
```

### Behavior

```tsx
// Example: Open create modal in a dialog
function ConnectionsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <ConnectionsView
        userId={user.id}
        onCreateSpace={() => setDialogOpen(true)}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <CreateSpaceWizard />
      </Dialog>
    </>
  );
}
```

## Troubleshooting

### "User not authenticated" error
Make sure `userId` is a valid user ID from your auth system.

### Component not loading data
Check that `useConnectionSpaces` hook can access Supabase client.

### Animations not working
Verify `framer-motion` is installed: `npm install framer-motion`

### Styling looks wrong
Ensure Ceramic Design System CSS is imported in your app.

## Next Steps

- Read [ConnectionsView.README.md](./ConnectionsView.README.md) for full documentation
- Check [VISUAL_GUIDE.md](./VISUAL_GUIDE.md) for layout reference
- Review [DELIVERY_SUMMARY.md](./DELIVERY_SUMMARY.md) for implementation details

---

**Need Help?** Check the full documentation in the README.
