# Academia Archetype Guide

**Learning Journeys & Knowledge Management**

## Overview

The **Academia** archetype is your personal library for managing educational pursuits, learning journeys, and knowledge cultivation. Inspired by the "Cultivo da Mente" (Cultivation of the Mind) philosophy, Academia provides a typography-focused, thoughtful environment for tracking courses, organizing notes, and building connections between ideas.

### Purpose

- Track learning journeys (courses, books, certifications, mentorships)
- Build a personal knowledge base with Zettelkasten methodology
- Manage mentorship relationships
- Store academic credentials and achievements
- Connect ideas and synthesize knowledge

### Design Philosophy

Academia embodies a **library aesthetic** - calm, focused, and intellectually stimulating. Think of it as your personal study with shelves of well-organized knowledge.

**Color Scheme:**
- Primary: Midnight blue (#1e3a8a, #3b82f6) for depth and focus
- Secondary: Gold (#eab308, #fbbf24) for highlights and achievements
- Backgrounds: Cool grays with subtle blue tints
- Accents: Book-inspired colors (leather brown, parchment cream)

**Visual Elements:**
- Typography-first design with serif accents
- Lots of whitespace for readability
- Book and note-inspired card designs
- Connection lines for linked notes
- Progress bars for learning journeys
- Emoji-based academic icons (📚, 📝, 🎓, 👨‍🏫)

---

## Database Schema

### Tables

#### 1. academia_journeys
Learning journeys (courses, books, certifications, workshops).

```sql
id                    UUID PRIMARY KEY
space_id              UUID (connection space reference)

-- Journey information
title                 TEXT NOT NULL
description           TEXT
provider              TEXT (Coursera, Udemy, University, Self-study, etc.)
instructor            TEXT
journey_type          TEXT (course, book, certification, mentorship, workshop)

-- Progress tracking
total_modules         INTEGER
completed_modules     INTEGER (default 0)
progress_pct          INTEGER (0-100)

-- Timeline
started_at            TIMESTAMPTZ
target_completion_date DATE
completed_at          TIMESTAMPTZ

-- Time tracking
estimated_hours       INTEGER
logged_hours          INTEGER (default 0)

-- Resources
url                   TEXT
materials_notes       TEXT

-- Status
status                TEXT (planned, active, paused, completed, abandoned)

created_at, updated_at TIMESTAMPTZ
```

**Journey Types:**
- course: Online or in-person course
- book: Reading and studying a book
- certification: Professional certification program
- mentorship: One-on-one learning relationship
- workshop: Short-term intensive learning

**Status:**
- planned: Not yet started, on the roadmap
- active: Currently learning
- paused: Temporarily stopped
- completed: Successfully finished
- abandoned: Discontinued without completion

#### 2. academia_notes
Knowledge notes using Zettelkasten methodology.

```sql
id                    UUID PRIMARY KEY
space_id              UUID (connection space reference)
journey_id            UUID (optional - link to journey)

-- Note content
title                 TEXT NOT NULL
content               TEXT NOT NULL
content_type          TEXT (default 'markdown')

-- Zettelkasten classification
note_type             TEXT (fleeting, literature, permanent)

-- Source and links
source_reference      TEXT
linked_note_ids       UUID[] (array of connected notes)

-- Categorization
tags                  TEXT[]

-- AI-enhanced metadata
ai_summary            TEXT
ai_key_concepts       TEXT[]

created_at, updated_at TIMESTAMPTZ
```

**Note Types (Zettelkasten):**
- **fleeting**: Quick thoughts, temporary notes, inbox items
- **literature**: Notes from sources (books, articles, courses)
- **permanent**: Synthesized knowledge, original insights, evergreen content

**Linking Notes:**
- Use linked_note_ids to create connections between ideas
- Build a personal knowledge graph
- Enables serendipitous discovery

#### 3. academia_mentorships
Mentorship relationships and sessions.

```sql
id                    UUID PRIMARY KEY
space_id              UUID (connection space reference)
journey_id            UUID (optional - link to journey)

-- Mentor information
mentor_name           TEXT NOT NULL
mentor_role           TEXT
mentor_organization   TEXT
mentor_email          TEXT
mentor_linkedin       TEXT

-- Relationship
mentorship_type       TEXT (formal, informal, peer)
relationship_status   TEXT (active, paused, completed)

-- Frequency
meeting_frequency     TEXT (weekly, biweekly, monthly, ad_hoc)
next_session_at       TIMESTAMPTZ

-- Focus
focus_areas           TEXT[]
goals                 TEXT

-- Session tracking
total_sessions        INTEGER (default 0)
last_session_at       TIMESTAMPTZ
session_notes         TEXT

-- Timeline
started_at            DATE
ended_at              DATE

created_at, updated_at TIMESTAMPTZ
```

**Mentorship Types:**
- formal: Structured program with defined goals
- informal: Casual advisory relationship
- peer: Mutual learning with peer

#### 4. academia_credentials
Academic credentials and achievements.

```sql
id                    UUID PRIMARY KEY
space_id              UUID (connection space reference)
journey_id            UUID (optional - link to journey)

-- Credential information
credential_name       TEXT NOT NULL
credential_type       TEXT (degree, certificate, certification, award, publication)
issuing_organization  TEXT NOT NULL

-- Details
field_of_study        TEXT
grade_or_score        TEXT
description           TEXT

-- Dates
issue_date            DATE
expiration_date       DATE (for certifications that expire)

-- Verification
credential_id         TEXT
credential_url        TEXT
verification_url      TEXT

-- Status
is_verified           BOOLEAN (default FALSE)
is_active             BOOLEAN (default TRUE)

created_at, updated_at TIMESTAMPTZ
```

**Credential Types:**
- degree: Bachelor's, Master's, PhD
- certificate: Course completion certificate
- certification: Professional certification (AWS, PMP, etc.)
- award: Academic honors and awards
- publication: Published papers, articles

---

## Components

### AcademiaDashboard
**Path:** `src/modules/connections/academia/components/AcademiaDashboard.tsx`

Main dashboard for learning overview.

**Features:**
- Active journeys with progress bars
- Recent notes preview
- Active mentorships
- Upcoming sessions
- Credentials showcase
- Learning statistics (total hours, completion rate)
- Empty states

**Props:**
```tsx
{
  spaceId: string;
}
```

### JourneyProgress
**Path:** `src/modules/connections/academia/components/JourneyProgress.tsx`

Visual progress tracker for learning journeys.

**Features:**
- Progress bar with percentage
- Module completion (e.g., "8 / 12 modules")
- Time tracking (logged hours vs estimated)
- Status badge (active, paused, completed)
- Target completion date countdown
- Click to view details

**Props:**
```tsx
{
  journey: AcademiaJourney;
  onJourneyClick?: () => void;
}
```

### NoteEditor
**Path:** `src/modules/connections/academia/components/NoteEditor.tsx`

Rich note editing with Zettelkasten features.

**Features:**
- Markdown editor
- Note type selector (fleeting, literature, permanent)
- Tag input
- Source reference field
- Link to other notes (autocomplete)
- AI-generated summary
- Preview mode
- Save/cancel controls

**Props:**
```tsx
{
  note?: AcademiaNote;
  spaceId: string;
  journeyId?: string;
  onSave: (note: AcademiaNote) => void;
  onCancel: () => void;
}
```

### NoteCard
**Path:** `src/modules/connections/academia/components/NoteCard.tsx`

Compact note display card.

**Features:**
- Title and excerpt
- Note type badge
- Tags display
- Connected notes count
- Last updated timestamp
- Click handler

**Props:**
```tsx
{
  note: AcademiaNote;
  onClick?: () => void;
}
```

### NoteGraph
**Path:** `src/modules/connections/academia/components/NoteGraph.tsx`

Visual graph of connected notes.

**Features:**
- Node-link diagram
- Color-coded by note_type
- Interactive zoom and pan
- Click node to view note
- Highlight connected notes on hover

**Props:**
```tsx
{
  notes: AcademiaNote[];
  onNoteClick?: (note: AcademiaNote) => void;
}
```

### MentorshipCard
**Path:** `src/modules/connections/academia/components/MentorshipCard.tsx`

Mentorship relationship display.

**Features:**
- Mentor name and role
- Organization and LinkedIn link
- Next session countdown
- Total sessions count
- Focus areas tags
- Status indicator
- Click-to-email

**Props:**
```tsx
{
  mentorship: AcademiaMentorship;
  onClick?: () => void;
}
```

### CredentialBadge
**Path:** `src/modules/connections/academia/components/CredentialBadge.tsx`

Display academic credential as badge.

**Features:**
- Credential name and type
- Issuing organization
- Issue date
- Verification status icon
- Click to view certificate
- Expiration warning (if applicable)

**Props:**
```tsx
{
  credential: AcademiaCredential;
  onClick?: () => void;
}
```

---

## Views

### AcademiaHome
**Path:** `src/modules/connections/academia/views/AcademiaHome.tsx`

Main entry point for Academia archetype.

**Route:** `/connections/academia/:spaceId`

**Features:**
- Dashboard overview
- Quick stats (active journeys, total notes, credentials)
- Loading and error states
- Empty state for new learners

### JourneyDetail
**Path:** `src/modules/connections/academia/views/JourneyDetail.tsx`

Detailed view of a learning journey.

**Route:** `/connections/academia/:spaceId/journey/:journeyId`

**Features:**
- Full journey information
- Progress tracking
- Time logging interface
- Module checklist
- Related notes
- Edit controls
- Complete/pause/abandon actions

### NotesLibrary
**Path:** `src/modules/connections/academia/views/NotesLibrary.tsx`

Full notes management interface.

**Route:** `/connections/academia/:spaceId/notes`

**Features:**
- Note type filter (fleeting, literature, permanent)
- Tag filter
- Search by title and content
- Sort options (recent, oldest, alphabetical)
- Grid or list view toggle
- Create new note button
- Note graph view toggle

### NoteDetail
**Path:** `src/modules/connections/academia/views/NoteDetail.tsx`

Detailed view and editing of a single note.

**Route:** `/connections/academia/:spaceId/note/:noteId`

**Features:**
- Full note content display
- Markdown rendering
- Edit mode toggle
- Connected notes section
- Backlinks (notes that link to this one)
- AI summary display
- Delete confirmation

### MentorshipsView
**Path:** `src/modules/connections/academia/views/MentorshipsView.tsx`

Manage mentorship relationships.

**Route:** `/connections/academia/:spaceId/mentorships`

**Features:**
- Active mentorships list
- Past mentorships archive
- Next session calendar
- Add new mentor button
- Session notes history
- Contact quick actions

### CredentialsView
**Path:** `src/modules/connections/academia/views/CredentialsView.tsx`

Showcase academic achievements.

**Route:** `/connections/academia/:spaceId/credentials`

**Features:**
- Credentials showcase grid
- Filter by type (degree, certificate, etc.)
- Sort by issue date
- Verified badge display
- Add credential button
- Public profile toggle (future)

---

## Services & Hooks

### Services
Located in `src/modules/connections/academia/services/`

**journeyService.ts**
- `getJourneysBySpace(spaceId)` - Get all journeys
- `getJourneyById(journeyId)` - Get single journey
- `createJourney(payload)` - Create new journey
- `updateJourney(journeyId, payload)` - Update journey
- `deleteJourney(journeyId)` - Delete journey
- `updateProgress(journeyId, completedModules)` - Update progress
- `completeJourney(journeyId)` - Mark as completed
- `logHours(journeyId, hours)` - Add logged hours

**noteService.ts**
- `getNotesBySpace(spaceId)` - Get all notes
- `getNoteById(noteId)` - Get single note
- `createNote(payload)` - Create new note
- `updateNote(noteId, payload)` - Update note
- `deleteNote(noteId)` - Delete note
- `linkNotes(noteId, linkedNoteId)` - Create connection
- `unlinkNotes(noteId, linkedNoteId)` - Remove connection
- `getBacklinks(noteId)` - Find notes linking to this one
- `searchNotes(spaceId, query)` - Full-text search
- `generateAISummary(noteId)` - AI summarization

**mentorshipService.ts**
- `getMentorshipsBySpace(spaceId)` - Get all mentorships
- `createMentorship(payload)` - Add mentor
- `updateMentorship(mentorshipId, payload)` - Update relationship
- `deleteMentorship(mentorshipId)` - Remove mentor
- `logSession(mentorshipId, notes)` - Record session
- `scheduleNextSession(mentorshipId, date)` - Schedule meeting

**credentialService.ts**
- `getCredentialsBySpace(spaceId)` - Get all credentials
- `createCredential(payload)` - Add credential
- `updateCredential(credentialId, payload)` - Update credential
- `deleteCredential(credentialId)` - Remove credential
- `verifyCredential(credentialId)` - Mark as verified

### Hooks
Located in `src/modules/connections/academia/hooks/`

**useJourneys.ts**
```tsx
const {
  journeys,
  activeJourneys,
  completedJourneys,
  loading,
  error,
  createJourney,
  updateJourney,
  completeJourney,
  logHours
} = useJourneys(spaceId);
```

**useNotes.ts**
```tsx
const {
  notes,
  loading,
  error,
  createNote,
  updateNote,
  deleteNote,
  linkNotes,
  unlinkNotes,
  searchNotes,
  getBacklinks
} = useNotes(spaceId);
```

**useMentorships.ts**
```tsx
const {
  mentorships,
  activeMentorships,
  loading,
  error,
  createMentorship,
  updateMentorship,
  logSession,
  scheduleNextSession
} = useMentorships(spaceId);
```

**useCredentials.ts**
```tsx
const {
  credentials,
  loading,
  error,
  createCredential,
  updateCredential,
  deleteCredential
} = useCredentials(spaceId);
```

---

## Setup Instructions

### 1. Run Database Migration

```bash
# Apply the Academia migration
supabase migration up 20251214300000_connection_academia

# Verify tables were created
supabase db tables list | grep academia
```

### 2. Create Your Academia Space

```tsx
import { supabase } from '@/lib/supabase';

// Create connection space for learning
const { data: space } = await supabase
  .from('connection_spaces')
  .insert({
    user_id: currentUserId,
    archetype: 'academia',
    name: 'Minha Jornada de Aprendizado',
    subtitle: 'Conhecimento e Crescimento',
    icon: '📚',
    color_theme: 'midnight-blue'
  })
  .select()
  .single();
```

### 3. Add Your First Journey

```tsx
import { journeyService } from '@/modules/connections/academia';

const journey = await journeyService.createJourney({
  space_id: space.id,
  title: 'Machine Learning Specialization',
  provider: 'Coursera',
  instructor: 'Andrew Ng',
  journey_type: 'course',
  total_modules: 12,
  estimated_hours: 60,
  started_at: new Date(),
  target_completion_date: addMonths(new Date(), 3),
  url: 'https://www.coursera.org/specializations/machine-learning',
  status: 'active'
});
```

### 4. Take Notes

```tsx
import { noteService } from '@/modules/connections/academia';

// Create literature note from course
const literatureNote = await noteService.createNote({
  space_id: space.id,
  journey_id: journey.id,
  title: 'Gradient Descent Algorithm',
  content: `# Gradient Descent

  Optimization algorithm for minimizing cost function...

  Key concepts:
  - Learning rate (alpha)
  - Convergence
  - Local minima`,
  note_type: 'literature',
  source_reference: 'ML Specialization - Week 1',
  tags: ['machine-learning', 'optimization', 'algorithms']
});

// Create permanent note (synthesis)
const permanentNote = await noteService.createNote({
  space_id: space.id,
  title: 'When to Use Gradient Descent vs Adam',
  content: `Based on my learning from multiple courses...`,
  note_type: 'permanent',
  tags: ['machine-learning', 'synthesis'],
  linked_note_ids: [literatureNote.id]
});
```

---

## Example Workflows

### Workflow 1: Complete a Course

**Goal:** Track progress through an online course from start to finish.

**Steps:**

1. **Create Journey**
   ```tsx
   const course = await journeyService.createJourney({
     space_id: spaceId,
     title: 'Full-Stack Web Development',
     provider: 'Udemy',
     journey_type: 'course',
     total_modules: 20,
     estimated_hours: 40,
     started_at: new Date(),
     target_completion_date: addWeeks(new Date(), 8),
     status: 'active'
   });
   ```

2. **Update Progress Regularly**
   ```tsx
   // After completing each module
   await journeyService.updateProgress(course.id, completedModules + 1);

   // Log study hours
   await journeyService.logHours(course.id, 2); // 2 hours today
   ```

3. **Take Notes During Learning**
   ```tsx
   await noteService.createNote({
     space_id: spaceId,
     journey_id: course.id,
     title: 'React Hooks Best Practices',
     content: '...',
     note_type: 'literature',
     tags: ['react', 'hooks']
   });
   ```

4. **Complete Journey**
   ```tsx
   await journeyService.completeJourney(course.id);
   ```

5. **Add Certificate**
   ```tsx
   await credentialService.createCredential({
     space_id: spaceId,
     journey_id: course.id,
     credential_name: 'Full-Stack Web Development Certificate',
     credential_type: 'certificate',
     issuing_organization: 'Udemy',
     issue_date: new Date(),
     credential_url: 'https://udemy.com/certificate/ABC123'
   });
   ```

### Workflow 2: Build a Personal Knowledge Base

**Goal:** Create a connected web of knowledge using Zettelkasten.

**Steps:**

1. **Capture Fleeting Notes**
   ```tsx
   // Quick thoughts throughout the day
   await noteService.createNote({
     space_id: spaceId,
     title: 'Idea: Microservices for user auth',
     content: 'Could separate auth into its own service...',
     note_type: 'fleeting',
     tags: ['idea', 'architecture']
   });
   ```

2. **Process Into Literature Notes**
   ```tsx
   // After reading article
   await noteService.createNote({
     space_id: spaceId,
     title: 'Microservices Trade-offs (Martin Fowler)',
     content: 'Key points from article:\n- Complexity...',
     note_type: 'literature',
     source_reference: 'https://martinfowler.com/articles/microservices',
     tags: ['architecture', 'microservices']
   });
   ```

3. **Synthesize Permanent Notes**
   ```tsx
   const permanentNote = await noteService.createNote({
     space_id: spaceId,
     title: 'My Framework for Choosing Architecture',
     content: 'Based on my experience and reading...',
     note_type: 'permanent',
     tags: ['architecture', 'framework', 'synthesis'],
     linked_note_ids: [
       fleetingNoteId,
       literatureNoteId1,
       literatureNoteId2
     ]
   });
   ```

4. **Discover Connections**
   ```tsx
   // Find what links to this note
   const backlinks = await noteService.getBacklinks(permanentNote.id);

   // Visualize note graph
   <NoteGraph notes={allNotes} onNoteClick={handleNoteClick} />
   ```

### Workflow 3: Mentorship Management

**Goal:** Track and nurture mentorship relationships.

**Steps:**

1. **Add Mentor**
   ```tsx
   const mentorship = await mentorshipService.createMentorship({
     space_id: spaceId,
     mentor_name: 'Dr. Ana Silva',
     mentor_role: 'Senior Data Scientist',
     mentor_organization: 'Tech Corp',
     mentor_email: 'ana.silva@techcorp.com',
     mentorship_type: 'formal',
     relationship_status: 'active',
     meeting_frequency: 'monthly',
     focus_areas: ['machine-learning', 'career-growth'],
     goals: 'Transition into ML engineering role',
     started_at: new Date()
   });
   ```

2. **Schedule Sessions**
   ```tsx
   await mentorshipService.scheduleNextSession(
     mentorship.id,
     addWeeks(new Date(), 2)
   );
   ```

3. **Log Session Notes**
   ```tsx
   await mentorshipService.logSession(mentorship.id, `
     # Session Notes - ${new Date().toLocaleDateString()}

     ## Topics Discussed
     - Portfolio projects
     - ML certifications to pursue
     - Networking strategies

     ## Action Items
     - [ ] Complete Coursera ML course
     - [ ] Build personal ML project
     - [ ] Attend local ML meetup

     ## Next Session
     - Review project progress
     - Discuss interview preparation
   `);
   ```

4. **Create Journey Based on Mentor Advice**
   ```tsx
   await journeyService.createJourney({
     space_id: spaceId,
     title: 'Build ML Recommendation System',
     journey_type: 'project',
     description: 'Personal project recommended by mentor',
     estimated_hours: 80,
     status: 'active'
   });
   ```

### Workflow 4: Reading and Note-Taking

**Goal:** Read a technical book and extract knowledge.

**Steps:**

1. **Create Book Journey**
   ```tsx
   const book = await journeyService.createJourney({
     space_id: spaceId,
     title: 'Designing Data-Intensive Applications',
     journey_type: 'book',
     instructor: 'Martin Kleppmann',
     total_modules: 12, // chapters
     estimated_hours: 30,
     started_at: new Date(),
     status: 'active'
   });
   ```

2. **Take Chapter Notes**
   ```tsx
   // After each chapter
   await noteService.createNote({
     space_id: spaceId,
     journey_id: book.id,
     title: 'Chapter 5: Replication',
     content: `
       # Replication

       ## Single-leader replication
       - Write to leader
       - Read from followers
       - Challenges: async lag

       ## Multi-leader replication
       - Multiple write points
       - Conflict resolution needed

       ## Leaderless replication
       - Quorum-based
       - Used in Cassandra, Dynamo
     `,
     note_type: 'literature',
     source_reference: 'DDIA - Chapter 5',
     tags: ['databases', 'replication', 'distributed-systems']
   });

   // Update progress
   await journeyService.updateProgress(book.id, 5);
   ```

3. **Create Synthesis Notes**
   ```tsx
   // After finishing book
   await noteService.createNote({
     space_id: spaceId,
     title: 'My Mental Model of Database Trade-offs',
     content: `
       # Database Selection Framework

       Based on DDIA and practical experience...

       When to use:
       - Single-leader: Consistency critical, moderate scale
       - Multi-leader: Global distribution, some conflict tolerance
       - Leaderless: High availability, eventual consistency OK
     `,
     note_type: 'permanent',
     tags: ['databases', 'framework', 'decision-making'],
     linked_note_ids: [chapterNotesIds]
   });
   ```

---

## Best Practices

### Learning Journey Management

1. **Set Realistic Goals**
   - Estimate hours conservatively (usually 1.5x what you think)
   - Set target_completion_date based on weekly available time
   - Break large journeys into smaller milestones

2. **Track Progress Consistently**
   - Update completed_modules after each session
   - Log hours immediately after studying
   - Review progress weekly

3. **Status Transitions**
   - Use 'paused' when temporarily stopping (not abandoned)
   - Don't abandon lightly - analyze why
   - Complete journeys even if imperfect

### Note-Taking Strategy

1. **Zettelkasten Method**
   - **Fleeting notes:** Capture everything, process later
   - **Literature notes:** One note per source, in your own words
   - **Permanent notes:** Original insights, synthesis, frameworks

2. **Linking Notes**
   - Link liberally - more connections = better
   - Use bidirectional links
   - Review backlinks regularly
   - Create hub notes for major topics

3. **Tagging**
   - Use hierarchical tags: 'programming/javascript/react'
   - Keep tags consistent
   - Don't over-tag (5-7 tags max per note)

### Mentorship

1. **Meeting Cadence**
   - Monthly is typical for formal mentorships
   - Bi-weekly for intensive periods
   - Schedule next session before ending current one

2. **Session Preparation**
   - Prepare topics/questions in advance
   - Review previous session notes
   - Track action items

3. **Give Back**
   - Offer to help mentor with their projects
   - Share relevant articles/resources
   - Consider peer mentorship

---

## Integration Points

### Connection Events
Sync study sessions to calendar:

```tsx
// Create recurring study block
await eventService.createEvent({
  space_id: spaceId,
  title: `Study: ${journey.title}`,
  starts_at: nextStudySession,
  ends_at: addHours(nextStudySession, 2),
  recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
  event_type: 'study'
});
```

### Connection Documents
Store course materials:

```tsx
// Upload lecture slides
await documentService.uploadDocument({
  space_id: spaceId,
  file_name: 'Week 1 Slides.pdf',
  category: 'course-materials',
  tags: [journey.title]
});
```

---

## Troubleshooting

### Issue: Progress percentage not updating

**Solution:**
```tsx
// Ensure both total_modules and completed_modules are set
const progress = Math.floor(
  (completedModules / totalModules) * 100
);

await journeyService.updateJourney(journeyId, {
  completed_modules: completedModules,
  progress_pct: progress
});
```

### Issue: Can't find notes by tag

**Solution:**
- Verify tags are lowercase and kebab-case
- Use searchNotes with tag filter
- Check that tags array is not empty

### Issue: Note links not showing

**Solution:**
- Ensure linked_note_ids contains valid UUIDs
- Check that linked notes exist and are accessible
- Use array append syntax in PostgreSQL

---

## Additional Resources

- **Database Schema:** `supabase/migrations/20251214300000_connection_academia.sql`
- **Type Definitions:** `src/modules/connections/academia/types.ts`
- **Base Connection Schema:** `docs/CONNECTION_ARCHETYPES_README.md`
- **Zettelkasten Method:** https://zettelkasten.de/introduction/

---

**Last Updated:** December 14, 2025
**Version:** 1.0.0
**Status:** Production Ready
