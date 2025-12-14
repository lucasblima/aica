# CreateConnectionModal - Integration Guide

Quick guide to integrate the CreateConnectionModal into your Aica Life OS application.

## Installation

The component is already available at:
```
src/modules/connections/components/CreateConnectionModal.tsx
```

## Quick Start

```tsx
import { CreateConnectionModal } from '@/modules/connections/components';
import { useState } from 'react';

function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateSpace = async (space, invites) => {
    // Your creation logic here
    console.log('Space:', space);
    console.log('Invites:', invites);
  };

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Create Space
      </button>

      <CreateConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplete={handleCreateSpace}
      />
    </>
  );
}
```

## Props Interface

```typescript
interface CreateConnectionModalProps {
  isOpen: boolean;          // Controls modal visibility
  onClose: () => void;      // Called when user closes modal
  onComplete: (             // Called when user submits the form
    space: CreateSpacePayload,
    invites?: MemberInvite[]
  ) => void;
}
```

## Payload Types

### CreateSpacePayload
```typescript
{
  archetype: 'habitat' | 'ventures' | 'academia' | 'tribo';
  name: string;              // Required
  description?: string;      // Optional
  icon?: string;             // Auto-set based on archetype
  color_theme?: string;      // Selected color value
}
```

### MemberInvite
```typescript
{
  email: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
}
```

## Backend Integration with Supabase

### 1. Create the Space

```typescript
import { supabase } from '@/lib/supabaseClient';

async function createSpace(space: CreateSpacePayload, userId: string) {
  const { data, error } = await supabase
    .from('connection_spaces')
    .insert({
      user_id: userId,
      archetype: space.archetype,
      name: space.name,
      description: space.description,
      icon: space.icon,
      color_theme: space.color_theme,
      settings: {},
      is_active: true,
      is_favorite: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### 2. Add Creator as Owner

```typescript
async function addOwnerMembership(spaceId: string, userId: string) {
  const { error } = await supabase
    .from('connection_members')
    .insert({
      space_id: spaceId,
      user_id: userId,
      role: 'owner',
      permissions: { all: true },
      is_active: true,
      context_data: {}
    });

  if (error) throw error;
}
```

### 3. Send Member Invites

```typescript
async function sendInvites(spaceId: string, invites: MemberInvite[]) {
  const inviteRecords = invites.map(invite => ({
    space_id: spaceId,
    external_email: invite.email,
    role: invite.role,
    permissions: {},
    is_active: true,
    context_data: {}
  }));

  const { error } = await supabase
    .from('connection_members')
    .insert(inviteRecords);

  if (error) throw error;
}
```

### 4. Complete Handler

```typescript
const handleCreateSpace = async (space: CreateSpacePayload, invites?: MemberInvite[]) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Create space
    const newSpace = await createSpace(space, user.id);

    // Add owner membership
    await addOwnerMembership(newSpace.id, user.id);

    // Send invites if any
    if (invites && invites.length > 0) {
      await sendInvites(newSpace.id, invites);
    }

    // Success - redirect or update UI
    window.location.href = `/connections/${newSpace.id}`;
  } catch (error) {
    console.error('Failed to create space:', error);
    alert('Error creating space');
  }
};
```

## State Management Integration

### With Zustand

```typescript
// store/connectionsStore.ts
import { create } from 'zustand';

interface ConnectionsStore {
  spaces: ConnectionSpace[];
  createSpace: (space: CreateSpacePayload, invites?: MemberInvite[]) => Promise<void>;
}

export const useConnectionsStore = create<ConnectionsStore>((set, get) => ({
  spaces: [],

  createSpace: async (space, invites) => {
    // Create in backend
    const newSpace = await createSpace(space, userId);

    // Update local state
    set({ spaces: [...get().spaces, newSpace] });

    // Handle invites
    if (invites) await sendInvites(newSpace.id, invites);
  }
}));

// In your component
const createSpace = useConnectionsStore(state => state.createSpace);

<CreateConnectionModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onComplete={createSpace}
/>
```

### With React Query

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function MyComponent() {
  const queryClient = useQueryClient();

  const createSpaceMutation = useMutation({
    mutationFn: async ({ space, invites }) => {
      const newSpace = await createSpace(space, userId);
      if (invites) await sendInvites(newSpace.id, invites);
      return newSpace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connection-spaces'] });
    }
  });

  const handleCreate = (space, invites) => {
    createSpaceMutation.mutate({ space, invites });
  };

  return (
    <CreateConnectionModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onComplete={handleCreate}
    />
  );
}
```

## Routing Integration

### React Router

```typescript
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();

  const handleCreateSpace = async (space, invites) => {
    const newSpace = await createSpace(space, userId);
    // ... handle invites

    // Navigate to new space
    navigate(`/connections/${newSpace.id}`);
  };

  return <CreateConnectionModal ... />;
}
```

## Analytics Integration

```typescript
const handleCreateSpace = async (space, invites) => {
  // Track creation attempt
  analytics.track('Connection Space Creation Started', {
    archetype: space.archetype
  });

  try {
    const newSpace = await createSpace(space, userId);

    // Track success
    analytics.track('Connection Space Created', {
      archetype: space.archetype,
      has_description: !!space.description,
      has_custom_color: !!space.color_theme,
      invite_count: invites?.length || 0
    });

    return newSpace;
  } catch (error) {
    // Track failure
    analytics.track('Connection Space Creation Failed', {
      error: error.message
    });
    throw error;
  }
};
```

## Error Handling

```typescript
const handleCreateSpace = async (space, invites) => {
  try {
    const newSpace = await createSpace(space, userId);
    await sendInvites(newSpace.id, invites);

    // Show success toast
    toast.success(`Space "${space.name}" created successfully!`);

  } catch (error) {
    // Handle specific errors
    if (error.code === 'PGRST116') {
      toast.error('You already have a space with this name');
    } else if (error.message.includes('network')) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('Failed to create space. Please try again.');
    }

    // Re-throw to keep modal open
    throw error;
  }
};
```

## Testing

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateConnectionModal } from './CreateConnectionModal';

describe('CreateConnectionModal', () => {
  it('creates a space with basic info', async () => {
    const onComplete = jest.fn();

    render(
      <CreateConnectionModal
        isOpen={true}
        onClose={() => {}}
        onComplete={onComplete}
      />
    );

    // Step 1: Select archetype
    fireEvent.click(screen.getByText('Habitat'));
    fireEvent.click(screen.getByText('Próximo'));

    // Step 2: Fill basic info
    fireEvent.change(screen.getByPlaceholderText(/Apartamento Centro/), {
      target: { value: 'My Home' }
    });
    fireEvent.click(screen.getByText('Próximo'));

    // Step 3: Skip archetype settings
    fireEvent.click(screen.getByText('Próximo'));

    // Step 4: Skip invites and create
    fireEvent.click(screen.getByText('Criar Espaço'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          archetype: 'habitat',
          name: 'My Home'
        }),
        undefined
      );
    });
  });
});
```

## Troubleshooting

### Modal doesn't open
- Ensure `isOpen` prop is set to `true`
- Check for z-index conflicts with other modals

### TypeScript errors
- Import types from `@/modules/connections/types`
- Ensure Supabase types are generated

### Styling issues
- Verify Ceramic CSS classes are loaded
- Check Tailwind config includes the correct paths

### Performance issues
- Lazy load the modal component
- Use React.memo for optimization

```typescript
import { lazy, Suspense } from 'react';

const CreateConnectionModal = lazy(() =>
  import('@/modules/connections/components/CreateConnectionModal')
);

function MyComponent() {
  return (
    <Suspense fallback={null}>
      <CreateConnectionModal ... />
    </Suspense>
  );
}
```

## Next Steps

1. Implement archetype-specific settings handling
2. Add cover image upload functionality
3. Create space templates for quick setup
4. Add validation tooltips
5. Implement draft saving with localStorage

## Support

For issues or questions:
- Check the README: `CreateConnectionModal.README.md`
- Review examples: `CreateConnectionModal.example.tsx`
- See type definitions: `../types/index.ts`
