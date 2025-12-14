# Academia Views - Ceramic Design System

This directory contains the view components for the Academia archetype using the Ceramic Design System.

## Overview

The Academia module represents the "Temple of Knowledge" with a midnight blue + gold accent theme.

## Views

### 1. AcademiaHome.tsx

**Main dashboard for Academia archetype**

- **Theme**: Midnight blue (`blue-800`, `blue-700`) primary, amber (`amber-500`) accents
- **Design System**: Full Ceramic Design System implementation
- **Icons**: lucide-react (BookOpen, GraduationCap, FileText, Clock, TrendingUp)

**Features**:
- Current learning journeys display
- Reading list progress tracking  
- Notes/Zettelkasten preview
- Quick stats (Active Journeys, Study Hours, Notes count)
- Ceramic card styling with elevation animations
- Stagger animations for list items
- Empty states with contextual messaging

**Props**:
```typescript
interface AcademiaHomeProps {
  spaceId: string;
  onNavigateToJourney?: (journeyId: string) => void;
}
```

### 2. JourneyDetail.tsx

**Detail page for a learning journey**

- **Theme**: Same midnight blue + gold accent scheme
- **Design System**: Full Ceramic Design System implementation
- **Icons**: lucide-react (BookOpen, GraduationCap, FileText, Clock, ArrowLeft, Plus)

**Features**:
- Journey header with progress overview
- Progress bar with animated fill
- Course/module list with stats
- Resources section
- Notes integration with inline editor
- Time tracking statistics
- Back navigation
- AnimatePresence for note editor transitions

**Props**:
```typescript
interface JourneyDetailProps {
  spaceId: string;
  journeyId: string;
  onBack?: () => void;
}
```

## Design Patterns

### Color Scheme
- **Primary**: `blue-800`, `blue-700` (midnight blue)
- **Accent**: `amber-500`, `amber-600` (gold)
- **Backgrounds**: `blue-50`, `amber-50` for stat cards
- **Text**: Ceramic text utilities (`ceramic-text-primary`, `ceramic-text-secondary`)

### Ceramic Components Used
- `ceramic-card` - Elevated cards with shadow
- `ceramic-inset` - Inset containers for icons
- `ceramic-inset-shallow` - Shallow inset for stats
- `ceramic-tray` - Container for empty states
- `ceramic-base` - Base background color

### Animations
- `cardElevationVariants` - For card hover/press states
- `staggerContainer` / `staggerItem` - For list animations
- Framer Motion progress bars with easing
- AnimatePresence for conditional rendering

## Dependencies

```typescript
// React & Animation
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Icons
import { BookOpen, GraduationCap, FileText, Clock, TrendingUp, ArrowLeft, Plus } from 'lucide-react';

// Hooks
import { useJourneys } from '../hooks/useJourneys';
import { useNotes } from '../hooks/useNotes';

// Components
import { JourneyProgress } from '../components/JourneyProgress';
import { NoteEditor } from '../components/NoteEditor';

// Types
import { CreateNotePayload } from '../types';

// Animations
import { 
  cardElevationVariants, 
  staggerContainer, 
  staggerItem 
} from '../../../../lib/animations/ceramic-motion';
```

## Usage Example

```typescript
import { AcademiaHome, JourneyDetail } from '@/modules/connections/academia/views';

// In your router/navigation component
function AcademiaRouter({ spaceId }: { spaceId: string }) {
  const [selectedJourney, setSelectedJourney] = useState<string | null>(null);

  if (selectedJourney) {
    return (
      <JourneyDetail
        spaceId={spaceId}
        journeyId={selectedJourney}
        onBack={() => setSelectedJourney(null)}
      />
    );
  }

  return (
    <AcademiaHome
      spaceId={spaceId}
      onNavigateToJourney={setSelectedJourney}
    />
  );
}
```

## Exports

All views are exported via barrel export in `index.ts`:

```typescript
export { AcademiaHome } from './AcademiaHome';
export { JourneyDetail } from './JourneyDetail';
export { NotesView } from './NotesView';
export { MentorshipsView } from './MentorshipsView';
export { PortfolioView } from './PortfolioView';
```

## Notes

- Both views use the full-screen layout pattern (`h-screen`, `overflow-hidden`)
- Loading states use spinning Clock icon with blue-700 color
- Empty states use contextual icons (BookOpen for journeys, FileText for notes)
- All interactive elements use Ceramic card elevation patterns
- Progress bars animate from 0 to target percentage on mount
- Tag displays limited to 3 visible tags with amber styling
