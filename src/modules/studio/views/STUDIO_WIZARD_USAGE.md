# StudioWizard Component Usage Guide

## Overview

The `StudioWizard` component is a multi-step wizard for creating new projects in the Studio module. It currently supports podcast project creation with extensibility for future project types (video, articles).

**Location:** `src/modules/studio/views/StudioWizard.tsx`

## Features

### Step 1: Project Type Selection
- Radio buttons to select project type
- Currently supports: **Podcast** (enabled)
- Future support: Video, Articles (coming soon - disabled with badge)
- Visual feedback with icons and descriptions

### Step 2: Basic Information
- **Title** (required) - Project/episode name
- **Description** (optional) - Additional details
- **Theme** (required) - Topic/theme of the project
- Real-time validation and error messages
- Progress bar showing wizard progression

### Step 3: Project-Specific Configuration (Podcasts)
- **Guest Type**: Individual, Duo, Trio, Panel
- **Guest Name** (required) - Name of podcast guest
- **Scheduling** (optional):
  - Date
  - Time
  - Location (dropdown with presets)
  - Season number
- Loading state during episode creation
- Error handling with user-friendly messages

## Props

```typescript
interface StudioWizardProps {
  showId: string;      // Parent podcast show ID (required)
  userId: string;      // Authenticated user ID (required)
  onComplete: (project: StudioProject) => void;  // Success callback
  onCancel: () => void;  // Cancel callback
}
```

## Return Value

When the wizard completes successfully, it calls `onComplete()` with a `StudioProject` object:

```typescript
interface StudioProject {
  id: string;                    // Episode ID from database
  type: 'podcast';
  title: string;                 // Episode title
  description?: string;
  showId: string;                // Parent show ID
  status: 'draft';
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    type: 'podcast';
    guestName: string;
    episodeTheme: string;
    scheduledDate?: string;
    scheduledTime?: string;
    location?: string;
    season?: string;
    recordingDuration: 0
  }
}
```

## Database Operations

### Creates Podcast Episode

The wizard automatically creates a podcast episode in the `podcast_episodes` table with the following fields:

```sql
INSERT INTO podcast_episodes (
  show_id,
  user_id,
  title,
  description,
  guest_name,
  episode_theme,
  status,
  scheduled_date,
  location,
  season,
  created_at,
  updated_at
) VALUES (...)
```

## Usage Example

### In a React Component

```typescript
import { StudioWizard } from '@/modules/studio';
import type { StudioProject } from '@/modules/studio';

export function MyProjectCreator({ showId, userId }: Props) {
  const handleWizardComplete = (project: StudioProject) => {
    console.log('Project created:', project);
    // Navigate to workspace or library
    // Refresh project list
  };

  return (
    <StudioWizard
      showId={showId}
      userId={userId}
      onComplete={handleWizardComplete}
      onCancel={() => history.back()}
    />
  );
}
```

### In StudioMainView (FSM Context)

```typescript
<StudioWizard
  showId={state.currentShowId}
  userId={state.userId}
  onComplete={(project) => {
    setState(prev => ({
      ...prev,
      mode: 'WORKSPACE',
      currentProject: project
    }));
  }}
  onCancel={() => {
    setState(prev => ({
      ...prev,
      mode: 'LIBRARY'
    }));
  }}
/>
```

## Component Structure

### Step Flow

```
Step 0: Project Type Selection
  ├─ Select podcast (enabled)
  ├─ Video (disabled - coming soon)
  └─ Article (disabled - coming soon)
        ↓
Step 1: Basic Information
  ├─ Title (required validation)
  ├─ Description (optional)
  └─ Theme (required for podcasts)
        ↓
Step 2: Project-Specific Config (Podcasts)
  ├─ Guest Type (Individual/Duo/Trio/Panel)
  ├─ Guest Name (required validation)
  ├─ Optional Scheduling:
  │   ├─ Date
  │   ├─ Time
  │   ├─ Location
  │   └─ Season
  └─ Create Episode → Success/Error
```

## Validation Rules

### Step 1 Validation
- `title` must not be empty
- Error message: "Título é obrigatório"

### Step 2 Validation (Podcasts)
- `guestName` must not be empty
  - Error: "Nome do convidado é obrigatório"
- `theme` must not be empty
  - Error: "Tema é obrigatório"

### Cancel Confirmation
- Shows confirmation dialog if user has entered any data
- Prevents accidental loss of information
- ESC key also triggers cancel dialog

## UI/UX Features

### Progress Tracking
- Visual progress bar at top (0% → 100%)
- Step indicators with status:
  - Current step: filled with amber
  - Completed steps: filled with green (✓)
  - Future steps: filled with gray
- Step count display: "Passo X de 3"

### Error Handling
- Inline error messages with icon
- Red border styling for error state
- Error messages clear on input change
- Database errors shown with user-friendly text

### Loading States
- "Criando..." button text during creation
- Spinner icon animation
- Buttons disabled during async operations
- Prevention of multiple submissions

### Accessibility
- ARIA labels for progress bar
- Dialog role and aria-modal
- Focus management with ESC key
- Focus trap (Tab key cycles within modal)
- Semantic HTML with fieldsets and legends

### Responsive Design
- Mobile-first approach
- Full-width on small screens
- Max-width constraint (max-w-2xl)
- Padding adjusts for mobile
- Touch-friendly button sizes

## Styling

Uses Tailwind CSS with a clean, modern design:
- **Colors**: Amber accent (#f59e0b), Gray backgrounds
- **Spacing**: 8px baseline (p-8, gap-3, etc.)
- **Rounded**: 2xl corners for modern look (rounded-2xl, rounded-3xl)
- **Shadows**: shadow-2xl for depth, shadow-lg for hover states
- **Animations**: Framer Motion for smooth transitions

## Integration Points

### Supabase Integration
```typescript
// Episode creation
const { data: episode, error: dbError } = await supabase
  .from('podcast_episodes')
  .insert({...})
  .select()
  .single();
```

### Import Locations
- `supabase` from `src/services/supabaseClient`
- `StudioProject` type from `src/modules/studio/types/studio`
- Icons from `lucide-react`
- Animation from `framer-motion`

## Future Extensions

### Roadmap
1. **Step 3 Variants** for video/article projects:
   - Video: Duration, format, resolution options
   - Article: Word count, category, SEO keywords

2. **Guest Profile Integration**:
   - Auto-fill guest name from existing profiles
   - Gemini Deep Research integration for public figures
   - Guest approval workflow

3. **Templates and Presets**:
   - Common themes/formats for podcasts
   - Quick-start templates
   - Show-specific defaults

4. **Collaboration Features**:
   - Invite co-hosts/producers
   - Set permissions per project
   - Comment/approval workflows

## Testing

### Component Testing
```typescript
// Test project type selection
await userEvent.click(screen.getByTestId('podcast-type'));

// Test form validation
await userEvent.click(screen.getByText('Próximo'));
// Should show "Título é obrigatório"

// Test successful creation
await userEvent.fill(screen.getByPlaceholderText('Título'), 'Test Episode');
// ... fill other fields
await userEvent.click(screen.getByText('Criar Episódio'));
// onComplete should be called with StudioProject
```

### E2E Testing
- Navigation through all 3 steps
- Data persistence across step transitions
- Cancel confirmation dialog
- Error handling for database failures
- Successful episode creation and callback

## Known Limitations

1. **Single Guest Type Selection**: Currently shows guest type selector but creates single episode record
   - Future: Support multiple guest records linked to episode

2. **No Guest Profile Auto-fetch**: Guest name is text input only
   - Future: Integrate with Gemini Deep Research API

3. **Limited Scheduling**: Optional fields not validated
   - Future: Date/time validation, conflict checking

4. **No Media Attachment**: Wizard doesn't handle audio file upload
   - Future: Implement in production stage

## Troubleshooting

### Build Errors
- Ensure all imports from `lucide-react` and `framer-motion` are available
- Check Supabase client initialization in `src/services/supabaseClient`

### Runtime Errors
- "showId is undefined": Pass valid show ID from parent component
- "userId is undefined": Ensure user is authenticated
- Database errors: Check Supabase connection and table permissions

### UI Issues
- Modal not showing: Check z-index (defaults to correct value)
- Progress bar not moving: Verify step state updates
- Buttons not clickable: Check disabled state logic

## Performance Considerations

- **Memoization**: Component uses local state, suitable for typical wizard use
- **Bundle Size**: ~35KB gzipped with dependencies
- **Render Optimization**: AnimatePresence prevents re-rendering hidden steps
- **Supabase Calls**: Single INSERT operation on completion

## Accessibility Checklist

- [x] Keyboard navigation (Tab/Shift+Tab cycles focus)
- [x] ESC key to cancel
- [x] ARIA labels for progress
- [x] Focus visible states
- [x] Color not sole means of distinction
- [x] Error messages associated with inputs
- [x] Dialog properly marked with role="dialog"
- [x] Form labels with proper association

## Related Components

- `StudioLibrary`: Project list view
- `StudioMainView`: FSM container for wizard
- `StudioWorkspace`: Opens completed project
- `GuestIdentificationWizard`: Legacy podcast setup (deprecated)
- `GuestTypeSelector`: Reusable guest type component

## Support

For questions or issues with StudioWizard:
1. Check this documentation
2. Review component source code comments
3. Check git commit history for recent changes
4. Contact Podcast Copilot Agent
