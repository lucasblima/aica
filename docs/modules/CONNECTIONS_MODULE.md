# Connections Module

> **Philosophy:** Shared spaces for collaborative life management across four archetypes

**Version:** 1.0.0
**Last Updated:** 2025-12-14
**Module Path:** `src/modules/connections/`

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Directory Structure](#directory-structure)
4. [The Four Archetypes](#the-four-archetypes)
5. [Core Features](#core-features)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [Usage Examples](#usage-examples)
9. [Design System](#design-system)
10. [Integration Points](#integration-points)
11. [Testing](#testing)
12. [Roadmap](#roadmap)

---

## Overview

The **Connections Module** enables users to create and manage shared spaces for collaborative life management. Each connection space belongs to one of four archetypes, each designed with a unique philosophy and purpose.

### Purpose

- **Manage Shared Spaces:** Create collaborative environments for home, business, education, and community
- **Member Coordination:** Invite and manage members with role-based permissions
- **Finance Integration:** Track and split shared expenses
- **Calendar Sync:** Integrate with Google Calendar for event management
- **Archetype-Specific Features:** Each archetype provides specialized tools for its domain

### Key Concepts

- **Connection Space:** A collaborative environment owned by a user and shared with members
- **Archetype:** One of four predefined templates (Habitat, Ventures, Academia, Tribo)
- **Member:** A participant in a connection space (can be Aica user or external contact)
- **Events:** Shared calendar items with RSVP and Google Calendar integration
- **Transactions:** Shared financial records with split capabilities

---

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     Connections Module                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   │
│  │ Habitat  │   │ Ventures │   │ Academia │   │  Tribo   │   │
│  │  (Home)  │   │(Business)│   │(Learning)│   │(Community│   │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘   │
│       │              │              │              │          │
│       └──────────────┴──────────────┴──────────────┘          │
│                           │                                    │
│                  ┌────────▼─────────┐                         │
│                  │  Core Services   │                         │
│                  │  - Spaces        │                         │
│                  │  - Members       │                         │
│                  │  - Events        │                         │
│                  │  - Documents     │                         │
│                  │  - Transactions  │                         │
│                  └────────┬─────────┘                         │
│                           │                                    │
│                  ┌────────▼─────────┐                         │
│                  │   Supabase DB    │                         │
│                  │  - RLS Policies  │                         │
│                  │  - Security      │                         │
│                  └──────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action
    │
    ▼
React Component
    │
    ▼
Custom Hook (useState + useEffect)
    │
    ▼
Service Layer (Supabase API)
    │
    ▼
Supabase Database (RLS-protected)
    │
    ▼
Response → State Update → UI Update
```

### Module Layers

1. **Types Layer** (`types/`)
   - TypeScript interfaces and enums
   - Archetype metadata
   - Validation schemas

2. **Services Layer** (`services/`)
   - Direct Supabase interactions
   - CRUD operations
   - Data transformations

3. **Hooks Layer** (`hooks/`)
   - State management with useState
   - Side effects with useEffect
   - Optimistic updates
   - Error handling

4. **Components Layer** (`components/`)
   - Reusable UI components
   - Archetype-agnostic widgets
   - Card components

5. **Views Layer** (`views/`)
   - Page-level components
   - Route containers
   - Feature compositions

6. **Archetype Layers** (`habitat/`, `ventures/`, `academia/`, `tribo/`)
   - Archetype-specific logic
   - Specialized components
   - Domain services

---

## Directory Structure

```
src/modules/connections/
├── types/
│   └── index.ts                     # Core types and enums
│
├── services/
│   ├── connectionSpaceService.ts    # Space CRUD operations
│   ├── connectionMemberService.ts   # Member management
│   ├── eventService.ts              # Event management
│   └── index.ts                     # Service exports
│
├── hooks/
│   ├── useConnectionSpaces.ts       # Multi-space management
│   ├── useConnectionMembers.ts      # Member management hook
│   ├── useSpaceEvents.ts            # Event management hook
│   ├── README.md                    # Hook documentation
│   └── EXAMPLES.tsx                 # Usage examples
│
├── components/
│   ├── ConnectionSpaceCard.tsx      # Space card component
│   ├── SpaceHeader.tsx              # Space header component
│   ├── SpaceMemberList.tsx          # Member list component
│   ├── CreateSpaceWizard.tsx        # Space creation wizard
│   └── ConnectionSpaceCard.README.md
│
├── views/
│   ├── ConnectionsView.tsx          # Main connections page
│   ├── ConnectionsView.README.md
│   └── index.ts
│
├── habitat/                         # Home/Property archetype
│   ├── types.ts
│   ├── services/
│   │   ├── propertyService.ts
│   │   ├── inventoryService.ts
│   │   └── maintenanceService.ts
│   ├── hooks/
│   │   ├── useProperty.ts
│   │   ├── useInventory.ts
│   │   └── useMaintenance.ts
│   ├── components/
│   │   ├── PropertyCard.tsx
│   │   ├── InventoryGrid.tsx
│   │   ├── MaintenanceTracker.tsx
│   │   └── WarrantyAlertsCard.tsx
│   ├── views/
│   │   ├── HabitatHome.tsx
│   │   ├── PropertyDetail.tsx
│   │   └── InventoryView.tsx
│   ├── README.md
│   └── index.ts
│
├── ventures/                        # Business archetype
│   ├── types.ts
│   ├── services/
│   │   ├── entityService.ts
│   │   ├── metricsService.ts
│   │   ├── milestoneService.ts
│   │   └── stakeholderService.ts
│   ├── hooks/
│   │   ├── useEntity.ts
│   │   ├── useMetrics.ts
│   │   └── useMilestones.ts
│   └── components/
│       ├── HealthGauge.tsx
│       ├── MetricsCard.tsx
│       └── MilestoneTimeline.tsx
│
├── academia/                        # Learning archetype
│   ├── types.ts
│   ├── services/
│   │   ├── journeyService.ts
│   │   ├── noteService.ts
│   │   ├── mentorshipService.ts
│   │   └── credentialService.ts
│   ├── hooks/
│   │   ├── useJourneys.ts
│   │   ├── useNotes.ts
│   │   └── useMentorships.ts
│   └── components/
│       ├── JourneyCard.tsx
│       ├── NoteEditor.tsx
│       ├── NoteGraph.tsx
│       └── KnowledgeSearch.tsx
│
└── tribo/                           # Community archetype
    ├── types.ts
    ├── services/
    │   ├── ritualService.ts
    │   ├── resourceService.ts
    │   ├── fundService.ts
    │   └── discussionService.ts
    ├── hooks/
    │   ├── useRituals.ts
    │   ├── useResources.ts
    │   └── useFunds.ts
    └── components/
        ├── RitualCard.tsx
        ├── SharedResourceCard.tsx
        ├── PollVoting.tsx
        └── DiscussionThread.tsx
```

---

## The Four Archetypes

### 1. Habitat (O Âncora Físico)

**Philosophy:** "Logística da serenidade" - Silent, inevitable home maintenance

**Use Cases:**
- Home/apartment management
- Condominium coordination
- Property maintenance tracking
- Warranty management
- Household inventory

**Design:**
- Earthy tones (browns, taupes, muted greens)
- Heavy borders, grounded aesthetic
- Control panel metaphor
- Ceramic-dense cards

**Icon:** 🏠

**Features:**
- Property management (address, specs, fees)
- Inventory tracking with warranty alerts
- Maintenance scheduling and tracking
- Building contacts (portaria, síndico)
- Financial overview (condominium + rent + taxes)

[Full Documentation](../../src/modules/connections/habitat/README.md)

---

### 2. Ventures (O Motor de Criação)

**Philosophy:** "Cockpit da ambição profissional" - Strategy and vision, not micromanagement

**Use Cases:**
- Startup/business management
- Cap table and equity tracking
- Financial metrics (MRR, runway, burn rate)
- Milestone tracking
- Stakeholder management

**Design:**
- Precise, technical typography
- Braun instrument aesthetic
- Amber surgical alerts
- Clean, data-focused layouts

**Icon:** 💼

**Features:**
- Business entity management (CNPJ, legal structure)
- Financial KPIs and health metrics
- Milestone tracking with dependencies
- Stakeholder registry (founders, investors, team)
- Equity and vesting management

---

### 3. Academia (O Cultivo da Mente)

**Philosophy:** "Templo do crescimento intelectual" - Knowledge curated, not consumed

**Use Cases:**
- Learning journeys (courses, books, certifications)
- Zettelkasten-style note-taking
- Mentorship coordination
- Credential management

**Design:**
- Silent library atmosphere
- Generous whitespace
- Paper-like aesthetic (high-grammage)
- Focused typography

**Icon:** 🎓

**Features:**
- Learning journey tracking with progress
- Zettelkasten notes (fleeting, literature, permanent)
- Bidirectional note linking
- Mentorship scheduling and objectives
- Credential vault with expiration tracking

---

### 4. Tribo (O Tecido Social)

**Philosophy:** "Antítese da rede social moderna" - Intentional belonging

**Use Cases:**
- Community groups (clubs, families, sports teams)
- Recurring ritual coordination
- Shared resource management
- Group funds and contributions
- Discussion forums

**Design:**
- Warm, human atmosphere
- Ceramic-concave for photos
- Cards as physical invitations
- Collaborative, inclusive feel

**Icon:** 👥

**Features:**
- Ritual scheduling with RSVP
- Shared resource checkout system
- Group fund pooling with contributions
- Discussion threads with polls
- Member activity tracking

---

## Core Features

### 1. Space Management

**Create Connection Spaces:**
```typescript
const { create } = useConnectionSpaces();

await create({
  archetype: 'habitat',
  name: 'Minha Casa',
  subtitle: 'Apartamento 301',
  description: 'Residência familiar',
  icon: '🏠',
  color_theme: 'earthy'
});
```

**List and Filter:**
- All spaces view with archetype filtering
- Favorites section for quick access
- Sort by last accessed, name, creation date

**Update and Delete:**
- Edit space details (name, subtitle, description, icon, theme)
- Soft delete (archive) spaces
- Toggle favorite status

---

### 2. Member Management

**Add Members:**
```typescript
const { addMember } = useConnectionMembers(spaceId);

// Aica user
await addMember({
  user_id: 'user-uuid',
  role: 'member'
});

// External contact
await addMember({
  external_name: 'João Silva',
  external_email: 'joao@example.com',
  role: 'guest'
});
```

**Roles:**
- **Owner:** Full control (creator of space)
- **Admin:** Can manage members and settings
- **Member:** Can view and contribute
- **Guest:** Read-only access

**Permissions:**
- Role-based access control via RLS
- Granular permissions stored in JSONB
- Context-specific labels (e.g., "Morador" in Habitat)

---

### 3. Event Management

**Create Events:**
```typescript
const { createEvent } = useSpaceEvents(spaceId);

await createEvent({
  title: 'Reunião de Condomínio',
  starts_at: '2025-01-15T19:00:00Z',
  location: 'Salão de festas',
  rsvp_enabled: true
});
```

**Features:**
- All-day and timed events
- RSVP tracking
- Recurring events (RRULE format)
- Google Calendar sync
- Event types: meeting, social, milestone, deadline

---

### 4. Finance Integration

**Shared Transactions:**
```typescript
await createTransaction({
  space_id: spaceId,
  description: 'Condomínio Dezembro',
  amount: 850.00,
  currency: 'BRL',
  type: 'expense',
  split_type: 'equal',
  transaction_date: '2025-12-01'
});
```

**Split Types:**
- **Equal:** Split evenly among members
- **Percentage:** Custom percentages per member
- **Custom:** Fixed amounts per member
- **Payer Only:** No split (single payer)

---

### 5. Document Management

**Upload and Organize:**
- File storage in Supabase Storage
- Category and tag organization
- Version control with parent references
- Expiration tracking for time-sensitive documents

---

## Database Schema

### Core Tables

#### `connection_spaces`

Primary table for all connection spaces.

```sql
CREATE TABLE connection_spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    archetype connection_archetype_type NOT NULL,
    name TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    icon TEXT,
    color_theme TEXT,
    cover_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_favorite BOOLEAN DEFAULT FALSE,
    last_accessed_at TIMESTAMPTZ,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_connection_spaces_user_id` (user_id)
- `idx_connection_spaces_archetype` (user_id, archetype)
- `idx_connection_spaces_is_active` (user_id, is_active) WHERE is_active = TRUE
- `idx_connection_spaces_is_favorite` (user_id, is_favorite) WHERE is_favorite = TRUE

---

#### `connection_members`

Members within connection spaces (Aica users or external contacts).

```sql
CREATE TABLE connection_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    external_name TEXT,
    external_email TEXT,
    external_phone TEXT,
    external_avatar_url TEXT,
    role connection_member_role DEFAULT 'member',
    permissions JSONB DEFAULT '{}'::jsonb,
    context_label TEXT,
    context_data JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_interaction_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT member_identifier_required CHECK (
        user_id IS NOT NULL OR external_email IS NOT NULL OR external_phone IS NOT NULL
    )
);
```

---

#### `connection_events`

Shared events with calendar sync capabilities.

```sql
CREATE TABLE connection_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    is_all_day BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,
    event_type connection_event_type DEFAULT 'other',
    rsvp_enabled BOOLEAN DEFAULT FALSE,
    google_event_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### `connection_documents`

Document storage and versioning.

```sql
CREATE TABLE connection_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    category TEXT,
    tags TEXT[] DEFAULT '{}'::text[],
    version INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES connection_documents(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### `connection_transactions`

Financial transactions with split capabilities.

```sql
CREATE TABLE connection_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    type connection_transaction_type NOT NULL,
    category TEXT,
    transaction_date TIMESTAMPTZ NOT NULL,
    split_type connection_transaction_split_type DEFAULT 'payer_only',
    split_data JSONB DEFAULT '{}'::jsonb,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    paid_by UUID REFERENCES auth.users(id),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Security Model

**Row Level Security (RLS):**

All tables use RLS with SECURITY DEFINER helper functions to prevent recursion:

```sql
-- Check if user is member
CREATE FUNCTION is_connection_space_member(_space_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM connection_members
        WHERE space_id = _space_id
          AND user_id = auth.uid()
          AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies
CREATE POLICY "connection_spaces_select"
    ON connection_spaces FOR SELECT
    USING (
        user_id = auth.uid()  -- Owner
        OR is_connection_space_member(id)  -- Member
    );
```

---

## API Reference

### Hooks

#### `useConnectionSpaces(options?)`

Manage multiple connection spaces.

**Options:**
- `archetype?: Archetype` - Filter by archetype
- `autoFetch?: boolean` - Auto-fetch on mount (default: true)

**Returns:**
- `spaces: ConnectionSpace[]` - List of spaces
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error if any
- `create(input): Promise<ConnectionSpace>` - Create new space
- `update(spaceId, input): Promise<ConnectionSpace>` - Update space
- `remove(spaceId): Promise<void>` - Delete space
- `toggleFavorite(spaceId, isFavorite): Promise<void>` - Toggle favorite
- `refresh(): Promise<void>` - Refresh data
- `getById(spaceId): ConnectionSpace | undefined` - Get space by ID
- `getByArchetype(archetype): ConnectionSpace[]` - Filter by archetype
- `favorites: ConnectionSpace[]` - Favorite spaces
- `byArchetype: Record<Archetype, ConnectionSpace[]>` - Grouped by archetype
- `totalCount: number` - Total space count

**Example:**
```typescript
const { spaces, create, toggleFavorite, favorites } = useConnectionSpaces();

// Create new space
await create({
  archetype: 'habitat',
  name: 'Minha Casa'
});

// Toggle favorite
await toggleFavorite(spaceId, true);
```

---

#### `useConnectionMembers(spaceId)`

Manage members of a connection space.

**Returns:**
- `members: ConnectionMember[]` - List of members
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error if any
- `isAdmin: boolean` - If current user is admin
- `isAdminLoading: boolean` - Admin check loading
- `addMember(input): Promise<ConnectionMember>` - Add member
- `removeMember(memberId): Promise<void>` - Remove member
- `updateRole(memberId, role): Promise<void>` - Update member role
- `refresh(): Promise<void>` - Refresh data

---

#### `useSpaceEvents(spaceId, options?)`

Manage events within a connection space.

**Options:**
- `start?: string` - Start date filter (ISO)
- `end?: string` - End date filter (ISO)

**Returns:**
- `events: ConnectionEvent[]` - List of events
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error if any
- `createEvent(input): Promise<ConnectionEvent>` - Create event
- `updateEvent(eventId, input): Promise<ConnectionEvent>` - Update event
- `deleteEvent(eventId): Promise<void>` - Delete event
- `refresh(): Promise<void>` - Refresh data

---

### Services

All services are located in `src/modules/connections/services/`.

#### Connection Space Service

```typescript
// Get all spaces for user
getConnectionSpaces(userId: string): Promise<ConnectionSpace[]>

// Get spaces by archetype
getConnectionSpacesByArchetype(userId: string, archetype: Archetype): Promise<ConnectionSpace[]>

// Get single space
getConnectionSpaceById(spaceId: string): Promise<ConnectionSpace | null>

// Create space
createConnectionSpace(userId: string, input: CreateSpacePayload): Promise<ConnectionSpace>

// Update space
updateConnectionSpace(spaceId: string, input: UpdateSpacePayload): Promise<ConnectionSpace>

// Delete (soft) space
deleteConnectionSpace(spaceId: string): Promise<void>

// Toggle favorite
toggleFavorite(spaceId: string, isFavorite: boolean): Promise<void>

// Update last accessed
updateLastAccessed(spaceId: string): Promise<void>
```

---

## Usage Examples

### 1. Creating a Habitat Space

```typescript
import { useConnectionSpaces } from '@/modules/connections/hooks';

function CreateHabitatExample() {
  const { create, isLoading } = useConnectionSpaces();

  const handleCreate = async () => {
    await create({
      archetype: 'habitat',
      name: 'Apartamento 301',
      subtitle: 'Edifício Residencial Solar',
      description: 'Nossa residência familiar',
      icon: '🏠',
      color_theme: 'earth'
    });
  };

  return (
    <button onClick={handleCreate} disabled={isLoading}>
      {isLoading ? 'Criando...' : 'Criar Habitat'}
    </button>
  );
}
```

---

### 2. Inviting Members

```typescript
import { useConnectionMembers } from '@/modules/connections/hooks';

function InviteMemberExample({ spaceId }: { spaceId: string }) {
  const { addMember, isLoading } = useConnectionMembers(spaceId);

  const handleInvite = async () => {
    // Add external member (not an Aica user)
    await addMember({
      external_name: 'Maria Silva',
      external_email: 'maria@example.com',
      role: 'member',
      context_label: 'Moradora'
    });
  };

  return (
    <button onClick={handleInvite} disabled={isLoading}>
      Convidar Maria
    </button>
  );
}
```

---

### 3. Syncing with Calendar

```typescript
import { useSpaceEvents } from '@/modules/connections/hooks';

function CalendarSyncExample({ spaceId }: { spaceId: string }) {
  const { createEvent } = useSpaceEvents(spaceId);

  const handleCreateMeeting = async () => {
    await createEvent({
      title: 'Reunião de Equipe',
      starts_at: '2025-01-20T14:00:00Z',
      ends_at: '2025-01-20T15:00:00Z',
      location: 'Sala de Reuniões',
      event_type: 'meeting',
      rsvp_enabled: true,
      google_event_id: 'google-calendar-event-id' // Optional: sync with Google
    });
  };

  return (
    <button onClick={handleCreateMeeting}>
      Criar Reunião
    </button>
  );
}
```

---

## Design System

### Ceramic Styling

The Connections module uses the project's **Ceramic Design System** with archetype-specific variations.

#### Base Ceramic Classes

```css
/* Cards */
.ceramic-card          /* Elevated card with shadow */
.ceramic-inset         /* Inset/pressed effect */
.ceramic-tray          /* Flat tray container */

/* Elevation */
.ceramic-elevated      /* Raised surface */
.ceramic-inset-shallow /* Subtle inset */
.ceramic-inset-deep    /* Deep inset */

/* Themes */
.ceramic-warm          /* Warm background */
.ceramic-cool          /* Cool background */
```

---

### Archetype Color Schemes

#### Habitat (Earthy)
```css
Primary:   #78350f, #92400e (browns)
Secondary: #57534e, #78716c (stone grays)
Accents:   Muted greens, taupes
BG:        Stone-50 to amber-50 gradients
```

#### Ventures (Precise)
```css
Primary:   Technical blacks, sharp grays
Secondary: Cool blues, surgical whites
Accents:   Amber for alerts (#f59e0b)
BG:        Clean whites, subtle grays
```

#### Academia (Serene)
```css
Primary:   Soft blacks, warm grays
Secondary: Paper whites, cream tones
Accents:   Muted amber, sage green
BG:        Paper-like (#fafaf9 to #f5f5f4)
```

#### Tribo (Warm)
```css
Primary:   Warm browns, earthy reds
Secondary: Soft oranges, inviting yellows
Accents:   Living greens, community blues
BG:        Warm neutrals (#fef3c7 to #fef9c3)
```

---

### Typography

- **Headings:** Bold (font-bold), etched effect
- **Body:** Medium (font-medium)
- **Labels:** Uppercase, tracking-wider, small sizes
- **Data:** Monospace for numbers

---

### Component Patterns

#### Space Card

```typescript
<SpaceCard
  space={space}
  variant="full"
  showFavorite
  memberCount={5}
  onClick={() => navigate(`/spaces/${space.id}`)}
  onToggleFavorite={() => toggleFavorite(space.id)}
/>
```

**Variants:**
- `compact`: Minimal, list-friendly
- `full`: Detailed with footer, member count

---

#### Connection View

```typescript
<ConnectionsView
  userId={user.id}
  onNavigateToSpace={(id) => navigate(`/spaces/${id}`)}
  onCreateSpace={() => setShowModal(true)}
/>
```

**Features:**
- Archetype filter tabs
- Favorites section
- Quick stats
- Empty state with suggestions
- Responsive grid (1/2/3 columns)

---

## Integration Points

### 1. Google Calendar Sync

**Event Creation:**
- Events can optionally sync with Google Calendar
- Store `google_event_id` for bidirectional updates
- Use Google Calendar API for CRUD operations

**Service Integration:**
```typescript
import { googleAuthService } from '@/services/googleAuthService';

// Create event in Google Calendar
const googleEvent = await googleAuthService.createEvent({
  summary: event.title,
  location: event.location,
  start: { dateTime: event.starts_at },
  end: { dateTime: event.ends_at }
});

// Store google_event_id in database
await updateEvent(eventId, {
  google_event_id: googleEvent.id
});
```

---

### 2. Finance Module

**Shared Transactions:**
- Connection transactions integrate with the Finance module
- Expense splitting among members
- Transaction categorization and reporting

---

### 3. Authentication

**User Context:**
- All operations use `useAuth()` hook for current user
- RLS policies enforce user-level security
- Member management supports both Aica users and external contacts

---

## Testing

### Unit Tests

```bash
# Test services
npm test src/modules/connections/services

# Test hooks
npm test src/modules/connections/hooks

# Test components
npm test src/modules/connections/components
```

### Integration Tests

```bash
# E2E tests for connections flow
npm test tests/e2e/connections
```

### Test Coverage Goals

- Services: 90%+
- Hooks: 85%+
- Components: 80%+

---

## Roadmap

### Phase 1: Core Features (Completed)

- [x] Connection spaces CRUD
- [x] Member management (Aica users + external)
- [x] Event management
- [x] Document storage
- [x] Financial transactions
- [x] Archetype-specific features (Habitat, Ventures, Academia, Tribo)
- [x] RLS security model
- [x] Google Calendar sync foundation

### Phase 2: Enhanced Features (In Progress)

- [ ] Real-time collaboration (WebSockets)
- [ ] Push notifications for events and updates
- [ ] Mobile app support (React Native)
- [ ] Advanced search and filtering
- [ ] Analytics and insights per archetype
- [ ] Bulk member operations

### Phase 3: Advanced Features (Planned)

- [ ] AI-powered suggestions
- [ ] Automation workflows
- [ ] Third-party integrations (Slack, Notion, etc.)
- [ ] Advanced permissions and roles
- [ ] White-label support for organizations
- [ ] Data export and portability

---

## Contributing

### Adding New Features

1. **Types:** Add types to `types/index.ts` or archetype-specific `types.ts`
2. **Services:** Create service in `services/` for Supabase interactions
3. **Hooks:** Build React hook in `hooks/` for state management
4. **Components:** Create reusable components in `components/` or archetype folder
5. **Views:** Add page-level views in `views/` or archetype views
6. **Documentation:** Update this README and create component-specific docs
7. **Tests:** Write unit and integration tests

### Design Guidelines

- Follow the Ceramic Design System
- Respect archetype philosophies and aesthetics
- Maintain consistent spacing and typography
- Use Framer Motion for animations
- Ensure mobile responsiveness

### Code Standards

- TypeScript strict mode
- Functional components with hooks
- Proper error handling and loading states
- Optimistic UI updates where applicable
- Clear JSDoc comments for public APIs

---

## License

Part of the Aica frontend project.

---

## Support

For questions or issues:
- Check existing documentation in `docs/`
- Review component-specific READMEs
- Consult archetype documentation (e.g., `habitat/README.md`)
- Refer to the main project documentation

---

**Last Updated:** 2025-12-14
**Version:** 1.0.0
**Maintainer:** Aica Development Team
