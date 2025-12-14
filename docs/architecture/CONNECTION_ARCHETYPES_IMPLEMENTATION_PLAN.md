# Connection Archetypes - Implementation Plan

## Executive Summary

This document defines the comprehensive implementation strategy for the four Connection Archetypes in Aica Life OS: **Habitat**, **Ventures**, **Academia**, and **Tribo**. Each archetype represents a distinct domain of human connection and organization, with specific data models, UI patterns, and integration points.

---

## 1. Architecture Overview

### 1.1 Current System Context

Based on codebase analysis:

- **Frontend Stack**: React + TypeScript + Vite + Tailwind CSS + Framer Motion
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Design System**: Ceramic Design Language (ceramic-card, ceramic-inset, ceramic-tray, ceramic-concave)
- **Module Pattern**: `src/modules/{module-name}/` with components, hooks, services, types, views
- **Existing Integrations**: Finance Module, Grants Module, Journey Module, Calendar, Podcast

### 1.2 Design System Tokens (from `tailwind.config.js` and `index.css`)

```css
/* Core Ceramic Colors */
ceramic-base: #F0EFE9
ceramic-text-primary: #5C554B
ceramic-text-secondary: #948D82
ceramic-accent: #D97706 (Glazed Amber)
ceramic-positive: #6B7B5C (Sage moss)
ceramic-negative: #9B4D3A (Terracotta)

/* Temperature Colors */
ceramic-cool: #E8EBE9 (inactive/rest)
ceramic-warm: #F5E6D3 (selected/active)

/* Shadow System */
ceramic-card: 6px 6px 12px shadow
ceramic-inset: inset shadows for pills/inputs
ceramic-tray: rectangular inset for grids
ceramic-concave: circular buttons
```

### 1.3 Module Structure Pattern

```
src/modules/{archetype}/
  components/       # UI components
  hooks/           # React hooks (data fetching, state)
  services/        # Supabase queries, business logic
  types.ts         # TypeScript interfaces
  views/           # Page-level components
  index.ts         # Public exports
```

---

## 2. Database Schema Design

### 2.1 Shared Tables (Connection Infrastructure)

```sql
-- ============================================
-- CONNECTION_SPACES (Base table for all archetypes)
-- ============================================
CREATE TABLE connection_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Classification
  archetype TEXT NOT NULL CHECK (archetype IN ('habitat', 'ventures', 'academia', 'tribo')),
  name TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,

  -- Visual
  icon TEXT DEFAULT 'default',
  color_theme TEXT DEFAULT 'neutral', -- 'earth', 'amber', 'paper', 'warm'
  cover_image_url TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_favorite BOOLEAN DEFAULT false,
  last_accessed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONNECTION_MEMBERS (People in spaces)
-- ============================================
CREATE TABLE connection_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),

  -- External member (not Aica user)
  external_name TEXT,
  external_email TEXT,
  external_phone TEXT,
  external_avatar_url TEXT,

  -- Role & Access
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member', 'guest'
  permissions JSONB DEFAULT '{}',

  -- Context (role varies by archetype)
  context_label TEXT, -- 'Morador', 'Socio', 'Mentor', 'Membro'
  context_data JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_interaction_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONNECTION_EVENTS (Shared calendar events)
-- ============================================
CREATE TABLE connection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,

  -- Timing
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE,
  is_all_day BOOLEAN DEFAULT false,
  recurrence_rule TEXT, -- iCal RRULE format

  -- Type (varies by archetype)
  event_type TEXT, -- 'manutencao', 'reuniao', 'aula', 'encontro'

  -- RSVP
  rsvp_enabled BOOLEAN DEFAULT true,
  rsvp_deadline TIMESTAMP WITH TIME ZONE,

  -- Calendar sync
  google_event_id TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONNECTION_DOCUMENTS (Shared files)
-- ============================================
CREATE TABLE connection_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),

  -- File info
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT, -- 'pdf', 'image', 'document'
  file_size_bytes INTEGER,

  -- Classification
  category TEXT, -- 'contrato', 'regulamento', 'certificado', etc.
  tags TEXT[],

  -- Versioning
  version INTEGER DEFAULT 1,
  parent_document_id UUID REFERENCES connection_documents(id),

  -- Expiration (for warranties, contracts)
  expires_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONNECTION_TRANSACTIONS (Shared finances)
-- ============================================
CREATE TABLE connection_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Transaction details
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  category TEXT,

  -- Date
  transaction_date DATE NOT NULL,

  -- Split/Rateio
  split_type TEXT DEFAULT 'equal', -- 'equal', 'percentage', 'fixed'
  split_data JSONB DEFAULT '[]', -- [{member_id, percentage/amount, paid}]

  -- Status
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_by UUID REFERENCES auth.users(id),

  -- Recurrence
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,

  -- Integration with personal finance
  personal_transaction_id UUID REFERENCES finance_transactions(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 Habitat-Specific Tables

```sql
-- ============================================
-- HABITAT: Property Management
-- ============================================
CREATE TABLE habitat_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,

  -- Property info
  property_type TEXT NOT NULL, -- 'apartment', 'house', 'condo', 'room'
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'BR',

  -- Building info (if applicable)
  building_name TEXT,
  unit_number TEXT,
  floor_number INTEGER,

  -- Amenities
  bedrooms INTEGER,
  bathrooms INTEGER,
  parking_spots INTEGER,
  area_sqm NUMERIC(8, 2),

  -- Management
  condominium_fee NUMERIC(10, 2),
  rent_value NUMERIC(10, 2),
  property_tax_annual NUMERIC(10, 2),

  -- Contacts
  portaria_phone TEXT,
  sindico_name TEXT,
  sindico_phone TEXT,
  administradora_name TEXT,
  administradora_phone TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- HABITAT: Inventory (Appliances, Items)
-- ============================================
CREATE TABLE habitat_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES habitat_properties(id) ON DELETE CASCADE,

  -- Item info
  name TEXT NOT NULL,
  category TEXT, -- 'eletrodomestico', 'moveis', 'eletronicos', 'outros'
  brand TEXT,
  model TEXT,
  serial_number TEXT,

  -- Purchase info
  purchase_date DATE,
  purchase_price NUMERIC(10, 2),
  purchase_location TEXT,

  -- Warranty
  warranty_expiry DATE,
  warranty_document_id UUID REFERENCES connection_documents(id),

  -- Location in property
  room TEXT,
  notes TEXT,

  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'maintenance', 'sold', 'disposed'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- HABITAT: Maintenance Log
-- ============================================
CREATE TABLE habitat_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES habitat_properties(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES habitat_inventory(id),

  -- Maintenance info
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'preventiva', 'corretiva', 'melhoria'
  urgency TEXT DEFAULT 'normal', -- 'baixa', 'normal', 'alta', 'emergencia'

  -- Scheduling
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Service provider
  provider_name TEXT,
  provider_phone TEXT,
  provider_email TEXT,

  -- Cost
  estimated_cost NUMERIC(10, 2),
  actual_cost NUMERIC(10, 2),
  transaction_id UUID REFERENCES connection_transactions(id),

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'scheduled', 'in_progress', 'completed', 'cancelled'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.3 Ventures-Specific Tables

```sql
-- ============================================
-- VENTURES: Business Entity
-- ============================================
CREATE TABLE ventures_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,

  -- Legal info
  legal_name TEXT NOT NULL,
  trading_name TEXT,
  cnpj TEXT,
  entity_type TEXT, -- 'MEI', 'EIRELI', 'LTDA', 'SA', 'SLU', 'STARTUP'

  -- Contact
  email TEXT,
  phone TEXT,
  website TEXT,

  -- Address
  address_line1 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,

  -- Dates
  founded_at DATE,

  -- Sector
  sector TEXT,
  subsector TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- VENTURES: Financial Metrics (Dashboard)
-- ============================================
CREATE TABLE ventures_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES ventures_entities(id) ON DELETE CASCADE,

  -- Period
  period_type TEXT NOT NULL, -- 'monthly', 'quarterly', 'yearly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Revenue
  mrr NUMERIC(12, 2), -- Monthly Recurring Revenue
  arr NUMERIC(12, 2), -- Annual Recurring Revenue
  total_revenue NUMERIC(12, 2),

  -- Expenses
  total_expenses NUMERIC(12, 2),
  payroll NUMERIC(12, 2),
  operational NUMERIC(12, 2),

  -- Health
  burn_rate NUMERIC(12, 2),
  runway_months INTEGER,
  gross_margin_pct NUMERIC(5, 2),

  -- Customers (if applicable)
  active_customers INTEGER,
  churn_rate_pct NUMERIC(5, 2),
  cac NUMERIC(10, 2), -- Customer Acquisition Cost
  ltv NUMERIC(10, 2), -- Lifetime Value

  -- Status
  is_current BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- VENTURES: Milestones
-- ============================================
CREATE TABLE ventures_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES ventures_entities(id) ON DELETE CASCADE,

  -- Milestone info
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'produto', 'financeiro', 'equipe', 'legal', 'mercado'

  -- Target
  target_date DATE,
  target_value NUMERIC(12, 2),
  target_metric TEXT,

  -- Progress
  current_value NUMERIC(12, 2),
  progress_pct INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'achieved', 'missed'

  -- Completion
  achieved_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- VENTURES: Stakeholders (Investors, Advisors)
-- ============================================
CREATE TABLE ventures_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES ventures_entities(id) ON DELETE CASCADE,
  member_id UUID REFERENCES connection_members(id),

  -- Role
  stakeholder_type TEXT NOT NULL, -- 'founder', 'investor', 'advisor', 'employee', 'contractor'

  -- Equity (if applicable)
  equity_pct NUMERIC(5, 2),
  vesting_start_date DATE,
  vesting_cliff_months INTEGER,
  vesting_period_months INTEGER,

  -- Investment (if investor)
  investment_amount NUMERIC(12, 2),
  investment_date DATE,
  investment_round TEXT, -- 'pre-seed', 'seed', 'series-a', etc.

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.4 Academia-Specific Tables

```sql
-- ============================================
-- ACADEMIA: Learning Journeys
-- ============================================
CREATE TABLE academia_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,

  -- Course info
  title TEXT NOT NULL,
  provider TEXT, -- 'Coursera', 'Udemy', 'University', 'Self-study'
  instructor TEXT,

  -- Type
  journey_type TEXT, -- 'course', 'book', 'certification', 'mentorship', 'workshop'

  -- Progress
  total_modules INTEGER,
  completed_modules INTEGER DEFAULT 0,
  progress_pct INTEGER DEFAULT 0,

  -- Dates
  started_at TIMESTAMP WITH TIME ZONE,
  target_completion DATE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Time tracking
  estimated_hours INTEGER,
  logged_hours INTEGER DEFAULT 0,

  -- Materials
  url TEXT,
  materials_path TEXT,

  -- Status
  status TEXT DEFAULT 'active', -- 'planned', 'active', 'paused', 'completed', 'abandoned'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ACADEMIA: Knowledge Notes (Zettelkasten)
-- ============================================
CREATE TABLE academia_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES academia_journeys(id),

  -- Note content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'markdown', -- 'markdown', 'plain'

  -- Zettelkasten features
  note_type TEXT DEFAULT 'fleeting', -- 'fleeting', 'literature', 'permanent'
  source_reference TEXT,

  -- Linking
  linked_note_ids UUID[],
  tags TEXT[],

  -- AI-enhanced
  ai_summary TEXT,
  ai_key_concepts TEXT[],

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ACADEMIA: Mentorships
-- ============================================
CREATE TABLE academia_mentorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,

  -- Relationship
  mentor_member_id UUID REFERENCES connection_members(id),
  mentee_member_id UUID REFERENCES connection_members(id),
  relationship_type TEXT NOT NULL, -- 'giving', 'receiving'

  -- Focus
  focus_areas TEXT[],
  objectives JSONB DEFAULT '[]',

  -- Schedule
  frequency TEXT, -- 'weekly', 'biweekly', 'monthly'
  duration_minutes INTEGER DEFAULT 60,
  next_session_at TIMESTAMP WITH TIME ZONE,

  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ACADEMIA: Credentials (Certificates, Diplomas)
-- ============================================
CREATE TABLE academia_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES academia_journeys(id),

  -- Credential info
  title TEXT NOT NULL,
  issuer TEXT NOT NULL,
  credential_type TEXT, -- 'certificate', 'diploma', 'badge', 'publication'

  -- Dates
  issued_at DATE NOT NULL,
  expires_at DATE,

  -- Verification
  credential_url TEXT,
  credential_id TEXT,

  -- Document
  document_id UUID REFERENCES connection_documents(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.5 Tribo-Specific Tables

```sql
-- ============================================
-- TRIBO: Rituals (Recurring Events)
-- ============================================
CREATE TABLE tribo_rituals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,

  -- Ritual info
  name TEXT NOT NULL,
  description TEXT,

  -- Schedule
  recurrence_rule TEXT NOT NULL, -- iCal RRULE
  default_time TIME,
  default_duration_minutes INTEGER,
  default_location TEXT,

  -- Participation
  is_mandatory BOOLEAN DEFAULT false,
  typical_attendance INTEGER,

  -- Status
  is_active BOOLEAN DEFAULT true,
  next_occurrence_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRIBO: Ritual Occurrences (Specific instances)
-- ============================================
CREATE TABLE tribo_ritual_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ritual_id UUID NOT NULL REFERENCES tribo_rituals(id) ON DELETE CASCADE,
  event_id UUID REFERENCES connection_events(id),

  -- Occurrence specifics
  occurrence_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  notes TEXT,

  -- What to bring
  bring_list JSONB DEFAULT '[]', -- [{item, assigned_to}]

  -- RSVP tracking
  rsvp_data JSONB DEFAULT '{}', -- {member_id: 'yes'|'no'|'maybe'}

  -- Status
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRIBO: Shared Resources
-- ============================================
CREATE TABLE tribo_shared_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,

  -- Resource info
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'equipment', 'space', 'vehicle', 'other'

  -- Availability
  is_available BOOLEAN DEFAULT true,
  current_holder_id UUID REFERENCES connection_members(id),
  return_date DATE,

  -- Value
  estimated_value NUMERIC(10, 2),

  -- Images
  images TEXT[],

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRIBO: Group Funds (Vaquinhas)
-- ============================================
CREATE TABLE tribo_group_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,

  -- Fund info
  title TEXT NOT NULL,
  description TEXT,
  purpose TEXT,

  -- Target
  target_amount NUMERIC(10, 2) NOT NULL,
  deadline DATE,

  -- Progress
  current_amount NUMERIC(10, 2) DEFAULT 0,

  -- Contributions
  contribution_type TEXT DEFAULT 'voluntary', -- 'voluntary', 'mandatory', 'proportional'

  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  completed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRIBO: Fund Contributions
-- ============================================
CREATE TABLE tribo_fund_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES tribo_group_funds(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES connection_members(id),

  -- Contribution
  amount NUMERIC(10, 2) NOT NULL,
  contributed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Status
  is_confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMP WITH TIME ZONE,

  -- Payment
  payment_method TEXT,
  transaction_id UUID REFERENCES connection_transactions(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRIBO: Discussion Topics (Low-noise communication)
-- ============================================
CREATE TABLE tribo_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Topic
  title TEXT NOT NULL,
  content TEXT,
  category TEXT, -- 'announcement', 'question', 'decision', 'general'

  -- Voting (for decisions)
  is_poll BOOLEAN DEFAULT false,
  poll_options JSONB DEFAULT '[]',
  poll_deadline TIMESTAMP WITH TIME ZONE,

  -- Status
  is_pinned BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,

  -- Engagement
  reply_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRIBO: Discussion Replies
-- ============================================
CREATE TABLE tribo_discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES tribo_discussions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),

  -- Reply
  content TEXT NOT NULL,

  -- Threading
  parent_reply_id UUID REFERENCES tribo_discussion_replies(id),

  -- Reactions
  reactions JSONB DEFAULT '{}', -- {emoji: [user_ids]}

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.6 RLS Policies

```sql
-- ============================================
-- RLS POLICIES (Security Definer Pattern)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE connection_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_transactions ENABLE ROW LEVEL SECURITY;
-- ... (enable for all archetype-specific tables)

-- Helper function: Check space membership
CREATE OR REPLACE FUNCTION is_space_member(_space_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM connection_members
    WHERE space_id = _space_id
      AND (user_id = auth.uid() OR external_email = current_setting('request.jwt.claims', true)::json->>'email')
      AND is_active = true
  );
END;
$$;

-- Helper function: Check space ownership
CREATE OR REPLACE FUNCTION is_space_owner(_space_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM connection_spaces
    WHERE id = _space_id
      AND user_id = auth.uid()
  );
END;
$$;

-- CONNECTION_SPACES: Select
CREATE POLICY "spaces_select"
  ON connection_spaces FOR SELECT
  USING (user_id = auth.uid() OR is_space_member(id));

-- CONNECTION_SPACES: Insert (own spaces only)
CREATE POLICY "spaces_insert"
  ON connection_spaces FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- CONNECTION_SPACES: Update (owner or admin)
CREATE POLICY "spaces_update"
  ON connection_spaces FOR UPDATE
  USING (user_id = auth.uid());

-- CONNECTION_MEMBERS: Select (members of same space)
CREATE POLICY "members_select"
  ON connection_members FOR SELECT
  USING (is_space_member(space_id));

-- ... (similar patterns for all tables)
```

---

## 3. Component Architecture

### 3.1 Shared Components

```
src/modules/connections/
  components/
    SpaceCard.tsx           # Card display for any space type
    SpaceHeader.tsx         # Header with icon, title, members count
    SpaceMemberList.tsx     # Member avatars/list
    SpaceEventsList.tsx     # Upcoming events
    SpaceDocuments.tsx      # Document list with categories
    SpaceTransactions.tsx   # Financial transactions
    CreateSpaceWizard.tsx   # Multi-step creation
    SpaceSettings.tsx       # Settings modal
  hooks/
    useSpace.ts             # Single space data
    useSpaces.ts            # All user spaces
    useSpaceMembers.ts      # Members of a space
    useSpaceEvents.ts       # Events in a space
  services/
    spaceService.ts         # CRUD for connection_spaces
    memberService.ts        # CRUD for connection_members
  types.ts                  # Shared types
```

### 3.2 Habitat Components

```
src/modules/connections/habitat/
  components/
    HabitatDashboard.tsx      # Main view
    PropertyCard.tsx          # Property summary
    MaintenanceTracker.tsx    # Pending/scheduled maintenance
    InventoryGrid.tsx         # Appliances grid
    InventoryItemCard.tsx     # Individual item
    WarrantyAlert.tsx         # Expiring warranties
    ExpenseSplitter.tsx       # Rateio UI
    CondoContacts.tsx         # Portaria, sindico, etc.
  views/
    HabitatHome.tsx
    PropertyDetail.tsx
    MaintenanceView.tsx
    InventoryView.tsx
```

### 3.3 Ventures Components

```
src/modules/connections/ventures/
  components/
    VenturesDashboard.tsx     # Main cockpit
    HealthGauge.tsx           # Burn rate, runway visual
    MetricsCard.tsx           # KPI card with trend
    MilestoneTimeline.tsx     # Progress timeline
    StakeholderGrid.tsx       # Founders, investors
    EquityTable.tsx           # Cap table
    MRRChart.tsx              # Revenue trend
  views/
    VenturesHome.tsx
    EntityDetail.tsx
    MetricsHistory.tsx
    TeamView.tsx
```

### 3.4 Academia Components

```
src/modules/connections/academia/
  components/
    AcademiaDashboard.tsx     # Library view
    JourneyCard.tsx           # Course/book card
    JourneyProgress.tsx       # Progress ring
    NoteEditor.tsx            # Markdown editor
    NoteGraph.tsx             # Zettelkasten visualization
    MentorshipCard.tsx        # Mentor/mentee relationship
    CredentialCard.tsx        # Certificate display
    KnowledgeSearch.tsx       # Search across notes
  views/
    AcademiaHome.tsx
    JourneyDetail.tsx
    NotesView.tsx
    MentorshipsView.tsx
    PortfolioView.tsx
```

### 3.5 Tribo Components

```
src/modules/connections/tribo/
  components/
    TriboDashboard.tsx        # Community hub
    RitualCard.tsx            # Recurring event
    RitualRSVP.tsx            # RSVP interface
    BringListEditor.tsx       # What to bring
    SharedResourceCard.tsx    # Equipment/space
    GroupFundCard.tsx         # Vaquinha progress
    ContributionTracker.tsx   # Who contributed
    DiscussionThread.tsx      # Topic + replies
    PollVoting.tsx            # Decision polls
    MemberDirectory.tsx       # Contextual profiles
  views/
    TriboHome.tsx
    RitualDetail.tsx
    ResourcesView.tsx
    FundsView.tsx
    DiscussionsView.tsx
```

---

## 4. Design Philosophy by Archetype

### 4.1 Habitat (Earth Tones)
- **Color Palette**: Browns, taupes, muted greens
- **Cards**: Heavy, grounded `ceramic-card` with 32px radius
- **Metaphor**: "Control Panel" - dashboard-like layout
- **Typography**: Bold headers, clear sections
- **Animations**: Subtle, stable transitions

### 4.2 Ventures (Amber/Precision)
- **Color Palette**: Amber accent, neutral grays, crisp whites
- **Cards**: Elevated `ceramic-card` with numbers prominently displayed
- **Metaphor**: "Cockpit" - data-driven, metrics visible
- **Typography**: Precise, numerical emphasis
- **Animations**: Dynamic but contained

### 4.3 Academia (Paper/Library)
- **Color Palette**: Warm whites, cream, light grays
- **Cards**: Light-weight, paper-like appearance
- **Metaphor**: "Library" - spacious, typographic focus
- **Typography**: Typography is queen - elegant, readable
- **Animations**: Page-turn effects, subtle fades

### 4.4 Tribo (Warm/Social)
- **Color Palette**: Warm oranges, terracotta, inviting colors
- **Cards**: `ceramic-concave` for photos, card-like invitations
- **Metaphor**: "Campfire" - gathering place, welcoming
- **Typography**: Friendly, rounded
- **Animations**: Warm pulses, gathering effects

---

## 5. Integration Points

### 5.1 Finance Module Integration
- **Habitat**: Auto-import condominium fees, utilities
- **Ventures**: Business expenses, revenue tracking
- **Tribo**: Group fund contributions

```typescript
// Integration service
interface FinanceIntegration {
  syncSpaceTransaction(spaceTransactionId: string): Promise<void>;
  importToPersonalFinance(transaction: ConnectionTransaction): Promise<string>;
  getSpaceFinanceSummary(spaceId: string, period: DateRange): Promise<FinanceSummary>;
}
```

### 5.2 Calendar Integration
- **All archetypes**: Events sync to Google Calendar
- **Habitat**: Maintenance reminders
- **Academia**: Study sessions, mentorship meetings
- **Tribo**: Ritual occurrences

```typescript
// Calendar integration
interface CalendarIntegration {
  syncEventToGoogle(event: ConnectionEvent): Promise<string>;
  importCalendarToSpace(calendarId: string, spaceId: string): Promise<void>;
  createRecurringEvents(ritual: TriboRitual): Promise<void>;
}
```

### 5.3 Atlas (Task Management)
- **Ventures**: Milestones as high-level tasks
- **Academia**: Learning goals as tasks
- **Habitat**: Maintenance tasks

---

## 6. Implementation Order

### Phase 1: Foundation (Week 1-2)
1. Database migrations for shared tables
2. Base `SpaceService` with CRUD
3. `ConnectionArchetypes.tsx` enhancement
4. Space creation wizard

### Phase 2: Habitat (Week 3-4)
1. Habitat-specific migrations
2. Property management components
3. Inventory system
4. Maintenance tracker
5. Finance integration (rateio)

### Phase 3: Ventures (Week 5-6)
1. Ventures-specific migrations
2. Business entity management
3. Metrics dashboard
4. Milestone tracking
5. Stakeholder management

### Phase 4: Academia (Week 7-8)
1. Academia-specific migrations
2. Learning journey tracker
3. Note system (Zettelkasten)
4. Mentorship management
5. Credentials portfolio

### Phase 5: Tribo (Week 9-10)
1. Tribo-specific migrations
2. Ritual management
3. Shared resources
4. Group funds
5. Discussion system

### Phase 6: Polish & Integration (Week 11-12)
1. Cross-archetype navigation
2. Finance module deep integration
3. Calendar sync refinement
4. Performance optimization
5. E2E testing

---

## 7. Task Delegation Matrix

| Task Domain | Primary Agent | Supporting Agent |
|-------------|---------------|------------------|
| Database Schema | `general-purpose` (Backend Architect) | `security-privacy` |
| RLS Policies | `security-privacy` | `general-purpose` |
| Shared Components | `general-purpose` (Frontend Core) | - |
| Habitat Module | `general-purpose` | `calendar-executive` |
| Ventures Module | `general-purpose` | `gamification-agent` |
| Academia Module | `ai-integration` | `general-purpose` |
| Tribo Module | `general-purpose` | `calendar-executive` |
| Finance Integration | `general-purpose` | - |
| Calendar Integration | `calendar-executive` | - |
| E2E Testing | `testing-qa` | - |

---

## 8. Success Metrics

1. **Functional**: All 4 archetypes fully operational
2. **Performance**: < 200ms for space load, < 500ms for list views
3. **UX**: Consistent ceramic design across archetypes
4. **Integration**: Seamless finance/calendar sync
5. **Security**: All RLS policies passing audit

---

## Appendix A: File Locations

```
C:\Users\lucas\repos\Aica_frontend\Aica_frontend\
  src\
    modules\
      connections\           # NEW: All archetype code
        components\
        hooks\
        services\
        types.ts
        habitat\
        ventures\
        academia\
        tribo\
    components\
      ConnectionArchetypes.tsx  # Existing: Entry point
      ModuleCard.tsx            # Pattern reference
    lib\
      animations\
        ceramic-motion.ts       # Animation patterns
  supabase\
    migrations\
      20251214_connection_archetypes_base.sql      # NEW
      20251214_connection_archetypes_habitat.sql   # NEW
      20251214_connection_archetypes_ventures.sql  # NEW
      20251214_connection_archetypes_academia.sql  # NEW
      20251214_connection_archetypes_tribo.sql     # NEW
  tailwind.config.js           # Design tokens
  index.css                    # Ceramic classes
```

---

*Document Version: 1.0*
*Created: 2025-12-13*
*Author: Master Architect Agent*
