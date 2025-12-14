# Academia Archetype - Complete Implementation

> The Library of Learning - Temple of intellectual growth and knowledge curation.

## Philosophy

**"Cultivo da Mente"** (Cultivation of the Mind)

The Academia archetype embodies the silent, focused atmosphere of a library. Knowledge is curated and absorbed, not merely consumed. Every element is designed to inspire learning and intellectual growth through elegant typography, generous whitespace, and a paper-like aesthetic.

## Architecture Overview

```
src/modules/connections/academia/
├── types.ts                    # TypeScript interfaces and types
├── services/                   # Data layer (Supabase interactions)
│   ├── journeyService.ts       # Learning journeys CRUD
│   ├── noteService.ts          # Zettelkasten notes CRUD
│   ├── mentorshipService.ts    # Mentorship relationships CRUD
│   ├── credentialService.ts    # Credentials CRUD
│   └── index.ts               # Service exports
├── hooks/                      # React hooks
│   ├── useJourneys.ts         # Journey management
│   ├── useNotes.ts            # Note management
│   ├── useMentorships.ts      # Mentorship management
│   ├── useCredentials.ts      # Credential management
│   └── index.ts               # Hook exports
├── components/                 # Reusable UI components
│   ├── AcademiaDashboard.tsx  # Main dashboard
│   ├── JourneyCard.tsx        # Journey display card
│   ├── JourneyProgress.tsx    # Progress tracking
│   ├── NoteEditor.tsx         # Markdown note editor
│   ├── NoteGraph.tsx          # Zettelkasten visualization
│   ├── MentorshipCard.tsx     # Mentorship display
│   ├── CredentialCard.tsx     # Credential display
│   ├── KnowledgeSearch.tsx    # Full-text note search
│   └── index.ts               # Component exports
├── views/                      # Full page views
│   ├── AcademiaHome.tsx       # Main entry point
│   ├── JourneyDetail.tsx      # Journey detail view
│   ├── NotesView.tsx          # Notes browser
│   ├── MentorshipsView.tsx    # Mentorship management
│   ├── PortfolioView.tsx      # Credentials showcase
│   └── index.ts               # View exports
└── index.ts                    # Main module export
```

## Database Schema

Migration: `supabase/migrations/20251214300000_connection_academia.sql`

### Tables

1. **academia_journeys** - Learning paths (courses, books, certifications)
   - Progress tracking (modules, percentage)
   - Time logging (estimated vs. actual hours)
   - Status management (planned, active, paused, completed, abandoned)

2. **academia_notes** - Zettelkasten knowledge management
   - Three note types: fleeting, literature, permanent
   - Bidirectional linking between notes
   - Tag-based categorization
   - AI-enhanced summaries and key concepts

3. **academia_mentorships** - Mentorship relationships
   - Direction: giving (you mentor) or receiving (you are mentored)
   - Focus areas and objectives
   - Session scheduling and tracking

4. **academia_credentials** - Academic achievements
   - Certificates, diplomas, badges, publications, awards
   - Expiration tracking with warnings
   - Verification URLs

## Core Features

### 1. Learning Journeys

Track any learning path from start to completion:

```tsx
import { useJourneys } from '@/modules/connections/academia';

function MyComponent({ spaceId }) {
  const { journeys, createJourney, updateProgress } = useJourneys({ spaceId });

  const handleCreate = async () => {
    await createJourney({
      title: "React Mastery Course",
      journey_type: "course",
      provider: "Udemy",
      total_modules: 12,
      estimated_hours: 24
    });
  };

  const handleProgress = async (journeyId, completed) => {
    await updateProgress(journeyId, completed); // Auto-calculates percentage
  };
}
```

**Features:**
- Automatic progress calculation
- Time tracking and estimates
- Module checklist
- Auto-completion on 100%

### 2. Zettelkasten Notes

Build a connected knowledge base:

```tsx
import { useNotes } from '@/modules/connections/academia';

function NotesComponent({ spaceId }) {
  const { notes, createNote, linkNotes } = useNotes({ spaceId });

  const handleCreatePermanentNote = async () => {
    await createNote({
      title: "React Context vs Redux",
      content: "My synthesized understanding...",
      note_type: "permanent",
      linked_note_ids: [note1Id, note2Id], // Link to source notes
      tags: ["react", "state-management"]
    });
  };
}
```

**Note Types:**
- **Fleeting**: Quick thoughts and temporary ideas
- **Literature**: Notes from books, articles, courses
- **Permanent**: Synthesized knowledge in your own words

**Features:**
- Markdown support
- Bidirectional linking
- Tag-based organization
- Full-text search
- Graph visualization

### 3. Mentorships

Manage both sides of mentorship:

```tsx
import { useMentorships } from '@/modules/connections/academia';

function MentorshipComponent({ spaceId }) {
  const { mentorships, createMentorship } = useMentorships({ spaceId });

  const handleCreate = async () => {
    await createMentorship({
      relationship_type: "giving", // or "receiving"
      focus_areas: ["React", "TypeScript", "Architecture"],
      frequency: "weekly",
      duration_minutes: 60,
      objectives: [
        { title: "Master React hooks", completed: false }
      ]
    });
  };
}
```

**Features:**
- Session scheduling
- Objective tracking
- Focus area management
- Session history

### 4. Credentials Portfolio

Showcase achievements:

```tsx
import { useCredentials } from '@/modules/connections/academia';

function PortfolioComponent({ spaceId }) {
  const { credentials, createCredential } = useCredentials({ spaceId });

  const handleAdd = async () => {
    await createCredential({
      title: "AWS Solutions Architect",
      issuer: "Amazon Web Services",
      credential_type: "certification",
      issued_at: "2024-01-15",
      expires_at: "2027-01-15",
      credential_url: "https://...",
      credential_id: "ABC123"
    });
  };
}
```

**Features:**
- Expiration warnings
- Verification links
- Type-based organization
- Visual certificate display

## Design System

### Colors

```css
/* Primary palette: Warm neutrals */
--stone-50: #fafaf9
--stone-100: #f5f5f4
--stone-200: #e7e5e4
--stone-300: #d6d3d1
--stone-400: #a8a29e
--stone-500: #78716c
--stone-600: #57534e
--stone-700: #44403c
--stone-800: #292524
--stone-900: #1c1917

/* Accent: Emerald for growth */
--emerald-50: #ecfdf5
--emerald-600: #059669
--emerald-700: #047857
```

### Typography

```css
/* Headings: Light weight, tight tracking */
h1 { font-weight: 300; letter-spacing: -0.025em; }
h2 { font-weight: 300; letter-spacing: -0.025em; }

/* Body: Light weight, relaxed leading */
p { font-weight: 300; line-height: 1.75; }

/* Labels: Uppercase, wide tracking */
label { font-weight: 300; letter-spacing: 0.05em; text-transform: uppercase; }
```

### Card Style

```tsx
<div className="bg-white border border-stone-200 rounded-sm p-6 hover:shadow-md transition-all">
  {/* Paper-like card with subtle hover */}
</div>
```

### Design Principles

1. **Generous Whitespace** - Let content breathe
2. **Subtle Interactions** - Gentle hover effects, smooth transitions
3. **Typography Focus** - Let text be the hero
4. **Paper Aesthetic** - Light backgrounds, thin borders
5. **Minimal Color** - Neutrals with strategic accent use

## Usage Examples

### Complete Journey Workflow

```tsx
import {
  AcademiaDashboard,
  JourneyCard,
  JourneyProgress,
  NoteEditor
} from '@/modules/connections/academia';

function LearningJourneyPage({ spaceId }) {
  const [selectedJourney, setSelectedJourney] = useState(null);

  return (
    <div>
      {!selectedJourney ? (
        <AcademiaDashboard spaceId={spaceId} />
      ) : (
        <JourneyProgress
          journey={selectedJourney}
          onUpdateProgress={handleProgress}
          onLogTime={handleTimeLog}
        />
      )}
    </div>
  );
}
```

### Knowledge Base with Search and Graph

```tsx
import { KnowledgeSearch, NoteGraph } from '@/modules/connections/academia';

function KnowledgeBase({ spaceId }) {
  const { notes } = useNotes({ spaceId });
  const [view, setView] = useState('search');

  return (
    <div>
      <ViewToggle value={view} onChange={setView} />

      {view === 'search' ? (
        <KnowledgeSearch notes={notes} />
      ) : (
        <NoteGraph
          notes={notes}
          onNoteClick={handleNoteClick}
        />
      )}
    </div>
  );
}
```

### Mentorship Dashboard

```tsx
import { MentorshipCard } from '@/modules/connections/academia';

function MentorshipDashboard({ spaceId }) {
  const { mentorships } = useMentorships({ spaceId });

  const giving = mentorships.filter(m => m.relationship_type === 'giving');
  const receiving = mentorships.filter(m => m.relationship_type === 'receiving');

  return (
    <div>
      <section>
        <h2>Mentoring Others</h2>
        {giving.map(m => <MentorshipCard key={m.id} mentorship={m} />)}
      </section>

      <section>
        <h2>Learning From</h2>
        {receiving.map(m => <MentorshipCard key={m.id} mentorship={m} />)}
      </section>
    </div>
  );
}
```

## Integration Points

### With Other Archetypes

```tsx
// Link journey to Habitat project
await createJourney({
  title: "UI Design Course",
  metadata: {
    habitat_project_id: "project-123" // Custom connection
  }
});

// Link credential to Ventures company
await createCredential({
  title: "Business Analyst Certification",
  metadata: {
    ventures_company_id: "company-456"
  }
});
```

### With Calendar

Journey sessions and mentorship meetings can be synced to user's calendar via the connection_events table.

### With AI

Notes support AI-generated summaries and key concept extraction:

```tsx
await updateNote(noteId, {
  ai_summary: "Generated summary...",
  ai_key_concepts: ["concept1", "concept2"]
});
```

## Testing

### Service Tests

```tsx
import { journeyService } from '@/modules/connections/academia';

describe('journeyService', () => {
  it('should create a journey', async () => {
    const journey = await journeyService.createJourney(spaceId, {
      title: "Test Course",
      journey_type: "course"
    });

    expect(journey.progress_pct).toBe(0);
    expect(journey.status).toBe('planned');
  });

  it('should auto-complete on 100%', async () => {
    const journey = await journeyService.updateProgress(id, 10);

    expect(journey.progress_pct).toBe(100);
    expect(journey.status).toBe('completed');
    expect(journey.completed_at).toBeDefined();
  });
});
```

## Performance Considerations

1. **Indexes** - All foreign keys and commonly queried fields are indexed
2. **Pagination** - Implement for large note collections
3. **Search** - Uses PostgreSQL full-text search (GIN index)
4. **Graph** - Simple SVG for up to ~100 notes, consider D3.js for larger graphs

## Future Enhancements

1. **Advanced Graph Visualization** - Integrate D3.js or vis.js for force-directed layout
2. **Note Templates** - Pre-defined structures for different note types
3. **Spaced Repetition** - Flashcard system for permanent notes
4. **Export Options** - Export notes to Markdown, PDF, or Notion
5. **AI Assistant** - Suggest note links and generate summaries
6. **Session Recording** - Record and transcribe mentorship sessions
7. **Learning Path Recommendations** - AI-suggested journeys based on goals

## Migration Guide

To enable Academia archetype in an existing space:

```sql
-- Run the migration
psql -d your_database < supabase/migrations/20251214300000_connection_academia.sql

-- Verify tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'academia_%';
```

## Support

For questions or issues:
- See main Connections documentation
- Check Supabase RLS policies if access issues occur
- Review component source for prop documentation

---

**Created:** 2024-12-14
**Version:** 1.0.0
**Status:** Production Ready
