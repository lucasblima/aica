-- ============================================================================
-- MIGRATION: Connection Archetypes Base Schema
-- Date: 2025-12-14
-- Author: Aica System Architecture
--
-- PURPOSE:
-- Create base tables for Connection Archetypes system:
-- - connection_spaces: Main table for all archetype instances
-- - connection_members: Members within each connection space
-- - connection_events: Shared events/calendar items
-- - connection_documents: Shared documents and files
-- - connection_transactions: Shared financial transactions
--
-- ARCHETYPES SUPPORTED:
-- 1. habitat - Family/Home connections
-- 2. ventures - Business/Entrepreneurship connections
-- 3. academia - Education/Academic connections
-- 4. tribo - Community/Tribe connections
--
-- SECURITY PATTERN:
-- All tables use SECURITY DEFINER functions to prevent RLS recursion
-- and provide centralized permission logic (Single Source of Truth)
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE ENUM TYPES
-- ============================================================================

-- Enum for archetype types
CREATE TYPE public.connection_archetype_type AS ENUM (
    'habitat',
    'ventures',
    'academia',
    'tribo'
);

-- Enum for member roles
CREATE TYPE public.connection_member_role AS ENUM (
    'owner',
    'admin',
    'member',
    'guest'
);

-- Enum for event types
CREATE TYPE public.connection_event_type AS ENUM (
    'meeting',
    'social',
    'milestone',
    'deadline',
    'other'
);

-- Enum for transaction types
CREATE TYPE public.connection_transaction_type AS ENUM (
    'income',
    'expense',
    'transfer'
);

-- Enum for transaction split types
CREATE TYPE public.connection_transaction_split_type AS ENUM (
    'equal',
    'percentage',
    'custom',
    'payer_only'
);

-- ============================================================================
-- PART 2: CREATE SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================

-- Function: Check if user is a member of a connection space
CREATE OR REPLACE FUNCTION public.is_connection_space_member(
    _space_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.connection_members
        WHERE space_id = _space_id
          AND user_id = auth.uid()
          AND is_active = TRUE
    );
END;
$$;

COMMENT ON FUNCTION public.is_connection_space_member(uuid) IS
'Check if current user is an active member of a connection space';

-- Function: Check if user is an admin of a connection space
CREATE OR REPLACE FUNCTION public.is_connection_space_admin(
    _space_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.connection_members
        WHERE space_id = _space_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND is_active = TRUE
    );
END;
$$;

COMMENT ON FUNCTION public.is_connection_space_admin(uuid) IS
'Check if current user is an owner or admin of a connection space';

-- Function: Check if user is the owner of a connection space
CREATE OR REPLACE FUNCTION public.is_connection_space_owner(
    _space_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.connection_spaces
        WHERE id = _space_id
          AND user_id = auth.uid()
    );
END;
$$;

COMMENT ON FUNCTION public.is_connection_space_owner(uuid) IS
'Check if current user is the owner of a connection space';

-- ============================================================================
-- PART 3: CREATE CONNECTION_SPACES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connection_spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Archetype and basic info
    archetype public.connection_archetype_type NOT NULL,
    name TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,

    -- Visual settings
    icon TEXT,
    color_theme TEXT,
    cover_image_url TEXT,

    -- Status and activity
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_favorite BOOLEAN DEFAULT FALSE NOT NULL,
    last_accessed_at TIMESTAMPTZ,

    -- Settings and metadata
    settings JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_name_not_empty CHECK (name <> '')
);

COMMENT ON TABLE public.connection_spaces IS
'Main table for Connection Archetypes. Stores all instances of habitat, ventures, academia, and tribo spaces per user.';
COMMENT ON COLUMN public.connection_spaces.archetype IS 'Type of connection: habitat (family), ventures (business), academia (education), or tribo (community)';
COMMENT ON COLUMN public.connection_spaces.settings IS 'JSONB for flexible storage of archetype-specific settings';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_connection_spaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_connection_spaces_updated_at
    BEFORE UPDATE ON public.connection_spaces
    FOR EACH ROW
    EXECUTE FUNCTION public.update_connection_spaces_updated_at();

-- Enable RLS
ALTER TABLE public.connection_spaces ENABLE ROW LEVEL SECURITY;

-- RLS Policies for connection_spaces
CREATE POLICY "connection_spaces_select"
    ON public.connection_spaces FOR SELECT
    USING (
        user_id = auth.uid()  -- Owner can always view
        OR
        is_connection_space_member(id)  -- Member can view
    );

CREATE POLICY "connection_spaces_insert"
    ON public.connection_spaces FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "connection_spaces_update"
    ON public.connection_spaces FOR UPDATE
    USING (is_connection_space_owner(id))  -- Only owner can update space
    WITH CHECK (is_connection_space_owner(id));

CREATE POLICY "connection_spaces_delete"
    ON public.connection_spaces FOR DELETE
    USING (is_connection_space_owner(id));  -- Only owner can delete

-- Indexes for connection_spaces
CREATE INDEX idx_connection_spaces_user_id
    ON public.connection_spaces(user_id);
CREATE INDEX idx_connection_spaces_archetype
    ON public.connection_spaces(user_id, archetype);
CREATE INDEX idx_connection_spaces_is_active
    ON public.connection_spaces(user_id, is_active)
    WHERE is_active = TRUE;
CREATE INDEX idx_connection_spaces_is_favorite
    ON public.connection_spaces(user_id, is_favorite)
    WHERE is_favorite = TRUE;
CREATE INDEX idx_connection_spaces_created_at
    ON public.connection_spaces(user_id, created_at DESC);

-- ============================================================================
-- PART 4: CREATE CONNECTION_MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connection_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- External member info (for non-Aica users)
    external_name TEXT,
    external_email TEXT,
    external_phone TEXT,
    external_avatar_url TEXT,

    -- Role and permissions
    role public.connection_member_role DEFAULT 'member' NOT NULL,
    permissions JSONB DEFAULT '{}'::jsonb,

    -- Context information
    context_label TEXT,
    context_data JSONB DEFAULT '{}'::jsonb,

    -- Status and activity
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_interaction_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT member_identifier_required CHECK (
        user_id IS NOT NULL
        OR external_email IS NOT NULL
        OR external_phone IS NOT NULL
    ),
    CONSTRAINT unique_aica_member_per_space UNIQUE(space_id, user_id) WHERE user_id IS NOT NULL,
    CONSTRAINT unique_external_email_per_space UNIQUE(space_id, external_email) WHERE external_email IS NOT NULL
);

COMMENT ON TABLE public.connection_members IS
'Stores members of connection spaces. Supports both Aica users (via user_id) and external members (via email/phone).';
COMMENT ON COLUMN public.connection_members.permissions IS 'JSONB for flexible, granular permissions per member';
COMMENT ON COLUMN public.connection_members.context_data IS 'JSONB for archetype-specific member metadata';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_connection_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_connection_members_updated_at
    BEFORE UPDATE ON public.connection_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_connection_members_updated_at();

-- Enable RLS
ALTER TABLE public.connection_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for connection_members
CREATE POLICY "connection_members_select"
    ON public.connection_members FOR SELECT
    USING (
        user_id = auth.uid()  -- Can see own membership
        OR
        is_connection_space_admin(space_id)  -- Admin can see all members
    );

CREATE POLICY "connection_members_insert"
    ON public.connection_members FOR INSERT
    WITH CHECK (is_connection_space_admin(space_id));

CREATE POLICY "connection_members_update"
    ON public.connection_members FOR UPDATE
    USING (is_connection_space_admin(space_id))
    WITH CHECK (is_connection_space_admin(space_id));

CREATE POLICY "connection_members_delete"
    ON public.connection_members FOR DELETE
    USING (is_connection_space_admin(space_id));

-- Indexes for connection_members
CREATE INDEX idx_connection_members_space_id
    ON public.connection_members(space_id);
CREATE INDEX idx_connection_members_user_id
    ON public.connection_members(user_id);
CREATE INDEX idx_connection_members_space_user
    ON public.connection_members(space_id, user_id);
CREATE INDEX idx_connection_members_role
    ON public.connection_members(space_id, role);
CREATE INDEX idx_connection_members_is_active
    ON public.connection_members(space_id, is_active)
    WHERE is_active = TRUE;
CREATE INDEX idx_connection_members_external_email
    ON public.connection_members(space_id, external_email)
    WHERE external_email IS NOT NULL;

-- ============================================================================
-- PART 5: CREATE CONNECTION_EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connection_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Event details
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,

    -- Date/Time
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    is_all_day BOOLEAN DEFAULT FALSE NOT NULL,
    recurrence_rule TEXT,  -- iCal RRULE format

    -- Event configuration
    event_type public.connection_event_type DEFAULT 'other' NOT NULL,
    rsvp_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    rsvp_deadline TIMESTAMPTZ,

    -- External integrations
    google_event_id TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_title_not_empty CHECK (title <> '')
);

COMMENT ON TABLE public.connection_events IS
'Shared events within connection spaces. Can be synced with Google Calendar.';
COMMENT ON COLUMN public.connection_events.recurrence_rule IS 'RFC 5545 RRULE for recurring events';
COMMENT ON COLUMN public.connection_events.google_event_id IS 'Google Calendar event ID for synchronization';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_connection_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_connection_events_updated_at
    BEFORE UPDATE ON public.connection_events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_connection_events_updated_at();

-- Enable RLS
ALTER TABLE public.connection_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for connection_events
CREATE POLICY "connection_events_select"
    ON public.connection_events FOR SELECT
    USING (is_connection_space_member(space_id));

CREATE POLICY "connection_events_insert"
    ON public.connection_events FOR INSERT
    WITH CHECK (
        is_connection_space_member(space_id)
        AND created_by = auth.uid()
    );

CREATE POLICY "connection_events_update"
    ON public.connection_events FOR UPDATE
    USING (
        created_by = auth.uid()  -- Creator can update
        OR
        is_connection_space_admin(space_id)  -- Admin can update
    )
    WITH CHECK (
        created_by = auth.uid()
        OR
        is_connection_space_admin(space_id)
    );

CREATE POLICY "connection_events_delete"
    ON public.connection_events FOR DELETE
    USING (
        created_by = auth.uid()
        OR
        is_connection_space_admin(space_id)
    );

-- Indexes for connection_events
CREATE INDEX idx_connection_events_space_id
    ON public.connection_events(space_id);
CREATE INDEX idx_connection_events_created_by
    ON public.connection_events(created_by);
CREATE INDEX idx_connection_events_starts_at
    ON public.connection_events(space_id, starts_at DESC);
CREATE INDEX idx_connection_events_date_range
    ON public.connection_events(space_id, starts_at, ends_at);
CREATE INDEX idx_connection_events_google_id
    ON public.connection_events(google_event_id)
    WHERE google_event_id IS NOT NULL;
CREATE INDEX idx_connection_events_recurring
    ON public.connection_events(space_id, recurrence_rule)
    WHERE recurrence_rule IS NOT NULL;

-- ============================================================================
-- PART 6: CREATE CONNECTION_DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connection_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- File information
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,

    -- Categorization
    category TEXT,
    tags TEXT[] DEFAULT '{}'::text[],

    -- Versioning
    version INTEGER DEFAULT 1 NOT NULL,
    parent_document_id UUID REFERENCES public.connection_documents(id) ON DELETE SET NULL,

    -- Lifecycle
    expires_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_file_name_not_empty CHECK (file_name <> ''),
    CONSTRAINT check_file_path_not_empty CHECK (file_path <> ''),
    CONSTRAINT check_file_size_positive CHECK (file_size_bytes > 0),
    CONSTRAINT check_version_positive CHECK (version > 0)
);

COMMENT ON TABLE public.connection_documents IS
'Shared documents and files within connection spaces.';
COMMENT ON COLUMN public.connection_documents.parent_document_id IS 'Reference to earlier version for document versioning';
COMMENT ON COLUMN public.connection_documents.tags IS 'Array of string tags for flexible categorization';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_connection_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_connection_documents_updated_at
    BEFORE UPDATE ON public.connection_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_connection_documents_updated_at();

-- Enable RLS
ALTER TABLE public.connection_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for connection_documents
CREATE POLICY "connection_documents_select"
    ON public.connection_documents FOR SELECT
    USING (is_connection_space_member(space_id));

CREATE POLICY "connection_documents_insert"
    ON public.connection_documents FOR INSERT
    WITH CHECK (
        is_connection_space_member(space_id)
        AND uploaded_by = auth.uid()
    );

CREATE POLICY "connection_documents_update"
    ON public.connection_documents FOR UPDATE
    USING (
        uploaded_by = auth.uid()
        OR
        is_connection_space_admin(space_id)
    )
    WITH CHECK (
        uploaded_by = auth.uid()
        OR
        is_connection_space_admin(space_id)
    );

CREATE POLICY "connection_documents_delete"
    ON public.connection_documents FOR DELETE
    USING (
        uploaded_by = auth.uid()
        OR
        is_connection_space_admin(space_id)
    );

-- Indexes for connection_documents
CREATE INDEX idx_connection_documents_space_id
    ON public.connection_documents(space_id);
CREATE INDEX idx_connection_documents_uploaded_by
    ON public.connection_documents(uploaded_by);
CREATE INDEX idx_connection_documents_category
    ON public.connection_documents(space_id, category)
    WHERE category IS NOT NULL;
CREATE INDEX idx_connection_documents_tags
    ON public.connection_documents USING GIN(tags);
CREATE INDEX idx_connection_documents_created_at
    ON public.connection_documents(space_id, created_at DESC);
CREATE INDEX idx_connection_documents_expires_at
    ON public.connection_documents(expires_at)
    WHERE expires_at IS NOT NULL;
CREATE INDEX idx_connection_documents_parent
    ON public.connection_documents(parent_document_id)
    WHERE parent_document_id IS NOT NULL;

-- ============================================================================
-- PART 7: CREATE CONNECTION_TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connection_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Transaction details
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    type public.connection_transaction_type NOT NULL,
    category TEXT,

    -- Date information
    transaction_date TIMESTAMPTZ NOT NULL,

    -- Split information
    split_type public.connection_transaction_split_type DEFAULT 'payer_only' NOT NULL,
    split_data JSONB DEFAULT '{}'::jsonb,

    -- Payment tracking
    is_paid BOOLEAN DEFAULT FALSE NOT NULL,
    paid_at TIMESTAMPTZ,
    paid_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Recurring transactions
    is_recurring BOOLEAN DEFAULT FALSE NOT NULL,
    recurrence_rule TEXT,  -- iCal RRULE format

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_description_not_empty CHECK (description <> ''),
    CONSTRAINT check_amount_positive CHECK (amount > 0),
    CONSTRAINT check_currency_not_empty CHECK (currency <> '')
);

COMMENT ON TABLE public.connection_transactions IS
'Shared financial transactions within connection spaces with support for splits and recurring transactions.';
COMMENT ON COLUMN public.connection_transactions.split_data IS 'JSONB containing split details: member_id -> percentage/amount depending on split_type';
COMMENT ON COLUMN public.connection_transactions.recurrence_rule IS 'RFC 5545 RRULE for recurring transactions';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_connection_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_connection_transactions_updated_at
    BEFORE UPDATE ON public.connection_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_connection_transactions_updated_at();

-- Enable RLS
ALTER TABLE public.connection_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for connection_transactions
CREATE POLICY "connection_transactions_select"
    ON public.connection_transactions FOR SELECT
    USING (is_connection_space_member(space_id));

CREATE POLICY "connection_transactions_insert"
    ON public.connection_transactions FOR INSERT
    WITH CHECK (
        is_connection_space_member(space_id)
        AND created_by = auth.uid()
    );

CREATE POLICY "connection_transactions_update"
    ON public.connection_transactions FOR UPDATE
    USING (
        created_by = auth.uid()
        OR
        is_connection_space_admin(space_id)
    )
    WITH CHECK (
        created_by = auth.uid()
        OR
        is_connection_space_admin(space_id)
    );

CREATE POLICY "connection_transactions_delete"
    ON public.connection_transactions FOR DELETE
    USING (
        created_by = auth.uid()
        OR
        is_connection_space_admin(space_id)
    );

-- Indexes for connection_transactions
CREATE INDEX idx_connection_transactions_space_id
    ON public.connection_transactions(space_id);
CREATE INDEX idx_connection_transactions_created_by
    ON public.connection_transactions(created_by);
CREATE INDEX idx_connection_transactions_date
    ON public.connection_transactions(space_id, transaction_date DESC);
CREATE INDEX idx_connection_transactions_type
    ON public.connection_transactions(space_id, type);
CREATE INDEX idx_connection_transactions_category
    ON public.connection_transactions(space_id, category)
    WHERE category IS NOT NULL;
CREATE INDEX idx_connection_transactions_is_paid
    ON public.connection_transactions(space_id, is_paid)
    WHERE is_paid = FALSE;
CREATE INDEX idx_connection_transactions_recurring
    ON public.connection_transactions(space_id, recurrence_rule)
    WHERE is_recurring = TRUE;

-- ============================================================================
-- PART 8: GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_spaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_transactions TO authenticated;

-- Grant usage on sequences (for UUID generation)
GRANT USAGE ON SEQUENCE pg_catalog.pg_class_oid_index TO authenticated;

-- ============================================================================
-- PART 9: MIGRATION COMPLETION VERIFICATION
-- ============================================================================

-- Tables created:
-- 1. connection_spaces
-- 2. connection_members
-- 3. connection_events
-- 4. connection_documents
-- 5. connection_transactions
--
-- Functions created:
-- 1. is_connection_space_member(uuid)
-- 2. is_connection_space_admin(uuid)
-- 3. is_connection_space_owner(uuid)
--
-- Enum types created:
-- 1. connection_archetype_type
-- 2. connection_member_role
-- 3. connection_event_type
-- 4. connection_transaction_type
-- 5. connection_transaction_split_type
--
-- RLS Policies:
-- - All tables have RLS enabled
-- - All CRUD operations (SELECT, INSERT, UPDATE, DELETE) are protected
-- - All complex logic uses SECURITY DEFINER functions
-- - No direct table queries in USING/WITH CHECK clauses (prevents recursion)
--
-- Verification query:
-- SELECT tablename, policyname FROM pg_policies
-- WHERE tablename IN ('connection_spaces', 'connection_members', 'connection_events',
--                     'connection_documents', 'connection_transactions')
-- ORDER BY tablename, policyname;
