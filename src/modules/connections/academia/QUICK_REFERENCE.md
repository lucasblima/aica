# Academia Types - Quick Reference Card

## 🎯 Quick Import Guide

### Core Types (Always Available)
```typescript
import {
  // Main entities
  AcademiaJourney,      // Courses, certifications, books
  AcademiaNote,          // Zettelkasten notes
  AcademiaMentorship,    // Mentor relationships
  AcademiaCredential,    // Certificates, diplomas

  // Enums
  JourneyType,
  JourneyStatus,
  NoteType,
  MentorshipStatus,
  CredentialType,
} from '@/modules/connections/academia/types';
```

### Extended Types (Optional Features)
```typescript
import {
  // New entities
  AcademiaModule,              // Course sections
  AcademiaMaterial,            // PDFs, videos, articles
  AcademiaNoteLink,            // Knowledge graph links
  AcademiaMentorshipSession,   // Session tracking
  AcademiaGoal,                // Development goals

  // Enums
  MaterialType,
  ModuleStatus,
  SessionStatus,
  GoalCategory,
  GoalStatus,
} from '@/modules/connections/academia/types.extended';
```

## 📋 Type Quick Reference

### AcademiaJourney
```typescript
{
  id: string;
  space_id: string;
  title: string;
  journey_type: 'course' | 'book' | 'certification' | 'mentorship' | 'workshop';
  status: 'planned' | 'active' | 'paused' | 'completed' | 'abandoned';
  progress_pct: number;
  total_modules?: number;
  completed_modules: number;
  started_at?: string;
  completed_at?: string;
}
```

### AcademiaModule ⭐ NEW
```typescript
{
  id: string;
  journey_id: string;  // → AcademiaJourney.id
  name: string;
  order: number;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  duration_minutes?: number;
}
```

### AcademiaMaterial ⭐ NEW
```typescript
{
  id: string;
  space_id: string;
  journey_id?: string;  // Optional link to journey
  name: string;
  type: 'pdf' | 'video' | 'article' | 'book' | 'podcast' | 'other';
  read_status: 'unread' | 'reading' | 'read';
  rating?: number;  // 1-5
  url?: string;
  file_path?: string;
}
```

### AcademiaNote
```typescript
{
  id: string;
  space_id: string;
  journey_id?: string;
  title: string;
  content: string;  // Markdown
  note_type: 'fleeting' | 'literature' | 'permanent';
  tags: string[];
  linked_note_ids: string[];  // Simple array of IDs
}
```

### AcademiaNoteLink ⭐ NEW
```typescript
{
  id: string;
  from_note_id: string;  // → AcademiaNote.id
  to_note_id: string;    // → AcademiaNote.id
  link_type: 'related' | 'supports' | 'contradicts' | 'extends' | 'example';
  context?: string;  // Why these notes are linked
}
```

### AcademiaMentorship
```typescript
{
  id: string;
  space_id: string;
  mentor_member_id?: string;
  mentee_member_id?: string;
  relationship_type: 'giving' | 'receiving';
  focus_areas: string[];
  status: 'active' | 'paused' | 'completed';
  frequency?: 'weekly' | 'biweekly' | 'monthly' | 'ad-hoc';
  next_session_at?: string;
}
```

### AcademiaMentorshipSession ⭐ NEW
```typescript
{
  id: string;
  mentorship_id: string;  // → AcademiaMentorship.id
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  agenda?: string;
  notes?: string;
  action_items?: string[];
  rating?: number;  // 1-5
}
```

### AcademiaCredential
```typescript
{
  id: string;
  space_id: string;
  journey_id?: string;
  title: string;
  issuer: string;
  credential_type?: 'certificate' | 'diploma' | 'badge' | 'publication' | 'award';
  issued_at: string;
  expires_at?: string;
  credential_url?: string;
}
```

### AcademiaGoal ⭐ NEW
```typescript
{
  id: string;
  space_id: string;
  user_id: string;
  title: string;
  category: 'skill' | 'knowledge' | 'certification' | 'career' | 'personal';
  status: 'not_started' | 'in_progress' | 'achieved' | 'abandoned';
  milestones?: AcademiaGoalMilestone[];
  linked_journeys?: string[];  // → AcademiaJourney.id[]
  target_date?: string;
  achieved_date?: string;
}
```

## 🔗 Common Relationships

```
Journey (1) ───< (N) Modules
Journey (1) ───< (N) Materials
Journey (1) ───< (N) Notes
Journey (1) ───< (1) Credential

Note (1) ───< (N) NoteLinks (outgoing)
Note (1) ───< (N) NoteLinks (incoming)

Mentorship (1) ───< (N) Sessions

Goal (1) ───< (N) Journeys (linked)
Goal (1) ───< (N) Milestones
```

## 💡 Common Patterns

### Creating a Journey with Modules
```typescript
// 1. Create journey
const journey = await journeyService.createJourney(spaceId, {
  title: "TypeScript Mastery",
  journey_type: "course",
  total_modules: 10,
});

// 2. Create modules (when moduleService exists)
for (let i = 0; i < 10; i++) {
  await moduleService.createModule(journey.id, {
    name: `Module ${i + 1}`,
    order: i,
  });
}
```

### Building a Knowledge Graph
```typescript
// 1. Create notes
const note1 = await noteService.createNote(spaceId, {
  title: "Concept A",
  content: "...",
  note_type: "permanent",
});

const note2 = await noteService.createNote(spaceId, {
  title: "Concept B",
  content: "...",
  note_type: "permanent",
});

// 2. Link notes (when noteLinkService exists)
await noteLinkService.createLink({
  from_note_id: note1.id,
  to_note_id: note2.id,
  link_type: "supports",
  context: "Concept B provides evidence for Concept A",
});
```

### Tracking Mentorship Sessions
```typescript
// 1. Create mentorship
const mentorship = await mentorshipService.createMentorship(spaceId, {
  relationship_type: "receiving",
  focus_areas: ["Career Growth", "Technical Skills"],
});

// 2. Schedule session (when sessionService exists)
await sessionService.createSession(mentorship.id, {
  scheduled_at: "2025-01-15T10:00:00Z",
  agenda: "Q1 goals review",
});
```

### Setting Development Goals
```typescript
// Create goal with milestones (when goalService exists)
await goalService.createGoal(spaceId, {
  title: "Become a Senior Developer",
  category: "career",
  milestones: [
    { title: "Complete advanced TypeScript course", completed: false },
    { title: "Build 3 production projects", completed: false },
    { title: "Mentor 2 junior developers", completed: false },
  ],
  target_date: "2025-12-31",
});
```

## 📦 DTOs (Data Transfer Objects)

All entities have Create and Update payloads:

```typescript
// Core
CreateJourneyPayload, UpdateJourneyPayload
CreateNotePayload, UpdateNotePayload
CreateMentorshipPayload, UpdateMentorshipPayload
CreateCredentialPayload, UpdateCredentialPayload

// Extended
CreateModulePayload, UpdateModulePayload
CreateMaterialPayload, UpdateMaterialPayload
CreateNoteLinkPayload
CreateMentorshipSessionPayload, UpdateMentorshipSessionPayload
CreateGoalPayload, UpdateGoalPayload
```

## 🎨 UI Component Ideas

### Module Progress
- `<ModuleList>` - Show all modules with status indicators
- `<ModuleCard>` - Individual module with unlock conditions
- `<ProgressRing>` - Visual progress across modules

### Material Library
- `<MaterialGrid>` - Grid of materials with type icons
- `<MaterialCard>` - Card showing read status and rating
- `<ReadingList>` - Filter by read_status

### Knowledge Graph
- `<NoteGraph>` - Visual graph of note connections
- `<NoteLinkBadge>` - Show link type with icon
- `<BacklinksPanel>` - Show incoming links

### Mentorship Dashboard
- `<SessionCalendar>` - Show scheduled sessions
- `<SessionCard>` - Individual session with agenda
- `<ActionItemsList>` - Trackable action items

### Goal Tracker
- `<GoalCard>` - Goal with milestone checklist
- `<MilestoneProgress>` - Visual progress bar
- `<LinkedJourneys>` - Show related learning paths

---

**💡 Tip**: Start with core types for MVP, then add extended types as needed!
