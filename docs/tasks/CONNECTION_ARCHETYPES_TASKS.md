# Connection Archetypes - Task Breakdown

## Overview
This document contains actionable tasks for implementing the four Connection Archetypes (Habitat, Ventures, Academia, Tribo) in Aica Life OS. Tasks are organized by phase and assigned to specialist agents.

---

## Phase 1: Foundation (Database & Core Infrastructure)

### 1.1 Database Migrations
**Agent: general-purpose (Backend Architect)**

- [ ] Create migration `20251214_connection_archetypes_base.sql`
  - [ ] `connection_spaces` table with archetype enum
  - [ ] `connection_members` table with role system
  - [ ] `connection_events` table with recurrence
  - [ ] `connection_documents` table with versioning
  - [ ] `connection_transactions` table with split logic
  - [ ] All necessary indexes for performance

- [ ] Create migration `20251214_connection_archetypes_rls.sql`
  - [ ] `is_space_member()` helper function
  - [ ] `is_space_owner()` helper function
  - [ ] `is_space_admin()` helper function
  - [ ] SELECT policies for all base tables
  - [ ] INSERT policies for all base tables
  - [ ] UPDATE policies for all base tables
  - [ ] DELETE policies for all base tables

**Acceptance Criteria:**
- All tables created without errors
- RLS enabled on all tables
- No recursion in policies (use security definer pattern)
- Verified with test queries

### 1.2 TypeScript Types
**Agent: general-purpose (Frontend Core)**

- [ ] Create `src/modules/connections/types.ts`
  - [ ] `ConnectionSpace` interface
  - [ ] `ConnectionMember` interface
  - [ ] `ConnectionEvent` interface
  - [ ] `ConnectionDocument` interface
  - [ ] `ConnectionTransaction` interface
  - [ ] `Archetype` enum type
  - [ ] `MemberRole` enum type
  - [ ] All payload/DTO types

**Acceptance Criteria:**
- Types match database schema exactly
- All fields properly typed (no `any`)
- Exported from module index

### 1.3 Core Services
**Agent: general-purpose (Backend Architect)**

- [ ] Create `src/modules/connections/services/spaceService.ts`
  - [ ] `getSpaces()` - list user's spaces
  - [ ] `getSpaceById(id)` - single space with relations
  - [ ] `createSpace(data)` - create new space
  - [ ] `updateSpace(id, data)` - update space
  - [ ] `deleteSpace(id)` - soft delete space
  - [ ] `getSpacesByArchetype(archetype)` - filtered list

- [ ] Create `src/modules/connections/services/memberService.ts`
  - [ ] `getMembers(spaceId)` - list members
  - [ ] `addMember(spaceId, data)` - add member
  - [ ] `updateMember(id, data)` - update role/permissions
  - [ ] `removeMember(id)` - remove from space
  - [ ] `inviteMember(spaceId, email)` - send invitation

- [ ] Create `src/modules/connections/services/eventService.ts`
  - [ ] `getEvents(spaceId, dateRange)` - list events
  - [ ] `createEvent(spaceId, data)` - create event
  - [ ] `updateEvent(id, data)` - update event
  - [ ] `deleteEvent(id)` - delete event
  - [ ] `syncToGoogleCalendar(eventId)` - calendar sync

**Acceptance Criteria:**
- All functions return proper types
- Error handling with meaningful messages
- Loading states managed
- Optimistic updates where appropriate

### 1.4 Core Hooks
**Agent: general-purpose (Frontend Core)**

- [ ] Create `src/modules/connections/hooks/useSpaces.ts`
- [ ] Create `src/modules/connections/hooks/useSpace.ts`
- [ ] Create `src/modules/connections/hooks/useSpaceMembers.ts`
- [ ] Create `src/modules/connections/hooks/useSpaceEvents.ts`

**Acceptance Criteria:**
- React Query or similar for caching
- Proper loading/error states
- Auto-refetch on focus
- Optimistic mutations

### 1.5 Shared Components
**Agent: general-purpose (Frontend Core)**

- [ ] Create `src/modules/connections/components/SpaceCard.tsx`
  - Props: space, onClick, variant ('compact' | 'full')
  - Shows: icon, name, subtitle, member count, last activity
  - Uses: ceramic-card, cardElevationVariants

- [ ] Create `src/modules/connections/components/SpaceHeader.tsx`
  - Props: space, onSettings, onBack
  - Shows: archetype icon, name, description, action buttons

- [ ] Create `src/modules/connections/components/SpaceMemberList.tsx`
  - Props: members, onMemberClick, maxDisplay
  - Shows: avatar stack, roles, invite button

- [ ] Create `src/modules/connections/components/CreateSpaceWizard.tsx`
  - Multi-step wizard:
    1. Choose archetype
    2. Basic info (name, description)
    3. Archetype-specific setup
    4. Invite members (optional)
  - Uses: ceramic-tray for steps, framer-motion transitions

**Acceptance Criteria:**
- All components follow ceramic design system
- Responsive (mobile-first)
- Accessible (ARIA labels, keyboard nav)
- Framer Motion for animations

---

## Phase 2: Habitat Implementation

### 2.1 Habitat Database
**Agent: general-purpose (Backend Architect)**

- [ ] Create migration `20251214_connection_archetypes_habitat.sql`
  - [ ] `habitat_properties` table
  - [ ] `habitat_inventory` table
  - [ ] `habitat_maintenance` table
  - [ ] Indexes and RLS policies

### 2.2 Habitat Types & Services
**Agent: general-purpose**

- [ ] Create `src/modules/connections/habitat/types.ts`
  - [ ] `HabitatProperty` interface
  - [ ] `InventoryItem` interface
  - [ ] `MaintenanceRecord` interface

- [ ] Create `src/modules/connections/habitat/services/propertyService.ts`
- [ ] Create `src/modules/connections/habitat/services/inventoryService.ts`
- [ ] Create `src/modules/connections/habitat/services/maintenanceService.ts`

### 2.3 Habitat Components
**Agent: general-purpose (Frontend Core)**

- [ ] `HabitatDashboard.tsx` - Main property overview
  - Property summary card
  - Pending maintenance alerts
  - Warranty expiring soon
  - Recent expenses

- [ ] `PropertyCard.tsx` - Property info display
  - Address, type, area
  - Monthly costs summary
  - Edit button

- [ ] `MaintenanceTracker.tsx` - Maintenance list
  - Status filters (pending, scheduled, completed)
  - Quick add button
  - Integration with calendar

- [ ] `InventoryGrid.tsx` - Appliance grid
  - Category filters
  - Search
  - Sort by warranty date

- [ ] `InventoryItemCard.tsx` - Individual item
  - Photo, name, brand
  - Warranty countdown
  - Maintenance history link

- [ ] `ExpenseSplitter.tsx` - Rateio UI
  - Split type selector
  - Per-member allocation
  - Payment tracking

- [ ] `CondoContacts.tsx` - Building contacts
  - Portaria, sindico, administradora
  - Click-to-call/message

### 2.4 Habitat Views
**Agent: general-purpose**

- [ ] `HabitatHome.tsx` - Entry point
- [ ] `PropertyDetail.tsx` - Full property view
- [ ] `MaintenanceView.tsx` - All maintenance records
- [ ] `InventoryView.tsx` - Full inventory management

### 2.5 Habitat Integration
**Agent: general-purpose**

- [ ] Finance module integration for expenses
- [ ] Calendar integration for maintenance reminders
- [ ] Notification service for warranty alerts

**Acceptance Criteria for Phase 2:**
- Complete property CRUD
- Inventory management working
- Maintenance tracking functional
- Expense splitting calculated correctly
- Earth-tone design applied

---

## Phase 3: Ventures Implementation

### 3.1 Ventures Database
**Agent: general-purpose (Backend Architect)**

- [ ] Create migration `20251214_connection_archetypes_ventures.sql`
  - [ ] `ventures_entities` table
  - [ ] `ventures_metrics` table
  - [ ] `ventures_milestones` table
  - [ ] `ventures_stakeholders` table
  - [ ] Indexes and RLS policies

### 3.2 Ventures Types & Services
**Agent: general-purpose**

- [ ] Create `src/modules/connections/ventures/types.ts`
  - [ ] `VenturesEntity` interface
  - [ ] `VenturesMetrics` interface
  - [ ] `Milestone` interface
  - [ ] `Stakeholder` interface

- [ ] Create services: entityService, metricsService, milestoneService, stakeholderService

### 3.3 Ventures Components
**Agent: general-purpose (Frontend Core)**

- [ ] `VenturesDashboard.tsx` - Cockpit view
  - Health gauges (burn rate, runway)
  - Key metrics cards
  - Milestone progress
  - Team overview

- [ ] `HealthGauge.tsx` - Visual health indicator
  - Runway months display
  - Burn rate trend
  - Color coding (green/yellow/red)

- [ ] `MetricsCard.tsx` - KPI display
  - Value, label, trend arrow
  - Sparkline chart optional
  - Click for history

- [ ] `MilestoneTimeline.tsx` - Progress visualization
  - Horizontal timeline
  - Status indicators
  - Expandable details

- [ ] `StakeholderGrid.tsx` - Team/investors view
  - Role-based grouping
  - Equity visualization
  - Contact info

- [ ] `EquityTable.tsx` - Cap table
  - Stakeholder, equity %, vesting status
  - Total verification

- [ ] `MRRChart.tsx` - Revenue trend
  - Line chart (12 months)
  - Comparison to previous period

### 3.4 Ventures Views
**Agent: general-purpose**

- [ ] `VenturesHome.tsx`
- [ ] `EntityDetail.tsx`
- [ ] `MetricsHistory.tsx`
- [ ] `TeamView.tsx`

### 3.5 Ventures Integration
**Agent: gamification-agent**

- [ ] Milestone achievements
- [ ] XP for hitting targets
- [ ] Progress badges

**Acceptance Criteria for Phase 3:**
- Entity management complete
- Metrics dashboard functional
- Milestones tracked
- Stakeholder cap table accurate
- Amber/precision design applied

---

## Phase 4: Academia Implementation

### 4.1 Academia Database
**Agent: general-purpose (Backend Architect)**

- [ ] Create migration `20251214_connection_archetypes_academia.sql`
  - [ ] `academia_journeys` table
  - [ ] `academia_notes` table (Zettelkasten)
  - [ ] `academia_mentorships` table
  - [ ] `academia_credentials` table
  - [ ] Indexes and RLS policies

### 4.2 Academia Types & Services
**Agent: general-purpose**

- [ ] Create types and services for journeys, notes, mentorships, credentials

### 4.3 Academia Components
**Agent: general-purpose + ai-integration**

- [ ] `AcademiaDashboard.tsx` - Library view
  - Active journeys
  - Recent notes
  - Upcoming sessions
  - Credentials showcase

- [ ] `JourneyCard.tsx` - Course/book card
  - Progress ring
  - Time spent
  - Next milestone

- [ ] `JourneyProgress.tsx` - Detailed progress
  - Module checklist
  - Time tracking
  - Completion estimate

- [ ] `NoteEditor.tsx` - Markdown editor
  **Agent: ai-integration**
  - Rich markdown support
  - Link suggestions
  - AI summary generation

- [ ] `NoteGraph.tsx` - Zettelkasten visualization
  **Agent: ai-integration**
  - Force-directed graph
  - Click to open note
  - Zoom/pan

- [ ] `MentorshipCard.tsx` - Relationship display
  - Next session
  - Focus areas
  - Session history

- [ ] `CredentialCard.tsx` - Certificate display
  - Visual certificate
  - Verification link
  - Expiry warning

- [ ] `KnowledgeSearch.tsx` - Semantic search
  **Agent: ai-integration**
  - Full-text search
  - AI-powered suggestions
  - Filter by type/tag

### 4.4 Academia Views
**Agent: general-purpose**

- [ ] `AcademiaHome.tsx`
- [ ] `JourneyDetail.tsx`
- [ ] `NotesView.tsx`
- [ ] `MentorshipsView.tsx`
- [ ] `PortfolioView.tsx`

### 4.5 Academia Integration
**Agent: calendar-executive**

- [ ] Study session calendar sync
- [ ] Mentorship meeting reminders
- [ ] Deadline notifications

**Acceptance Criteria for Phase 4:**
- Learning journeys tracked
- Notes with linking working
- Mentorship scheduling functional
- Credentials displayed
- Paper/library design applied

---

## Phase 5: Tribo Implementation

### 5.1 Tribo Database
**Agent: general-purpose (Backend Architect)**

- [ ] Create migration `20251214_connection_archetypes_tribo.sql`
  - [ ] `tribo_rituals` table
  - [ ] `tribo_ritual_occurrences` table
  - [ ] `tribo_shared_resources` table
  - [ ] `tribo_group_funds` table
  - [ ] `tribo_fund_contributions` table
  - [ ] `tribo_discussions` table
  - [ ] `tribo_discussion_replies` table
  - [ ] Indexes and RLS policies

### 5.2 Tribo Types & Services
**Agent: general-purpose**

- [ ] Create types for rituals, resources, funds, discussions
- [ ] Create services: ritualService, resourceService, fundService, discussionService

### 5.3 Tribo Components
**Agent: general-purpose (Frontend Core)**

- [ ] `TriboDashboard.tsx` - Community hub
  - Next ritual
  - Active funds
  - Recent discussions
  - Member activity

- [ ] `RitualCard.tsx` - Recurring event
  - Next occurrence
  - Typical attendance
  - Quick RSVP

- [ ] `RitualRSVP.tsx` - RSVP interface
  - Yes/No/Maybe
  - Bring list assignment
  - Notes

- [ ] `BringListEditor.tsx` - What to bring
  - Item list
  - Assignment to members
  - Check-off on day

- [ ] `SharedResourceCard.tsx` - Equipment display
  - Photo, name
  - Availability status
  - Reserve button

- [ ] `GroupFundCard.tsx` - Vaquinha display
  - Progress bar
  - Deadline
  - Contributors
  - Contribute button

- [ ] `ContributionTracker.tsx` - Who paid
  - Member list with status
  - Total raised
  - Pending amounts

- [ ] `DiscussionThread.tsx` - Topic view
  - Original post
  - Replies with threading
  - Reactions
  - Resolve button

- [ ] `PollVoting.tsx` - Decision polls
  - Options
  - Vote counts
  - Deadline
  - Results visualization

- [ ] `MemberDirectory.tsx` - Contextual profiles
  - Photo, name
  - Role in group
  - Contact options

### 5.4 Tribo Views
**Agent: general-purpose**

- [ ] `TriboHome.tsx`
- [ ] `RitualDetail.tsx`
- [ ] `ResourcesView.tsx`
- [ ] `FundsView.tsx`
- [ ] `DiscussionsView.tsx`

### 5.5 Tribo Integration
**Agent: calendar-executive**

- [ ] Ritual calendar sync
- [ ] RSVP reminders
- [ ] Fund deadline notifications

**Acceptance Criteria for Phase 5:**
- Ritual management complete
- Resource sharing functional
- Group funds with tracking
- Discussions with replies
- Warm/social design applied

---

## Phase 6: Integration & Polish

### 6.1 Navigation & Routing
**Agent: general-purpose**

- [ ] Update `App.tsx` routes for archetypes
- [ ] Create archetype sub-navigation
- [ ] Breadcrumb component
- [ ] Deep linking support

### 6.2 Finance Integration
**Agent: general-purpose**

- [ ] Habitat expense sync to personal finance
- [ ] Ventures revenue import
- [ ] Tribo fund contribution tracking
- [ ] Shared transaction categorization

### 6.3 Calendar Integration
**Agent: calendar-executive**

- [ ] Event sync (all archetypes)
- [ ] Reminder configuration
- [ ] Conflict detection
- [ ] Timezone handling

### 6.4 Performance Optimization
**Agent: general-purpose**

- [ ] Lazy loading for archetype modules
- [ ] Virtual lists for large datasets
- [ ] Image optimization
- [ ] Query caching strategy

### 6.5 E2E Testing
**Agent: testing-qa**

- [ ] Space creation flows (all archetypes)
- [ ] Member management
- [ ] Event creation and RSVP
- [ ] Financial operations
- [ ] Document upload

### 6.6 Documentation
**Agent: general-purpose**

- [ ] API documentation
- [ ] Component storybook entries
- [ ] User guide for each archetype

---

## Quick Reference: Agent Assignments

| Agent | Primary Responsibilities |
|-------|--------------------------|
| `general-purpose` (Backend) | Database, services, business logic |
| `general-purpose` (Frontend) | Components, hooks, views |
| `calendar-executive` | Calendar integration, event sync |
| `ai-integration` | Note AI features, knowledge search |
| `gamification-agent` | Ventures milestones, achievements |
| `security-privacy` | RLS policies audit, data protection |
| `testing-qa` | E2E tests, QA strategy |

---

## Estimated Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1 | 2 weeks | Week 1 | Week 2 |
| Phase 2 | 2 weeks | Week 3 | Week 4 |
| Phase 3 | 2 weeks | Week 5 | Week 6 |
| Phase 4 | 2 weeks | Week 7 | Week 8 |
| Phase 5 | 2 weeks | Week 9 | Week 10 |
| Phase 6 | 2 weeks | Week 11 | Week 12 |

**Total: 12 weeks (3 months)**

---

*Last Updated: 2025-12-13*
*Status: Ready for Implementation*
