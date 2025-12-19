# StudioWizard - Quick Reference Guide

## Import & Usage

```typescript
import { StudioWizard } from '@/modules/studio';
import type { StudioProject } from '@/modules/studio';

<StudioWizard
  showId="your-show-id"
  userId="authenticated-user-id"
  onComplete={(project) => console.log('Created:', project)}
  onCancel={() => navigate('/back')}
/>
```

## Component Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `showId` | string | Yes | Parent podcast show ID |
| `userId` | string | Yes | Authenticated user ID |
| `onComplete` | function | Yes | Callback with created project |
| `onCancel` | function | Yes | Callback when user cancels |

## Return Type

```typescript
StudioProject {
  id: string;              // Episode ID from database
  type: 'podcast';
  title: string;
  description?: string;
  showId: string;
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
    recordingDuration: 0;
  }
}
```

## Step-by-Step Walkthrough

### Step 0: Project Type Selection
- User selects project type
- Only "Podcast" is enabled
- Video/Article show "Em breve" badge

### Step 1: Basic Information
- **Title** (required): Episode/project name
- **Description** (optional): Additional details
- **Theme** (required): Topic of discussion

### Step 2: Podcast Configuration
- **Guest Type**: Individual/Duo/Trio/Panel
- **Guest Name** (required): Who is the guest
- **Optional Details**:
  - Date & time
  - Location (dropdown)
  - Season number

## Validation Rules

| Field | Step | Required | Rule |
|-------|------|----------|------|
| Title | 1 | Yes | Must not be empty |
| Theme | 1 | Yes | Must not be empty |
| Guest Name | 2 | Yes | Must not be empty (podcast) |

## Database Table Created

**Table:** `podcast_episodes`

```sql
INSERT INTO podcast_episodes (
  show_id,           -- UUID
  user_id,           -- UUID
  title,             -- VARCHAR
  description,       -- TEXT
  guest_name,        -- VARCHAR
  episode_theme,     -- VARCHAR
  status,            -- VARCHAR ('draft')
  scheduled_date,    -- DATE
  location,          -- VARCHAR
  season,            -- VARCHAR
  created_at,        -- TIMESTAMP
  updated_at         -- TIMESTAMP
)
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Tab | Navigate between fields |
| Shift+Tab | Navigate backwards |
| ESC | Cancel wizard (shows confirmation) |
| Enter | Submit form (on buttons) |

## Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Título é obrigatório" | Title field empty | Enter a title |
| "Nome do convidado é obrigatório" | Guest name empty (step 2) | Enter guest name |
| "Tema é obrigatório" | Theme field empty | Enter a theme |
| "Erro ao criar episódio: ..." | Database error | Check Supabase connection |

## Common Integration Patterns

### Pattern 1: Modal Dialog

```typescript
const [showWizard, setShowWizard] = useState(false);

return (
  <>
    <button onClick={() => setShowWizard(true)}>
      Create Project
    </button>

    {showWizard && (
      <StudioWizard
        showId={showId}
        userId={userId}
        onComplete={(project) => {
          setShowWizard(false);
          navigate(`/workspace/${project.id}`);
        }}
        onCancel={() => setShowWizard(false)}
      />
    )}
  </>
);
```

### Pattern 2: FSM State Machine

```typescript
type View = 'library' | 'wizard' | 'workspace';

const [view, setView] = useState<View>('library');

switch (view) {
  case 'wizard':
    return (
      <StudioWizard
        showId={showId}
        userId={userId}
        onComplete={(project) => {
          setCurrentProject(project);
          setView('workspace');
        }}
        onCancel={() => setView('library')}
      />
    );
  // ... other cases
}
```

### Pattern 3: Context API

```typescript
const { state, dispatch } = useStudio();

return (
  <StudioWizard
    showId={state.currentShowId}
    userId={state.userId}
    onComplete={(project) => {
      dispatch({ type: 'GO_TO_WORKSPACE', payload: project });
    }}
    onCancel={() => {
      dispatch({ type: 'GO_TO_LIBRARY' });
    }}
  />
);
```

## Testing

### Test Complete Flow

```typescript
test('Create podcast episode', async () => {
  const { getByText, getByPlaceholderText } = render(
    <StudioWizard
      showId="test-show"
      userId="test-user"
      onComplete={jest.fn()}
      onCancel={jest.fn()}
    />
  );

  // Step 0: Select podcast
  await userEvent.click(getByTestId('podcast-type'));

  // Step 1: Fill basic info
  await userEvent.type(getByPlaceholderText('Ex: Conversa com...'), 'My Episode');
  await userEvent.type(getByPlaceholderText('Ex: Políticas...'), 'Technology');
  await userEvent.click(getByText('Próximo'));

  // Step 2: Fill podcast config
  await userEvent.type(getByPlaceholderText('Ex: João Silva'), 'John Doe');
  await userEvent.click(getByText('Criar Episódio'));

  // Wait for completion
  await waitFor(() => {
    expect(onComplete).toHaveBeenCalled();
  });
});
```

## Performance Tips

1. **Lazy Load**: Only render wizard when needed
   ```typescript
   const StudioWizard = lazy(() => import('@/modules/studio').then(m => ({ default: m.StudioWizard })));
   ```

2. **Memoize Callbacks**: Prevent re-renders
   ```typescript
   const handleComplete = useCallback((project) => {
     // Handle completion
   }, [dependencies]);
   ```

3. **Batch Updates**: Update parent state once
   ```typescript
   onComplete((project) => {
     // Single state update for parent
   });
   ```

## Styling Customization

The component uses Tailwind CSS classes. To override styles, wrap with CSS module:

```css
/* StudioWizard.module.css */
.wizardOverride :where(.modal) {
  @apply max-w-4xl; /* Custom width */
}
```

```typescript
import styles from './StudioWizard.module.css';

<div className={styles.wizardOverride}>
  <StudioWizard {...props} />
</div>
```

## Troubleshooting

### Wizard Not Showing
- Verify `showId` and `userId` are not null/undefined
- Check that parent component is rendering the component

### Database Errors
- Verify Supabase client initialization
- Check RLS policies on `podcast_episodes` table
- Ensure user has insert permission

### Type Errors
```typescript
// Correct import
import type { StudioProject, StudioWizardProps } from '@/modules/studio';

// Correct usage
const project: StudioProject = await fetchProject();
```

### Styling Issues
- Verify Tailwind CSS is properly configured
- Check that theme colors are in `tailwind.config.js`
- Verify z-index doesn't conflict with other modals

## File Locations

| File | Path |
|------|------|
| Component | `src/modules/studio/views/StudioWizard.tsx` |
| Types | `src/modules/studio/types/studio.ts` |
| Module Export | `src/modules/studio/index.ts` |
| Documentation | `src/modules/studio/views/STUDIO_WIZARD_USAGE.md` |
| Module README | `src/modules/studio/README.md` |

## Support Resources

- **Full Documentation:** `src/modules/studio/views/STUDIO_WIZARD_USAGE.md`
- **Module Guide:** `src/modules/studio/README.md`
- **Architecture Plan:** `docs/architecture/STUDIO_REFACTORING_PLAN.md`
- **Implementation Report:** `STUDIO_WIZARD_IMPLEMENTATION_COMPLETE.md`

## Version Info

- **Component Version:** 1.0.0
- **Release Date:** 2025-12-18
- **React Version:** 18.2+
- **TypeScript:** 5.0+
- **Status:** Production Ready

---

For more details, see the full [STUDIO_WIZARD_USAGE.md](./src/modules/studio/views/STUDIO_WIZARD_USAGE.md) guide.
