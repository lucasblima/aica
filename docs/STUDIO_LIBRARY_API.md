# StudioLibrary Component API

## Component Overview

Generic library view for listing and creating Studio projects (currently podcasts).

**Location:** `src/modules/studio/views/StudioLibrary.tsx`
**Export:** `src/modules/studio/index.ts`

## Props Interface

```typescript
interface StudioLibraryProps {
  onSelectShow: (showId: string) => void;
  onSelectProject: (project: StudioProject) => void;
  onCreateNew: () => void;
  userEmail?: string;
  onLogout?: () => void;
}
```

### Prop Descriptions

| Prop | Type | Required | Purpose |
|------|------|----------|---------|
| `onSelectShow` | Function | Yes | Called when user selects a show to browse episodes |
| `onSelectProject` | Function | Yes | Called when user selects an episode to open |
| `onCreateNew` | Function | Yes | Called when user creates a new show |
| `userEmail` | String | No | Email for header display |
| `onLogout` | Function | No | Called when user clicks logout |

## Usage Example

```typescript
import { StudioLibrary } from '@modules/studio';
import type { StudioProject } from '@modules/studio';

function MyComponent() {
  const handleSelectShow = (showId: string) => {
    console.log('Selected show:', showId);
    // Navigate to wizard or show details
  };

  const handleSelectProject = (project: StudioProject) => {
    console.log('Selected project:', project);
    // Navigate to workspace
  };

  const handleCreateNew = () => {
    console.log('Creating new project');
    // Open creation wizard
  };

  return (
    <StudioLibrary
      onSelectShow={handleSelectShow}
      onSelectProject={handleSelectProject}
      onCreateNew={handleCreateNew}
      userEmail="user@example.com"
      onLogout={() => console.log('Logout')}
    />
  );
}
```

## State Management

### Internal State

```typescript
const [shows, setShows] = useState<PodcastShow[]>([]);
const [loading, setLoading] = useState(true);
const [showModal, setShowModal] = useState(false);
const [creating, setCreating] = useState(false);
const [expandedShowId, setExpandedShowId] = useState<string | null>(null);
const [episodesByShow, setEpisodesByShow] = useState<Record<string, StudioProject[]>>({});
const [loadingEpisodes, setLoadingEpisodes] = useState<Record<string, boolean>>({});
```

### Data Flow

```
Component Load
    ↓
[useEffect] loadShows()
    ↓
Load all podcast_shows
    ↓
Render shows grid
    ↓
User clicks show
    ↓
loadEpisodes(showId)
    ↓
Load podcast_episodes for show
    ↓
Convert to StudioProject[] via episodeToProject()
    ↓
Cache in episodesByShow
    ↓
Render episodes list
```

## Episode Conversion

### episodeToProject Function

Converts database episode to generic StudioProject format:

```typescript
function episodeToProject(
  episode: any,
  show: PodcastShow
): StudioProject
```

**Input:**
- `episode`: Raw database record from `podcast_episodes`
- `show`: Associated show from `podcast_shows`

**Output:**
```typescript
{
  id: string;                    // episode.id
  type: 'podcast';              // Fixed for podcasts
  title: string;                // episode.title or "Untitled Episode"
  description?: string;         // episode.description
  showId?: string;              // episode.podcast_show_id
  showTitle?: string;           // show.title
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  createdAt: Date;              // new Date(episode.created_at)
  updatedAt: Date;              // new Date(episode.updated_at)
  metadata: {
    type: 'podcast';
    guestName?: string;
    episodeTheme?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    location?: string;
    season?: string;
    recordingDuration?: number;
  };
}
```

## Database Queries

### Load Shows
```sql
SELECT *
FROM podcast_shows_with_stats
ORDER BY created_at DESC
```

**Returns:** Shows with `episodes_count` for badge display

### Load Episodes
```sql
SELECT *
FROM podcast_episodes
WHERE podcast_show_id = $showId
ORDER BY created_at DESC
```

### Create Show
```sql
INSERT INTO podcast_shows (name, title, description, user_id)
VALUES ($title, $title, $description, $userId)
RETURNING *
```

## UI Sections

### 1. Header
- Using `HeaderGlobal` component
- Displays "Estúdio Aica" title
- Shows user email and logout button

### 2. Create New Show Card
- Inset style ceramic card
- Plus icon button
- Opens `CreatePodcastDialog` modal
- Top-left of grid

### 3. Shows Grid
```
+-----+-----+-----+-----+
|     |     |     |     |  Creates 2-4 columns based on screen size
| Pad | Gap | Gap | Pad |  Gap: 1.5rem (gap-6)
+-----+-----+-----+-----+  Responsive: md:cols-3, lg:cols-4

Each show card includes:
- Cover image (aspect-square)
- Title (2 lines max)
- Episode count badge (amber)
- Hover arrow (right, amber)
```

### 4. Episodes List (When Expanded)
```
Episódios
+-----+-----+-----+-----+
| New | Ep1 | Ep2 | Ep3 |  Similar grid layout
+-----+-----+-----+-----+  Blue-themed episode cards

Episode card includes:
- Thumbnail (blue gradient)
- Title (2 lines max)
- Guest name (1 line)
- Status badge (blue)
- Hover arrow (right, blue)
```

### 5. Empty States
- **No Shows**: Icon, message, create button
- **No Episodes**: Icon, message, create button

## Styling Classes

Uses Ceramic design system from `src/index.css`:

| Class | Purpose |
|-------|---------|
| `ceramic-base` | Background color for main container |
| `ceramic-card` | Raised card style |
| `ceramic-inset` | Inset/recessed style |
| `ceramic-text-primary` | Main text color |
| `ceramic-text-secondary` | Secondary text color |
| `ceramic-text-tertiary` | Tertiary/muted text color |

## Accessibility

- Semantic HTML structure
- Button elements for interactive areas
- Proper focus states (via Tailwind classes)
- Loading indicators for async operations
- Descriptive empty states

## Performance Considerations

1. **Lazy Episode Loading**: Episodes only load when show is expanded
2. **Caching**: Episodes cached in `episodesByShow` state
3. **Efficient Re-renders**: Uses `useCallback` for stable function references
4. **Responsive Images**: Show covers use img tags with fallback icon

## Error Handling

```typescript
// Show loading errors silently (console logging)
try {
  const { data, error } = await supabase.from('...').select(...);
  if (error) throw error;
  // Update state
} catch (error) {
  console.error('Error loading...:', error);
  // State not updated, component shows error UI
}
```

## Keyboard Navigation

- Tab through shows, episodes, and buttons
- Enter/Space to activate buttons
- Focus visible via Tailwind/browser defaults

## Responsive Breakpoints

```
Mobile (< 768px):     2 columns
Tablet (768px+):      3 columns  (md:)
Desktop (1024px+):    4 columns  (lg:)
```

## Component Lifecycle

```
Mount
  ↓
[useEffect] Runs once → loadShows()
  ↓
Renders loading skeletons
  ↓
Shows loaded → Renders shows grid
  ↓
User interactions:
  - Click show → loadEpisodes() → Render episodes
  - Click episode → onSelectProject()
  - Click create → onCreateNew() or modal
```

## Future Extensions

When adding support for new project types:

1. Add new `episodeToProject()` variant for that type
2. Update `type` field to 'video', 'article', etc.
3. Add type-specific metadata fields
4. Adjust UI colors and icons per type
5. Extend database queries

---

**Component Status:** ✅ Implemented (Task 2.2)
**Last Updated:** 2025-12-18
**Maintained By:** Podcast Copilot Agent
