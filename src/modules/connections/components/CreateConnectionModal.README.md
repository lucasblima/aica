# CreateConnectionModal Component

A 4-step wizard modal for creating new Connection Spaces in Aica Life OS. This component guides users through archetype selection, basic configuration, archetype-specific settings, and member invitations.

## Location

`src/modules/connections/components/CreateConnectionModal.tsx`

## Features

### Step 1: Choose Archetype
- **Display**: 4 archetype cards in a responsive grid
- **Archetypes**:
  - **Habitat** (Home icon): Property management and household logistics
  - **Ventures** (Briefcase icon): Business projects and entrepreneurial endeavors
  - **Academia** (GraduationCap icon): Learning, courses, and intellectual growth
  - **Tribo** (Users icon): Social groups, clubs, and communities
- **Interaction**: Single selection with visual highlight and checkmark
- **Design**: Each card shows icon, name, subtitle, and description from `ARCHETYPE_METADATA`

### Step 2: Basic Info
- **Space Name** (required): Text input with archetype-specific placeholders
- **Description** (optional): Multi-line textarea for space description
- **Color Theme**: Grid of 4 archetype-appropriate colors
- **Cover Image** (placeholder): Upload area for future implementation

### Step 3: Archetype-Specific Settings

#### Habitat Settings
- Property type dropdown (apartment, house, condo, room)
- Address input
- Default currency selection (BRL, USD, EUR)

#### Ventures Settings
- Business type dropdown (startup, agency, freelance, partnership, corporation)
- Founding date picker
- Runway alert threshold (in months)

#### Academia Settings
- Learning focus areas (multi-tag input with Enter key)
- Weekly study hours target
- Display of added focus tags with ceramic styling

#### Tribo Settings
- Group type dropdown (club, community, family, friends, sports, faith)
- Meeting frequency selection (weekly, biweekly, monthly, irregular)
- Default meeting location input

### Step 4: Invite Members
- Email + Role input form
- Role options: Member or Admin
- Add invites with Enter key or button
- List of pending invites with removal option
- Skip-friendly (empty state with helpful message)

## Component Interface

```typescript
interface CreateConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (space: CreateConnectionSpaceInput, invites?: MemberInvite[]) => void;
}

interface MemberInvite {
  email: string;
  role: MemberRole; // 'owner' | 'admin' | 'member' | 'guest'
}
```

## Design System

### Ceramic Components Used
- `ceramic-card`: Main modal container and archetype selection cards
- `ceramic-concave`: Icon containers and active state indicators
- `ceramic-inset`: Form inputs (text, textarea, select)
- `ceramic-trough`: Progress bar track
- `ceramic-tray`: Empty states and upload placeholders

### Animations
- **Framer Motion** `AnimatePresence` for step transitions
- **Slide transitions**: Steps slide in from right, exit to left
- **Progress bar**: Smooth width animation (25% → 50% → 75% → 100%)
- **Scale effects**: Hover states on cards and buttons
- **Checkmark animation**: Scale-in when archetype is selected

### Color Palettes

Each archetype has 4 themed colors:

```typescript
ARCHETYPE_COLORS = {
  habitat: [
    { name: 'Terra Cotta', value: '#9B4D3A' },
    { name: 'Sage Moss', value: '#6B7B5C' },
    { name: 'Clay Brown', value: '#8B7355' },
    { name: 'Stone Gray', value: '#8B8579' }
  ],
  ventures: [
    { name: 'Amber Alert', value: '#D97706' },
    { name: 'Precision Blue', value: '#3B82F6' },
    { name: 'Steel Gray', value: '#64748B' },
    { name: 'Carbon Black', value: '#1F2937' }
  ],
  academia: [
    { name: 'Parchment', value: '#E6D5C3' },
    { name: 'Ink Blue', value: '#1E3A8A' },
    { name: 'Library Green', value: '#065F46' },
    { name: 'Wisdom Purple', value: '#6B21A8' }
  ],
  tribo: [
    { name: 'Warm Terracotta', value: '#DC2626' },
    { name: 'Community Gold', value: '#F59E0B' },
    { name: 'Connection Teal', value: '#14B8A6' },
    { name: 'Belonging Purple', value: '#A855F7' }
  ]
}
```

## Usage Example

```tsx
import { CreateConnectionModal } from '@/modules/connections/components';
import { useState } from 'react';

function ConnectionsView() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateSpace = async (space, invites) => {
    try {
      // Call your API to create the space
      const newSpace = await createConnectionSpace(space);

      // Send invitations if any
      if (invites && invites.length > 0) {
        await sendMemberInvites(newSpace.id, invites);
      }

      console.log('Space created:', newSpace);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to create space:', error);
    }
  };

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Create New Space
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

## State Management

### Internal State
- `currentStep`: Current wizard step (1-4)
- `selectedArchetype`: Selected archetype type
- `spaceName`, `description`, `selectedColor`, `coverImage`: Basic info
- `habitatSettings`, `venturesSettings`, `academiaSettings`, `triboSettings`: Archetype-specific settings
- `invites`: Array of member invitations
- `isSubmitting`: Loading state during creation

### Validation
- **Step 1**: Requires archetype selection
- **Step 2**: Requires non-empty space name
- **Step 3**: Optional (all settings are optional)
- **Step 4**: Optional (invites can be skipped)

## Accessibility

- Keyboard navigation support
- Focus management (autofocus on first input of each step)
- Enter key support for adding invites and focus tags
- Proper ARIA labels on all interactive elements
- Disabled states with reduced opacity
- High contrast text and borders

## Mobile Responsive

- Full-screen on mobile devices
- Touch-friendly buttons (min 44px touch targets)
- Scrollable content area
- Grid layouts collapse to single column on small screens
- Progress indicator always visible at top

## Icons (lucide-react)

- `X`: Close button
- `ChevronLeft`, `ChevronRight`: Navigation
- `Check`: Completion and selection indicator
- `Home`, `Briefcase`, `GraduationCap`, `Users`: Archetype icons
- `Upload`: Cover image placeholder
- `Mail`, `UserPlus`: Member invitation icons

## Future Enhancements

- Cover image upload with crop/resize
- Preview of space before creation
- Template selection (pre-filled settings)
- Bulk member import via CSV
- Integration with contact list
- Space duplication/cloning
- Draft saving (localStorage)
- Validation tooltips
- Advanced permissions configuration

## Related Components

- `CreateSpaceWizard`: Alternative wizard implementation
- `ConnectionSpaceCard`: Display component for created spaces
- `SpaceHeader`: Header component for space detail view
- `SpaceMemberList`: Member management component

## Type Dependencies

```typescript
import {
  ArchetypeType,
  CreateConnectionSpaceInput,
  HabitatSettings,
  VenturesSettings,
  AcademiaSettings,
  TriboSettings,
  MemberRole
} from '../types';

import { ARCHETYPE_METADATA } from '../types';
```

## Testing Checklist

- [ ] All 4 archetypes can be selected
- [ ] Form validation prevents empty space names
- [ ] Navigation between steps works correctly
- [ ] Back button preserves entered data
- [ ] Color selection updates visual state
- [ ] Archetype-specific settings appear correctly
- [ ] Member invites can be added and removed
- [ ] Enter key adds invites
- [ ] Form submission calls onComplete with correct payload
- [ ] Modal closes on successful creation
- [ ] Modal resets state when reopened
- [ ] Responsive design works on mobile
- [ ] Loading state prevents double-submission
- [ ] Close button works at any step
- [ ] Progress bar animates smoothly
