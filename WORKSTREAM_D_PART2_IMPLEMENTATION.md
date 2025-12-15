# WORKSTREAM D - Part 2: Mini Project Manager Implementation

## Overview

Complete frontend implementation for the Mini Project Manager feature in the Atlas module. This allows users to organize their tasks into projects and track progress.

## Deliverables

### 1. Service Layer: `projectService.ts`

**Location:** `src/modules/atlas/services/projectService.ts`

**Features:**
- Full CRUD operations for projects
- Custom error classes (ProjectValidationError, ProjectAuthenticationError, ProjectDatabaseError)
- Input validation
- Support for project progress tracking via database view
- Soft delete (archive) and hard delete options

**Main Functions:**
```typescript
- createProject(payload: CreateProjectPayload): Promise<Project>
- getProjects(filters?: ProjectFilters): Promise<Project[]>
- getProjectById(projectId: string): Promise<Project>
- getProjectWithProgress(projectId: string): Promise<Project>
- getProjectsWithProgress(filters?: ProjectFilters): Promise<Project[]>
- updateProject(projectId: string, payload: UpdateProjectPayload): Promise<Project>
- deleteProject(projectId: string): Promise<void> // Soft delete
- hardDeleteProject(projectId: string): Promise<void> // Permanent delete
```

**Interface:**
```typescript
interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  connection_space_id?: string;
  status: 'active' | 'completed' | 'archived' | 'on_hold';
  color?: string;
  icon?: string;
  target_date?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // From view join
  total_tasks?: number;
  completed_tasks?: number;
  progress_percentage?: number;
}
```

### 2. Hooks Layer: `useProjects.ts`

**Location:** `src/modules/atlas/hooks/useProjects.ts`

**Hooks Provided:**

#### `useProjects(filters?: ProjectFilters)`
Manages multiple projects with optional filtering
- Returns: `{ projects, loading, error, createProject, refresh }`
- Auto-fetches on mount and filter changes
- Optimistic updates for creation

#### `useProject(projectId: string | undefined)`
Manages single project with its tasks
- Returns: `{ project, tasks, loading, error, updateProject, deleteProject, refresh }`
- Fetches project with progress data
- Fetches associated tasks

#### `useProjectTasks(projectId: string | undefined)`
Manages tasks within a specific project
- Returns: `{ tasks, loading, error, addTask, removeTask, refresh }`
- Allows linking/unlinking tasks to projects

#### `useCreateProject()`
Wizard-style project creation
- Returns: `{ createProject, isCreating }`
- Shows success/error notifications

#### `useUpdateProject(projectId: string | undefined)`
Project update with validation
- Returns: `{ updateProject, isUpdating }`
- Shows success/error notifications

#### `useDeleteProject()`
Project deletion (archiving)
- Returns: `{ deleteProject, isDeleting }`
- Shows success/error notifications

### 3. Component Layer

#### `ProjectCard.tsx`

**Location:** `src/modules/atlas/components/ProjectCard.tsx`

**Features:**
- Visual card with icon/emoji and title
- Colored progress bar with gradient
- Task count display (e.g., "5/12 tarefas")
- Status badge (active, on_hold, completed, archived)
- Target date with overdue/approaching indicators
- Click handler to open details
- Framer Motion animations

**Props:**
```typescript
interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}
```

**Visual Features:**
- Custom color background for icon
- Progress bar with project-specific color gradient
- Status badges with color coding:
  - Active: green
  - On Hold: yellow
  - Completed: blue
  - Archived: gray
- Date indicators:
  - Red for overdue
  - Yellow for approaching (within 7 days)
  - Blue for normal

#### `ProjectDetail.tsx`

**Location:** `src/modules/atlas/components/ProjectDetail.tsx`

**Features:**
- Full-screen drawer from right side
- Editable project information
- Status dropdown menu
- Large progress bar with percentage
- Task list for project (filtered)
- Metadata section (description, dates, color, icon)
- Actions: edit, archive, delete
- Framer Motion animations for drawer and interactions

**Props:**
```typescript
interface ProjectDetailProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}
```

**Edit Mode Features:**
- Inline editing with save/cancel buttons
- Emoji picker with presets
- Color picker with 8 preset colors
- Title and description editing
- Target date picker
- Automatic save with notifications

**Sections:**
1. **Header:** Icon, title, status dropdown, close button
2. **Progress:** Large progress bar with task count
3. **Description:** Editable description field
4. **Metadata:** Target date, started date, completed date (if applicable)
5. **Tasks:** List of tasks linked to this project
6. **Actions:** Edit, archive/delete buttons

#### `ProjectList.tsx`

**Location:** `src/modules/atlas/components/ProjectList.tsx`

**Features:**
- Responsive grid layout (1/2/3 columns)
- Status filters (all, active, on_hold, completed, archived)
- Sorting options (date, progress, name) with asc/desc toggle
- "New Project" button with modal
- Empty state with illustration
- Create project modal with full form
- Project detail drawer integration

**Props:**
```typescript
interface ProjectListProps {
  connectionSpaceId?: string; // Optional filter by connection space
}
```

**Filter Options:**
- All Projects
- Active Projects
- On Hold Projects
- Completed Projects
- Archived Projects

**Sort Options:**
- By Date (created_at)
- By Progress (completion percentage)
- By Name (alphabetical)

**Create Project Modal:**
- Icon picker (12 preset emojis)
- Color picker (8 preset colors)
- Title input (required)
- Description textarea
- Target date picker
- Initial status selector
- Create/Cancel buttons

**Empty States:**
- Different messages based on active filter
- Call-to-action button to create first project
- Animated illustration

## Design System Integration

All components use the Ceramic Design System:

### Classes Used:
- `ceramic-card` - Elevated card surfaces
- `ceramic-tray` - Recessed tray areas
- `ceramic-concave` - Pressed/active state
- `ceramic-inset` - Inset areas (progress bars)
- `text-etched` - Etched text effect
- `ceramic-accent` - Accent color (blue)
- `ceramic-text-primary` - Primary text color
- `ceramic-text-secondary` - Secondary text color
- `ceramic-text-tertiary` - Tertiary text color

### Color Scheme:
- **Active Projects:** Green (#10B981)
- **On Hold Projects:** Yellow (#F59E0B)
- **Completed Projects:** Blue (#3B82F6)
- **Archived Projects:** Gray (#6B7280)

### Progress Bars:
- Uses linear gradient based on project color
- Smooth animation on load (0.6s ease-out)
- Height: 12px (large) in detail view, 8px in cards

## Database Integration

### Tables Used:

#### `task_projects`
```sql
- id: uuid (PK)
- user_id: uuid (FK to profiles)
- title: text (required, max 200 chars)
- description: text (optional, max 2000 chars)
- connection_space_id: uuid (FK to connection_spaces, optional)
- status: enum ('active', 'completed', 'archived', 'on_hold')
- color: text (hex color, default '#3B82F6')
- icon: text (emoji, default '📋')
- target_date: timestamp (optional)
- started_at: timestamp (required)
- completed_at: timestamp (set when status = 'completed')
- created_at: timestamp
- updated_at: timestamp
```

#### `work_items` (tasks)
```sql
- project_id: uuid (FK to task_projects, added in this workstream)
- ... (other existing columns)
```

#### `project_progress` (view)
```sql
SELECT
  p.*,
  COUNT(w.id) as total_tasks,
  COUNT(CASE WHEN w.is_completed = true THEN 1 END) as completed_tasks,
  ROUND(
    (COUNT(CASE WHEN w.is_completed = true THEN 1 END)::float /
     NULLIF(COUNT(w.id), 0) * 100),
    0
  ) as progress_percentage
FROM task_projects p
LEFT JOIN work_items w ON w.project_id = p.id AND w.archived = false
GROUP BY p.id
```

## Usage Examples

### Basic Project List
```tsx
import { ProjectList } from '@/modules/atlas/components';

function AtlasPage() {
  return (
    <div>
      <h1>Atlas - Projetos</h1>
      <ProjectList />
    </div>
  );
}
```

### Filtered by Connection Space
```tsx
import { ProjectList } from '@/modules/atlas/components';

function VenturesProjectsTab({ spaceId }: { spaceId: string }) {
  return <ProjectList connectionSpaceId={spaceId} />;
}
```

### Custom Project Management
```tsx
import { useProjects, ProjectCard } from '@/modules/atlas';

function CustomProjectView() {
  const { projects, loading, createProject } = useProjects({ status: 'active' });

  const handleCreate = async () => {
    await createProject({
      title: 'My New Project',
      color: '#10B981',
      icon: '🚀',
      status: 'active'
    });
  };

  return (
    <div>
      <button onClick={handleCreate}>Create Project</button>
      <div className="grid grid-cols-3 gap-4">
        {projects.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
```

### Single Project Detail
```tsx
import { useProject } from '@/modules/atlas/hooks';

function ProjectPage({ projectId }: { projectId: string }) {
  const { project, tasks, loading, updateProject } = useProject(projectId);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{project?.title}</h1>
      <p>{project?.total_tasks} tasks</p>
      <p>{project?.progress_percentage}% complete</p>
    </div>
  );
}
```

## File Structure

```
src/modules/atlas/
├── services/
│   ├── atlasService.ts          (existing)
│   ├── projectService.ts        ✨ NEW
│   └── index.ts                 ✨ NEW (exports)
├── hooks/
│   ├── useAtlasTasks.ts         (existing)
│   ├── useTaskCategorization.ts (existing)
│   ├── useConnectionTasks.ts    (existing)
│   ├── useProjects.ts           ✨ NEW
│   └── index.ts                 ✨ NEW (exports)
├── components/
│   ├── TaskList.tsx             (existing)
│   ├── TaskCreationInput.tsx    (existing)
│   ├── CategorySuggestion.tsx   (existing)
│   ├── ProjectCard.tsx          ✨ NEW
│   ├── ProjectDetail.tsx        ✨ NEW
│   ├── ProjectList.tsx          ✨ NEW
│   └── index.ts                 ✨ NEW (exports)
└── types/
    └── plane.ts                 (existing)
```

## Error Handling

All components and hooks include comprehensive error handling:

### Service Layer Errors:
- `ProjectValidationError` - Invalid input (title too long, invalid date, etc.)
- `ProjectAuthenticationError` - User not authenticated
- `ProjectDatabaseError` - Database/Supabase errors

### User Notifications:
All hooks automatically show toast notifications via `notificationService`:
- Success notifications on create/update/delete
- Error notifications with specific messages
- Optimistic UI updates with rollback on error

### Example Error Flow:
```typescript
try {
  await createProject({ title: '' }); // Validation error
} catch (error) {
  if (error instanceof ProjectValidationError) {
    // Show: "O título do projeto é obrigatório"
  }
}
```

## Performance Optimizations

1. **Optimistic Updates:** UI updates immediately, then syncs with server
2. **Memoized Callbacks:** All hooks use `useCallback` to prevent re-renders
3. **Conditional Fetching:** Only fetch when user is authenticated and IDs are present
4. **Progress Bar Caching:** Uses database view for efficient progress calculation
5. **Framer Motion Layout:** Smooth animations without layout thrashing

## Accessibility

- Semantic HTML structure
- Keyboard navigation support
- ARIA labels where needed
- Focus management in modals
- Color contrast compliance
- Screen reader friendly

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive
- Touch-friendly interactions
- Smooth animations on all devices

## Next Steps

### Integration Points:
1. Add ProjectList to Atlas main page
2. Integrate with ConnectionSpaces (Ventures, Habitat, etc.)
3. Add project selector when creating tasks
4. Show project badge on task cards
5. Add project filter to main TaskList

### Future Enhancements:
1. Project templates
2. Project duplication
3. Project sharing/collaboration
4. Project tags/labels
5. Advanced filtering (by date range, by progress %)
6. Kanban view for projects
7. Calendar integration
8. Project analytics/insights

## Testing Checklist

- [ ] Create project with all fields
- [ ] Create project with only required fields
- [ ] Update project details
- [ ] Change project status
- [ ] Archive project
- [ ] Filter projects by status
- [ ] Sort projects by date/progress/name
- [ ] Open project detail drawer
- [ ] Edit project in drawer
- [ ] View project tasks
- [ ] Handle empty states
- [ ] Handle loading states
- [ ] Handle error states
- [ ] Test on mobile devices
- [ ] Test keyboard navigation
- [ ] Test with different project colors
- [ ] Test with different icons
- [ ] Test date overdue/approaching logic
- [ ] Test progress bar animations

## Dependencies

All dependencies are already in the project:
- React 18+
- Framer Motion (animations)
- Lucide React (icons)
- Supabase Client (database)
- Existing notification service
- Existing auth hooks

## Notes

- Database schema (`task_projects` table and `project_progress` view) is being created in parallel
- The `project_id` column in `work_items` table is required for task linking
- All components follow the existing Atlas module patterns
- Ceramic Design System classes are consistently applied
- All text is in Portuguese (BR)
- Colors and icons are customizable per project
- Soft delete (archive) is preferred over hard delete

---

**Implementation Status:** ✅ Complete

**Files Created:** 8
- projectService.ts (402 lines)
- useProjects.ts (437 lines)
- ProjectCard.tsx (171 lines)
- ProjectDetail.tsx (498 lines)
- ProjectList.tsx (494 lines)
- services/index.ts (export file)
- hooks/index.ts (export file)
- components/index.ts (export file)

**Total Lines of Code:** ~2000 lines

**Estimated Development Time:** 8-10 hours

**Ready for Integration:** Yes (pending database schema deployment)
