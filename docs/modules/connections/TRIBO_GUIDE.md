# Tribo Archetype Guide

**Community Groups & Social Coordination**

## Overview

The **Tribo** archetype is your social fabric for coordinating clubs, friend groups, communities, and collective activities. Embodying the "Tecido Social" (Social Fabric) philosophy, Tribo provides warm, community-focused tools for organizing rituals, sharing resources, and nurturing belonging.

### Purpose

- Coordinate recurring group events (rituals)
- Manage RSVP and attendance tracking
- Share equipment and resources among members
- Organize collective funding (vaquinhas)
- Facilitate group discussions and decisions
- Build community bonds and traditions

### Design Philosophy

Tribo embodies a **gathering place aesthetic** - warm, welcoming, and community-oriented. Think of it as your group's living room where everyone feels at home.

**Color Scheme:**
- Primary: Forest green (#059669, #10b981) for growth and community
- Secondary: Emerald (#34d399) for energy and vibrancy
- Accents: Earth tones (terracotta, warm brown, ochre)
- Backgrounds: Warm creams and soft greens

**Visual Elements:**
- Rounded, friendly shapes
- Group-oriented iconography (👥, 🎉, 🤝, 🌱)
- Avatar grids for member presence
- Calendar-based ritual displays
- Progress indicators for collective goals
- Warm, inviting color transitions

---

## Database Schema

### Tables

#### 1. tribo_rituals
Recurring group events and traditions.

```sql
id                    UUID PRIMARY KEY
space_id              UUID (connection space reference)

-- Ritual details
name                  TEXT NOT NULL
description           TEXT
recurrence_rule       TEXT NOT NULL (iCal RRULE format)

-- Schedule
default_time          TIME
default_duration_minutes INTEGER (default 60)
default_location      TEXT

-- Participation
is_mandatory          BOOLEAN (default FALSE)
typical_attendance    INTEGER

-- Status
is_active             BOOLEAN (default TRUE)
next_occurrence_at    TIMESTAMPTZ

created_at, updated_at TIMESTAMPTZ
```

**Recurrence Examples:**
- Weekly: `FREQ=WEEKLY;BYDAY=TU` (every Tuesday)
- Bi-weekly: `FREQ=WEEKLY;INTERVAL=2;BYDAY=SA` (every other Saturday)
- Monthly: `FREQ=MONTHLY;BYMONTHDAY=15` (15th of each month)
- Custom: `FREQ=MONTHLY;BYDAY=1FR` (first Friday of each month)

#### 2. tribo_ritual_occurrences
Specific instances of rituals with RSVP and logistics.

```sql
id                    UUID PRIMARY KEY
ritual_id             UUID (tribo_rituals reference)
event_id              UUID (connection_events reference, optional)

-- Occurrence details
occurrence_date       TIMESTAMPTZ NOT NULL
location              TEXT
notes                 TEXT

-- Logistics
bring_list            JSONB (array of items to bring)
  -- Example: [
  --   {item: "Violão", assignedTo: "uuid", completed: false},
  --   {item: "Bebidas", assignedTo: null, completed: false}
  -- ]

-- RSVP tracking
rsvp_data             JSONB (member responses)
  -- Example: {
  --   "member-uuid-1": "yes",
  --   "member-uuid-2": "no",
  --   "member-uuid-3": "maybe"
  -- }

-- Status and attendance
status                TEXT (scheduled, completed, cancelled)
actual_attendance     INTEGER

created_at, updated_at TIMESTAMPTZ
```

**RSVP Options:**
- yes: Attending
- no: Not attending
- maybe: Tentative

**Bring List Structure:**
```json
[
  {
    "item": "Violão para jam session",
    "assignedTo": "uuid-of-member",
    "completed": false,
    "notes": "Qualquer violão serve"
  },
  {
    "item": "Bebidas",
    "assignedTo": null,
    "completed": false
  }
]
```

#### 3. tribo_shared_resources
Equipment and items shared among group members.

```sql
id                    UUID PRIMARY KEY
space_id              UUID (connection space reference)

-- Resource details
name                  TEXT NOT NULL
description           TEXT
category              TEXT (equipment, space, vehicle, other)

-- Availability
is_available          BOOLEAN (default TRUE)
current_holder_id     UUID (connection_members reference)
checked_out_at        TIMESTAMPTZ
return_date           DATE

-- Value and documentation
estimated_value       NUMERIC(10, 2)
images                TEXT[] (photo URLs)
usage_notes           TEXT

created_at, updated_at TIMESTAMPTZ
```

**Resource Categories:**
- equipment: Camping gear, sports equipment, tools
- space: Meeting room, practice space, storage
- vehicle: Car sharing, bike sharing
- other: Books, board games, costumes

#### 4. tribo_group_funds
Collective financing and expense tracking (vaquinhas).

```sql
id                    UUID PRIMARY KEY
space_id              UUID (connection space reference)

-- Fund details
name                  TEXT NOT NULL
description           TEXT
goal_amount           NUMERIC(10, 2)
current_amount        NUMERIC(10, 2) (default 0)

-- Timeline
deadline              DATE
completed_at          TIMESTAMPTZ

-- Contributions
contributions_data    JSONB
  -- Example: {
  --   "member-uuid-1": {amount: 50.00, paid: true},
  --   "member-uuid-2": {amount: 30.00, paid: false}
  -- }

-- Status
status                TEXT (active, completed, cancelled)
fund_type             TEXT (equal_split, voluntary, pledged)

-- Usage
purpose               TEXT
disbursement_notes    TEXT

created_at, updated_at TIMESTAMPTZ
```

**Fund Types:**
- equal_split: Everyone pays same amount
- voluntary: Pay what you can
- pledged: Committed amounts per person

#### 5. tribo_discussions
Forum-style conversations and decision-making.

```sql
id                    UUID PRIMARY KEY
space_id              UUID (connection space reference)
created_by            UUID (connection_members reference)

-- Discussion details
title                 TEXT NOT NULL
content               TEXT NOT NULL
discussion_type       TEXT (general, proposal, question, announcement)

-- Categorization
category              TEXT
tags                  TEXT[]

-- Engagement
view_count            INTEGER (default 0)
reply_count           INTEGER (default 0)
is_pinned             BOOLEAN (default FALSE)
is_locked             BOOLEAN (default FALSE)

-- Voting (for proposals)
voting_enabled        BOOLEAN (default FALSE)
voting_deadline       TIMESTAMPTZ
votes_data            JSONB
  -- Example: {
  --   "member-uuid-1": "yes",
  --   "member-uuid-2": "no",
  --   "member-uuid-3": "abstain"
  -- }

-- Status
status                TEXT (active, resolved, closed)

created_at, updated_at TIMESTAMPTZ
```

**Discussion Types:**
- general: Open conversation
- proposal: Decision requiring group input
- question: Seeking answers/advice
- announcement: One-way information

---

## Components

### TriboDashboard
**Path:** `src/modules/connections/tribo/components/TriboDashboard.tsx`

Main dashboard for community overview.

**Features:**
- Upcoming rituals calendar
- Pending RSVPs
- Active group funds progress
- Available shared resources
- Recent discussions
- Member activity feed
- Empty states for new communities

**Props:**
```tsx
{
  spaceId: string;
}
```

### RitualCard
**Path:** `src/modules/connections/tribo/components/RitualCard.tsx`

Display recurring ritual information.

**Features:**
- Ritual name and description
- Recurrence pattern in human-readable format
- Next occurrence countdown
- Typical attendance display
- Active/inactive badge
- Click to view details
- Quick RSVP for next occurrence

**Props:**
```tsx
{
  ritual: TriboRitual;
  nextOccurrence?: TriboRitualOccurrence;
  onClick?: () => void;
}
```

### OccurrenceCard
**Path:** `src/modules/connections/tribo/components/OccurrenceCard.tsx`

Specific ritual occurrence with RSVP.

**Features:**
- Date, time, location
- RSVP summary (5 yes, 2 no, 1 maybe)
- Bring list with assignments
- Attendance tracking
- Notes section
- Status badge

**Props:**
```tsx
{
  occurrence: TriboRitualOccurrence;
  ritual: TriboRitual;
  currentMemberId: string;
  onRSVP: (response: 'yes' | 'no' | 'maybe') => void;
  onAssignItem: (itemIndex: number) => void;
}
```

### RSVPWidget
**Path:** `src/modules/connections/tribo/components/RSVPWidget.tsx`

RSVP interface with member avatars.

**Features:**
- Three-button RSVP (Yes/No/Maybe)
- Member avatar grid by response
- Response count summary
- Current user's response highlighted
- Quick toggle

**Props:**
```tsx
{
  occurrence: TriboRitualOccurrence;
  members: ConnectionMember[];
  currentMemberId: string;
  onRSVP: (response: 'yes' | 'no' | 'maybe') => void;
}
```

### BringList
**Path:** `src/modules/connections/tribo/components/BringList.tsx`

Logistics coordinator for events.

**Features:**
- List of items needed
- Assignment to members
- Completion checkboxes
- Add/remove items
- Volunteer button for unassigned items
- Notes per item

**Props:**
```tsx
{
  bringList: BringListItem[];
  members: ConnectionMember[];
  currentMemberId: string;
  onAssign: (itemIndex: number, memberId: string) => void;
  onToggleComplete: (itemIndex: number) => void;
  onAddItem: (item: string) => void;
}
```

### ResourceCard
**Path:** `src/modules/connections/tribo/components/ResourceCard.tsx`

Shared resource display and booking.

**Features:**
- Resource name and description
- Category badge
- Availability status
- Current holder (if checked out)
- Return date countdown
- Photos carousel
- Check out/return buttons
- Usage notes

**Props:**
```tsx
{
  resource: TriboSharedResource;
  currentMemberId: string;
  onCheckOut: () => void;
  onReturn: () => void;
  onClick?: () => void;
}
```

### GroupFundCard
**Path:** `src/modules/connections/tribo/components/GroupFundCard.tsx`

Collective fund progress and contribution.

**Features:**
- Fund name and purpose
- Progress bar (current vs goal)
- Contribution list with member names
- Payment status indicators
- Deadline countdown
- Contribute button
- Success celebration when goal reached

**Props:**
```tsx
{
  fund: TriboGroupFund;
  members: ConnectionMember[];
  currentMemberId: string;
  onContribute: () => void;
}
```

### DiscussionThread
**Path:** `src/modules/connections/tribo/components/DiscussionThread.tsx`

Forum-style discussion display.

**Features:**
- Discussion title and content
- Author and timestamp
- Reply count and view count
- Voting interface (if enabled)
- Reply button
- Pin/lock indicators
- Tag display

**Props:**
```tsx
{
  discussion: TriboDiscussion;
  onReply: () => void;
  onVote?: (vote: 'yes' | 'no' | 'abstain') => void;
}
```

---

## Views

### TriboHome
**Path:** `src/modules/connections/tribo/views/TriboHome.tsx`

Main entry point for Tribo archetype.

**Route:** `/connections/tribo/:spaceId`

**Features:**
- Dashboard overview
- Quick stats (upcoming rituals, active funds, available resources)
- Loading and error states
- Empty state for new communities

### RitualsCalendar
**Path:** `src/modules/connections/tribo/views/RitualsCalendar.tsx`

Calendar view of all rituals and occurrences.

**Route:** `/connections/tribo/:spaceId/rituals`

**Features:**
- Monthly calendar view
- Ritual occurrences marked
- Create new ritual button
- Filter by ritual type
- RSVP status indicators
- Click to view details

### RitualDetail
**Path:** `src/modules/connections/tribo/views/RitualDetail.tsx`

Detailed view of a ritual and its occurrences.

**Route:** `/connections/tribo/:spaceId/ritual/:ritualId`

**Features:**
- Ritual information
- Recurrence pattern
- List of upcoming occurrences
- Past occurrences archive
- Edit ritual settings
- Deactivate ritual

### OccurrenceDetail
**Path:** `src/modules/connections/tribo/views/OccurrenceDetail.tsx`

Detailed view of a specific occurrence.

**Route:** `/connections/tribo/:spaceId/occurrence/:occurrenceId`

**Features:**
- Full occurrence information
- RSVP widget
- Bring list management
- Location map (future)
- Notes and photos
- Mark as completed
- Cancel occurrence

### ResourceLibrary
**Path:** `src/modules/connections/tribo/views/ResourceLibrary.tsx`

Shared resources management.

**Route:** `/connections/tribo/:spaceId/resources`

**Features:**
- Grid of available resources
- Filter by category
- Filter by availability
- Add new resource button
- Check out history
- Resource detail modal

### GroupFundsView
**Path:** `src/modules/connections/tribo/views/GroupFundsView.tsx`

Collective financing management.

**Route:** `/connections/tribo/:spaceId/funds`

**Features:**
- Active funds list
- Completed funds archive
- Create new fund button
- Contribution tracking
- Payment reminders
- Disbursement records

### DiscussionsView
**Path:** `src/modules/connections/tribo/views/DiscussionsView.tsx`

Community forum and decision-making.

**Route:** `/connections/tribo/:spaceId/discussions`

**Features:**
- Discussion list
- Filter by type (general, proposal, question)
- Sort by recent, popular, unresolved
- Create new discussion button
- Voting on proposals
- Reply threads

---

## Services & Hooks

### Services
Located in `src/modules/connections/tribo/services/`

**ritualService.ts**
- `getRitualsBySpace(spaceId)` - Get all rituals
- `createRitual(payload)` - Create new ritual
- `updateRitual(ritualId, payload)` - Update ritual
- `deleteRitual(ritualId)` - Delete ritual
- `deactivateRitual(ritualId)` - Set is_active = false
- `generateOccurrences(ritualId, months)` - Create future occurrences

**occurrenceService.ts**
- `getOccurrencesByRitual(ritualId)` - Get all occurrences
- `createOccurrence(payload)` - Create manual occurrence
- `updateOccurrence(occurrenceId, payload)` - Update occurrence
- `rsvpOccurrence(occurrenceId, memberId, response)` - Set RSVP
- `updateBringList(occurrenceId, bringList)` - Update items
- `completeOccurrence(occurrenceId, actualAttendance)` - Mark done
- `cancelOccurrence(occurrenceId)` - Cancel event

**resourceService.ts**
- `getResourcesBySpace(spaceId)` - Get all resources
- `createResource(payload)` - Add resource
- `updateResource(resourceId, payload)` - Update resource
- `deleteResource(resourceId)` - Remove resource
- `checkOutResource(resourceId, memberId, returnDate)` - Borrow
- `returnResource(resourceId)` - Return to pool

**fundService.ts**
- `getFundsBySpace(spaceId)` - Get all funds
- `createFund(payload)` - Create new fund
- `updateFund(fundId, payload)` - Update fund
- `deleteFund(fundId)` - Remove fund
- `addContribution(fundId, memberId, amount, paid)` - Record contribution
- `markContributionPaid(fundId, memberId)` - Mark as paid
- `completeFund(fundId)` - Close fund

**discussionService.ts**
- `getDiscussionsBySpace(spaceId)` - Get all discussions
- `createDiscussion(payload)` - Start discussion
- `updateDiscussion(discussionId, payload)` - Update discussion
- `deleteDiscussion(discussionId)` - Remove discussion
- `incrementViewCount(discussionId)` - Track views
- `vote(discussionId, memberId, vote)` - Cast vote
- `pinDiscussion(discussionId)` - Pin to top
- `closeDiscussion(discussionId)` - Mark resolved

### Hooks
Located in `src/modules/connections/tribo/hooks/`

**useRituals.ts**
```tsx
const {
  rituals,
  activeRituals,
  loading,
  error,
  createRitual,
  updateRitual,
  deactivateRitual
} = useRituals(spaceId);
```

**useOccurrences.ts**
```tsx
const {
  occurrences,
  upcomingOccurrences,
  loading,
  error,
  rsvp,
  updateBringList,
  completeOccurrence
} = useOccurrences(ritualId);
```

**useResources.ts**
```tsx
const {
  resources,
  availableResources,
  loading,
  error,
  createResource,
  checkOutResource,
  returnResource
} = useResources(spaceId);
```

**useFunds.ts**
```tsx
const {
  funds,
  activeFunds,
  loading,
  error,
  createFund,
  addContribution,
  markPaid
} = useFunds(spaceId);
```

**useDiscussions.ts**
```tsx
const {
  discussions,
  loading,
  error,
  createDiscussion,
  vote,
  incrementViewCount
} = useDiscussions(spaceId);
```

---

## Setup Instructions

### 1. Run Database Migration

```bash
# Apply the Tribo migration
supabase migration up 20251214400000_connection_tribo

# Verify tables were created
supabase db tables list | grep tribo
```

### 2. Create Your Tribo Space

```tsx
import { supabase } from '@/lib/supabase';

// Create connection space for your community
const { data: space } = await supabase
  .from('connection_spaces')
  .insert({
    user_id: currentUserId,
    archetype: 'tribo',
    name: 'Rio Biohackers',
    subtitle: 'Comunidade de saúde e bem-estar',
    icon: '🌱',
    color_theme: 'forest-green'
  })
  .select()
  .single();

// Add members
await supabase.from('connection_members').insert([
  { space_id: space.id, user_id: member1Id, role: 'admin' },
  { space_id: space.id, user_id: member2Id, role: 'member' },
  { space_id: space.id, user_id: member3Id, role: 'member' }
]);
```

### 3. Create Your First Ritual

```tsx
import { ritualService } from '@/modules/connections/tribo';

const ritual = await ritualService.createRitual({
  space_id: space.id,
  name: 'Weekly Meetup',
  description: 'Nossa reunião semanal de terça à noite',
  recurrence_rule: 'FREQ=WEEKLY;BYDAY=TU',
  default_time: '19:00:00',
  default_duration_minutes: 120,
  default_location: 'Parque Lage',
  typical_attendance: 8,
  is_mandatory: false,
  is_active: true
});

// Generate next 3 months of occurrences
await ritualService.generateOccurrences(ritual.id, 3);
```

### 4. Add Shared Resources

```tsx
import { resourceService } from '@/modules/connections/tribo';

await resourceService.createResource({
  space_id: space.id,
  name: 'Barraca de camping 6 pessoas',
  description: 'Barraca para trilhas e camping',
  category: 'equipment',
  estimated_value: 800.00,
  usage_notes: 'Lembrar de secar antes de guardar',
  is_available: true
});
```

---

## Example Workflows

### Workflow 1: Weekly Meetup Management

**Goal:** Coordinate a weekly group gathering with RSVPs and logistics.

**Steps:**

1. **Create Ritual**
   ```tsx
   const ritual = await ritualService.createRitual({
     space_id: spaceId,
     name: 'Jam Session Semanal',
     recurrence_rule: 'FREQ=WEEKLY;BYDAY=SA',
     default_time: '15:00:00',
     default_duration_minutes: 180,
     default_location: 'Casa do João',
     typical_attendance: 6
   });
   ```

2. **Generate Occurrences**
   ```tsx
   await ritualService.generateOccurrences(ritual.id, 2);
   ```

3. **Members RSVP**
   ```tsx
   // Each member responds
   await occurrenceService.rsvpOccurrence(
     nextOccurrenceId,
     currentMemberId,
     'yes'
   );
   ```

4. **Add Bring List**
   ```tsx
   await occurrenceService.updateBringList(nextOccurrenceId, [
     { item: 'Violão', assignedTo: member1Id, completed: false },
     { item: 'Bebidas', assignedTo: member2Id, completed: false },
     { item: 'Snacks', assignedTo: null, completed: false }
   ]);
   ```

5. **After Event, Mark Complete**
   ```tsx
   await occurrenceService.completeOccurrence(
     occurrenceId,
     5 // actual attendance
   );
   ```

### Workflow 2: Camping Trip Organization

**Goal:** Plan a group camping trip using rituals and resources.

**Steps:**

1. **Create One-time Occurrence**
   ```tsx
   const campingTrip = await occurrenceService.createOccurrence({
     ritual_id: null, // Not recurring
     occurrence_date: addWeeks(new Date(), 3),
     location: 'Serra dos Órgãos',
     notes: 'Trilha de 2 dias com camping'
   });
   ```

2. **Set Up Bring List**
   ```tsx
   await occurrenceService.updateBringList(campingTrip.id, [
     { item: 'Barraca 6 pessoas', assignedTo: null },
     { item: 'Fogareiro', assignedTo: null },
     { item: 'Comida - Café da manhã', assignedTo: null },
     { item: 'Comida - Almoço', assignedTo: null },
     { item: 'Comida - Jantar', assignedTo: null }
   ]);
   ```

3. **Check Out Shared Resource**
   ```tsx
   await resourceService.checkOutResource(
     tentResourceId,
     currentMemberId,
     campingTrip.occurrence_date
   );

   // Assign to bring list
   await occurrenceService.updateBringList(campingTrip.id, [
     { item: 'Barraca 6 pessoas', assignedTo: currentMemberId, completed: true },
     // ... other items
   ]);
   ```

4. **Create Group Fund**
   ```tsx
   const fund = await fundService.createFund({
     space_id: spaceId,
     name: 'Vaquinha Camping Serra dos Órgãos',
     description: 'Combustível e alimentação compartilhada',
     goal_amount: 500.00,
     deadline: campingTrip.occurrence_date,
     fund_type: 'equal_split',
     status: 'active'
   });

   // Each member contributes
   await fundService.addContribution(
     fund.id,
     currentMemberId,
     100.00, // Their share
     true // Paid
   );
   ```

5. **After Trip**
   ```tsx
   // Return resource
   await resourceService.returnResource(tentResourceId);

   // Complete occurrence
   await occurrenceService.completeOccurrence(campingTrip.id, 6);

   // Close fund
   await fundService.completeFund(fund.id);
   ```

### Workflow 3: Group Decision Making

**Goal:** Make a collective decision about changing meeting location.

**Steps:**

1. **Create Proposal Discussion**
   ```tsx
   const discussion = await discussionService.createDiscussion({
     space_id: spaceId,
     created_by: currentMemberId,
     title: 'Proposta: Mudar local das reuniões',
     content: `
       Pessoal, tenho notado que o Parque Lage está muito cheio aos sábados.

       Proposta: Mudar para o Jardim Botânico ou revezar entre locais.

       Vantagens:
       - Mais tranquilo
       - Melhor estacionamento
       - Cafeteria próxima

       O que vocês acham?
     `,
     discussion_type: 'proposal',
     voting_enabled: true,
     voting_deadline: addDays(new Date(), 7),
     category: 'logistics'
   });
   ```

2. **Members Vote**
   ```tsx
   // Each member votes
   await discussionService.vote(
     discussion.id,
     currentMemberId,
     'yes'
   );
   ```

3. **Review Results**
   ```tsx
   // After deadline
   const votes = discussion.votes_data;
   const yesCount = Object.values(votes).filter(v => v === 'yes').length;
   const totalVotes = Object.keys(votes).length;

   if (yesCount / totalVotes > 0.5) {
     // Majority approved, update ritual
     await ritualService.updateRitual(weeklyRitualId, {
       default_location: 'Jardim Botânico'
     });

     // Close discussion
     await discussionService.closeDiscussion(discussion.id);
   }
   ```

### Workflow 4: Resource Sharing Among Friends

**Goal:** Share expensive equipment among group members.

**Steps:**

1. **Add Equipment**
   ```tsx
   const camera = await resourceService.createResource({
     space_id: spaceId,
     name: 'GoPro Hero 11',
     description: 'Action camera para vídeos',
     category: 'equipment',
     estimated_value: 2500.00,
     images: ['https://storage/gopro.jpg'],
     usage_notes: 'Lembrar de carregar bateria e retornar com cartão SD vazio'
   });
   ```

2. **Member Borrows**
   ```tsx
   await resourceService.checkOutResource(
     camera.id,
     borrowerId,
     addDays(new Date(), 7) // Return in 1 week
   );
   ```

3. **Reminder Before Return Date**
   ```tsx
   // Automated reminder (cron job or scheduled notification)
   if (differenceInDays(returnDate, new Date()) === 1) {
     sendNotification(borrowerId, {
       title: 'Devolução amanhã',
       body: `Lembrete: GoPro deve ser devolvida amanhã`
     });
   }
   ```

4. **Return Resource**
   ```tsx
   await resourceService.returnResource(camera.id);
   ```

5. **Next Member Requests**
   ```tsx
   // Check if available
   const { availableResources } = useResources(spaceId);

   if (cameraIsAvailable) {
     await resourceService.checkOutResource(
       camera.id,
       nextMemberId,
       addDays(new Date(), 5)
     );
   }
   ```

---

## Best Practices

### Ritual Management

1. **Set Realistic Recurrence**
   - Weekly rituals require high commitment
   - Monthly rituals work better for loose groups
   - Bi-weekly is a good balance

2. **Typical Attendance**
   - Track actual attendance over time
   - Adjust typical_attendance quarterly
   - Use for space/resource planning

3. **Mandatory vs Optional**
   - Use is_mandatory sparingly
   - Creates pressure and reduces flexibility
   - Better to build culture of participation

### RSVP Culture

1. **Encourage Early RSVP**
   - Set RSVP deadline 2-3 days before event
   - Send reminders to non-responders
   - Allow "maybe" for flexibility

2. **Follow Up**
   - Thank those who RSVP'd yes
   - Understand why people can't attend
   - Adjust schedule if needed

### Resource Sharing

1. **Clear Usage Guidelines**
   - Document how to use equipment
   - Set expectations for condition
   - Include cleaning/maintenance instructions

2. **Track Condition**
   - Take photos before/after checkout
   - Report damage immediately
   - Shared responsibility for repairs

3. **Return Reminders**
   - Automated reminders 1 day before
   - Grace period of 1-2 days
   - Address late returns promptly

### Group Funds

1. **Transparent Tracking**
   - Show all contributions publicly
   - Update payment status immediately
   - Share receipts for disbursements

2. **Fair Splitting**
   - Use equal_split for simple expenses
   - Use voluntary for variable participation
   - Use pledged when members have different capacity

3. **Close Funds Promptly**
   - Complete fund after goal reached
   - Share final accounting
   - Return excess funds or donate

---

## Integration Points

### Connection Events
Sync ritual occurrences to calendar:

```tsx
// Create calendar event for occurrence
await eventService.createEvent({
  space_id: spaceId,
  title: `${ritual.name}`,
  description: occurrence.notes,
  starts_at: occurrence.occurrence_date,
  ends_at: addMinutes(occurrence.occurrence_date, ritual.default_duration_minutes),
  location: occurrence.location || ritual.default_location,
  event_type: 'social',
  rsvp_enabled: true
});

// Link to occurrence
await occurrenceService.updateOccurrence(occurrence.id, {
  event_id: createdEvent.id
});
```

### Connection Transactions
Link fund contributions to transactions:

```tsx
// Record contribution as transaction
await transactionService.createTransaction({
  space_id: spaceId,
  description: `Vaquinha: ${fund.name}`,
  amount: contributionAmount,
  type: 'expense',
  category: 'group-fund',
  transaction_date: new Date()
});
```

### Connection Documents
Store group resources:

```tsx
// Upload resource manual
await documentService.uploadDocument({
  space_id: spaceId,
  file_name: 'GoPro Manual.pdf',
  category: 'manual',
  tags: ['resource', resource.name]
});
```

---

## Troubleshooting

### Issue: Recurrence rule not generating occurrences

**Solution:**
```tsx
// Validate RRULE format
import { rrulestr } from 'rrule';

try {
  const rule = rrulestr(recurrenceRule);
  const nextDates = rule.all((date, i) => i < 10); // Next 10 occurrences
} catch (error) {
  console.error('Invalid RRULE:', error);
}

// Common patterns:
// Weekly Tuesday: 'FREQ=WEEKLY;BYDAY=TU'
// Monthly 1st Friday: 'FREQ=MONTHLY;BYDAY=1FR'
// Bi-weekly Saturday: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=SA'
```

### Issue: RSVP data not updating

**Solution:**
- Ensure rsvp_data is valid JSONB
- Use proper member_id UUIDs
- Update entire object, not merge

```tsx
const currentRsvp = occurrence.rsvp_data || {};
const updatedRsvp = {
  ...currentRsvp,
  [memberId]: response
};

await occurrenceService.updateOccurrence(occurrenceId, {
  rsvp_data: updatedRsvp
});
```

### Issue: Resource shows as unavailable but no current holder

**Solution:**
- Check is_available boolean
- Ensure current_holder_id is null
- Verify return_date has passed

```tsx
// Force return if stuck
await resourceService.updateResource(resourceId, {
  is_available: true,
  current_holder_id: null,
  checked_out_at: null,
  return_date: null
});
```

---

## Additional Resources

- **Database Schema:** `supabase/migrations/20251214400000_connection_tribo.sql`
- **Type Definitions:** `src/modules/connections/tribo/types.ts`
- **Base Connection Schema:** `docs/CONNECTION_ARCHETYPES_README.md`
- **iCalendar RRULE Spec:** https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html

---

**Last Updated:** December 14, 2025
**Version:** 1.0.0
**Status:** Production Ready
