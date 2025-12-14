# Academia Types - Complete Reference

## Overview

The Academia archetype type system is split across two files:

1. **`types.ts`** - Core types (existing, maintained for compatibility)
2. **`types.extended.ts`** - Extended types (NEW - additional functionality)

## Core Types (types.ts)

### Interfaces

- **`AcademiaJourney`** - Learning paths (courses, books, certifications)
- **`AcademiaNote`** - Zettelkasten-style knowledge notes
- **`AcademiaMentorship`** - Mentorship relationships
- **`MentorshipObjective`** - Mentorship goals/objectives
- **`AcademiaCredential`** - Certificates, diplomas, badges, publications, awards

### Enums/Union Types

- `JourneyType` - 'course' | 'book' | 'certification' | 'mentorship' | 'workshop'
- `JourneyStatus` - 'planned' | 'active' | 'paused' | 'completed' | 'abandoned'
- `NoteType` - 'fleeting' | 'literature' | 'permanent'
- `MentorshipRelationType` - 'giving' | 'receiving'
- `MentorshipFrequency` - 'weekly' | 'biweekly' | 'monthly' | 'ad-hoc'
- `MentorshipStatus` - 'active' | 'paused' | 'completed'
- `CredentialType` - 'certificate' | 'diploma' | 'badge' | 'publication' | 'award'

### DTOs (Payloads)

- `CreateJourneyPayload`
- `UpdateJourneyPayload`
- `CreateNotePayload`
- `UpdateNotePayload`
- `CreateMentorshipPayload`
- `UpdateMentorshipPayload`
- `CreateCredentialPayload`
- `UpdateCredentialPayload`

### Helper Types

- `JourneyWithRelations` - Journey with notes and credentials
- `NoteWithLinks` - Note with linked notes populated
- `NoteSearchResult` - Full-text search result

## Extended Types (types.extended.ts)

### New Interfaces

- **`AcademiaModule`** - Course/journey modules or sections (granular progress tracking)
- **`AcademiaMaterial`** - Study materials (PDFs, videos, articles, books)
- **`AcademiaNoteLink`** - Explicit links between notes (knowledge graph)
- **`AcademiaMentorshipSession`** - Individual mentorship sessions
- **`AcademiaGoal`** - Development and learning goals
- **`AcademiaGoalMilestone`** - Sub-goals within a development goal

### New Enums/Union Types

- `MaterialType` - 'pdf' | 'video' | 'article' | 'book' | 'podcast' | 'other'
- `MaterialReadStatus` - 'unread' | 'reading' | 'read'
- `NoteLinkType` - 'related' | 'supports' | 'contradicts' | 'extends' | 'example'
- `SessionStatus` - 'scheduled' | 'completed' | 'cancelled' | 'no_show'
- `GoalCategory` - 'skill' | 'knowledge' | 'certification' | 'career' | 'personal'
- `GoalStatus` - 'not_started' | 'in_progress' | 'achieved' | 'abandoned'
- `ModuleStatus` - 'locked' | 'available' | 'in_progress' | 'completed'

### New DTOs (Payloads)

- `CreateModulePayload` / `UpdateModulePayload`
- `CreateMaterialPayload` / `UpdateMaterialPayload`
- `CreateNoteLinkPayload`
- `CreateMentorshipSessionPayload` / `UpdateMentorshipSessionPayload`
- `CreateGoalPayload` / `UpdateGoalPayload`

### New Helper Types

- `JourneyWithModulesAndMaterials` - Journey with modules and materials
- `NoteWithExplicitLinks` - Note with explicit link objects
- `MentorshipWithSessions` - Mentorship with sessions populated
- `GoalWithJourneys` - Goal with linked journeys populated

### Utility Type Helpers

- `AcademiaMaterialType`
- `AcademiaMaterialReadStatus`
- `AcademiaModuleStatus`
- `AcademiaSessionStatus`
- `AcademiaNoteLinkType`
- `AcademiaGoalCategory`
- `AcademiaGoalStatus`

## Usage

### Using Core Types Only

```typescript
import type {
  AcademiaJourney,
  AcademiaNote,
  AcademiaMentorship,
  AcademiaCredential,
} from './types';
```

### Using Extended Types

```typescript
import type {
  AcademiaModule,
  AcademiaMaterial,
  AcademiaNoteLink,
  AcademiaMentorshipSession,
  AcademiaGoal,
} from './types.extended';
```

### Using Both

```typescript
import type { AcademiaJourney, AcademiaNote } from './types';
import type { AcademiaModule, AcademiaMaterial } from './types.extended';
```

## Type Compatibility

All extended types are designed to work seamlessly with core types:

- `AcademiaModule.journey_id` → references `AcademiaJourney.id`
- `AcademiaMaterial.journey_id` → references `AcademiaJourney.id`
- `AcademiaNoteLink.from_note_id/to_note_id` → references `AcademiaNote.id`
- `AcademiaMentorshipSession.mentorship_id` → references `AcademiaMentorship.id`
- `AcademiaGoal.linked_journeys` → array of `AcademiaJourney.id`

## Key Features by Type

### AcademiaModule
- Granular progress tracking within journeys
- Order/sequence management
- Duration tracking
- Status: locked → available → in_progress → completed

### AcademiaMaterial
- Multi-format support (PDF, video, article, book, podcast)
- Read status tracking
- Personal rating (1-5)
- Optional journey association

### AcademiaNoteLink
- Typed relationships between notes
- Knowledge graph construction
- Link types: related, supports, contradicts, extends, example
- Optional context field for relationship description

### AcademiaMentorshipSession
- Session scheduling
- Agenda and notes
- Action items tracking
- Post-session rating
- Status tracking (scheduled → completed/cancelled/no_show)

### AcademiaGoal
- Multi-category goals (skill, knowledge, certification, career, personal)
- Milestone/sub-goal tracking
- Journey linkage
- Target and achieved date tracking
- Status: not_started → in_progress → achieved/abandoned

## Database Schema Alignment

All extended types are designed to align with the database migrations:

- Core types → `academia_journeys`, `academia_notes`, `academia_mentorships`, `academia_credentials`
- Extended types → Will require additional migrations for:
  - `academia_modules`
  - `academia_materials`
  - `academia_note_links`
  - `academia_mentorship_sessions`
  - `academia_goals`

## Migration Status

- ✅ **Core types** - Fully implemented and in use
- 🔜 **Extended types** - Types defined, database migrations needed

## Next Steps

1. Create database migrations for extended types
2. Create service layer functions (similar to existing services)
3. Build UI components for new functionality
4. Update documentation with usage examples
