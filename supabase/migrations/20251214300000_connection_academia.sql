-- ============================================================================
-- MIGRATION: Connection Academia - Education & Learning Archetype
-- Date: 2025-12-14
-- Author: Aica System Architecture
--
-- PURPOSE:
-- Create tables for Academia archetype - the "Library" of learning:
-- - academia_journeys: Learning journeys (courses, books, certifications)
-- - academia_notes: Knowledge notes (Zettelkasten methodology)
-- - academia_mentorships: Mentorship relationships
-- - academia_credentials: Academic credentials and achievements
--
-- DESIGN PHILOSOPHY:
-- "Cultivo da Mente" - Library aesthetic, typography-focused, lots of whitespace
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE ACADEMIA_JOURNEYS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.academia_journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,

    -- Journey information
    title TEXT NOT NULL,
    description TEXT,
    provider TEXT,  -- 'Coursera', 'Udemy', 'University', 'Self-study', etc.
    instructor TEXT,
    journey_type TEXT NOT NULL,  -- 'course', 'book', 'certification', 'mentorship', 'workshop'

    -- Progress tracking
    total_modules INTEGER,
    completed_modules INTEGER DEFAULT 0,
    progress_pct INTEGER DEFAULT 0,

    -- Timeline
    started_at TIMESTAMPTZ,
    target_completion_date DATE,
    completed_at TIMESTAMPTZ,

    -- Time tracking
    estimated_hours INTEGER,
    logged_hours INTEGER DEFAULT 0,

    -- Resources
    url TEXT,
    materials_notes TEXT,

    -- Status
    status TEXT DEFAULT 'active',  -- 'planned', 'active', 'paused', 'completed', 'abandoned'

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_title_not_empty CHECK (title <> ''),
    CONSTRAINT check_progress_valid CHECK (progress_pct >= 0 AND progress_pct <= 100),
    CONSTRAINT check_completed_modules_valid CHECK (
        completed_modules >= 0 AND
        (total_modules IS NULL OR completed_modules <= total_modules)
    )
);

COMMENT ON TABLE public.academia_journeys IS
'Learning journeys: courses, books, certifications, and educational programs within Academia spaces.';
COMMENT ON COLUMN public.academia_journeys.journey_type IS 'Type of learning: course, book, certification, mentorship, workshop';
COMMENT ON COLUMN public.academia_journeys.status IS 'Current status: planned, active, paused, completed, abandoned';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_academia_journeys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_academia_journeys_updated_at
    BEFORE UPDATE ON public.academia_journeys
    FOR EACH ROW
    EXECUTE FUNCTION public.update_academia_journeys_updated_at();

-- Enable RLS
ALTER TABLE public.academia_journeys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "academia_journeys_select"
    ON public.academia_journeys FOR SELECT
    USING (is_connection_space_member(space_id));

CREATE POLICY "academia_journeys_insert"
    ON public.academia_journeys FOR INSERT
    WITH CHECK (is_connection_space_member(space_id));

CREATE POLICY "academia_journeys_update"
    ON public.academia_journeys FOR UPDATE
    USING (is_connection_space_member(space_id))
    WITH CHECK (is_connection_space_member(space_id));

CREATE POLICY "academia_journeys_delete"
    ON public.academia_journeys FOR DELETE
    USING (is_connection_space_admin(space_id));

-- Indexes
CREATE INDEX idx_academia_journeys_space_id
    ON public.academia_journeys(space_id);
CREATE INDEX idx_academia_journeys_status
    ON public.academia_journeys(space_id, status);
CREATE INDEX idx_academia_journeys_created_at
    ON public.academia_journeys(space_id, created_at DESC);
CREATE INDEX idx_academia_journeys_target_completion
    ON public.academia_journeys(target_completion_date)
    WHERE status IN ('planned', 'active', 'paused');

-- ============================================================================
-- PART 2: CREATE ACADEMIA_NOTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.academia_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
    journey_id UUID REFERENCES public.academia_journeys(id) ON DELETE SET NULL,

    -- Note content
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'markdown',

    -- Zettelkasten classification
    note_type TEXT DEFAULT 'fleeting',  -- 'fleeting', 'literature', 'permanent'

    -- Source and links
    source_reference TEXT,
    linked_note_ids UUID[] DEFAULT '{}'::uuid[],

    -- Categorization
    tags TEXT[] DEFAULT '{}'::text[],

    -- AI-enhanced metadata
    ai_summary TEXT,
    ai_key_concepts TEXT[] DEFAULT '{}'::text[],

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_title_not_empty CHECK (title <> ''),
    CONSTRAINT check_content_not_empty CHECK (content <> '')
);

COMMENT ON TABLE public.academia_notes IS
'Knowledge notes with Zettelkasten methodology: fleeting, literature, and permanent notes.';
COMMENT ON COLUMN public.academia_notes.note_type IS 'Zettelkasten classification: fleeting (quick thoughts), literature (from sources), permanent (synthesized knowledge)';
COMMENT ON COLUMN public.academia_notes.linked_note_ids IS 'Array of note IDs that this note links to (Zettelkasten connections)';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_academia_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_academia_notes_updated_at
    BEFORE UPDATE ON public.academia_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_academia_notes_updated_at();

-- Enable RLS
ALTER TABLE public.academia_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "academia_notes_select"
    ON public.academia_notes FOR SELECT
    USING (is_connection_space_member(space_id));

CREATE POLICY "academia_notes_insert"
    ON public.academia_notes FOR INSERT
    WITH CHECK (is_connection_space_member(space_id));

CREATE POLICY "academia_notes_update"
    ON public.academia_notes FOR UPDATE
    USING (is_connection_space_member(space_id))
    WITH CHECK (is_connection_space_member(space_id));

CREATE POLICY "academia_notes_delete"
    ON public.academia_notes FOR DELETE
    USING (is_connection_space_member(space_id));

-- Indexes
CREATE INDEX idx_academia_notes_space_id
    ON public.academia_notes(space_id);
CREATE INDEX idx_academia_notes_journey_id
    ON public.academia_notes(journey_id)
    WHERE journey_id IS NOT NULL;
CREATE INDEX idx_academia_notes_note_type
    ON public.academia_notes(space_id, note_type);
CREATE INDEX idx_academia_notes_tags
    ON public.academia_notes USING GIN(tags);
CREATE INDEX idx_academia_notes_created_at
    ON public.academia_notes(space_id, created_at DESC);
CREATE INDEX idx_academia_notes_updated_at
    ON public.academia_notes(space_id, updated_at DESC);

-- Full-text search index on title and content
CREATE INDEX idx_academia_notes_search
    ON public.academia_notes USING GIN(to_tsvector('english', title || ' ' || content));

-- ============================================================================
-- PART 3: CREATE ACADEMIA_MENTORSHIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.academia_mentorships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,

    -- Participants
    mentor_member_id UUID REFERENCES public.connection_members(id) ON DELETE SET NULL,
    mentee_member_id UUID REFERENCES public.connection_members(id) ON DELETE SET NULL,

    -- Relationship direction
    relationship_type TEXT NOT NULL,  -- 'giving' (I am the mentor), 'receiving' (I am the mentee)

    -- Mentorship details
    focus_areas TEXT[] DEFAULT '{}'::text[],
    objectives JSONB DEFAULT '[]'::jsonb,

    -- Schedule
    frequency TEXT,  -- 'weekly', 'biweekly', 'monthly', 'ad-hoc'
    duration_minutes INTEGER DEFAULT 60,
    next_session_at TIMESTAMPTZ,

    -- Status
    status TEXT DEFAULT 'active',  -- 'active', 'paused', 'completed'
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ended_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_relationship_type_valid CHECK (relationship_type IN ('giving', 'receiving'))
);

COMMENT ON TABLE public.academia_mentorships IS
'Mentorship relationships within Academia spaces - both giving and receiving mentorship.';
COMMENT ON COLUMN public.academia_mentorships.relationship_type IS 'Direction: "giving" (you are the mentor) or "receiving" (you are the mentee)';
COMMENT ON COLUMN public.academia_mentorships.objectives IS 'JSONB array of mentorship objectives/goals';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_academia_mentorships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_academia_mentorships_updated_at
    BEFORE UPDATE ON public.academia_mentorships
    FOR EACH ROW
    EXECUTE FUNCTION public.update_academia_mentorships_updated_at();

-- Enable RLS
ALTER TABLE public.academia_mentorships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "academia_mentorships_select"
    ON public.academia_mentorships FOR SELECT
    USING (is_connection_space_member(space_id));

CREATE POLICY "academia_mentorships_insert"
    ON public.academia_mentorships FOR INSERT
    WITH CHECK (is_connection_space_member(space_id));

CREATE POLICY "academia_mentorships_update"
    ON public.academia_mentorships FOR UPDATE
    USING (is_connection_space_member(space_id))
    WITH CHECK (is_connection_space_member(space_id));

CREATE POLICY "academia_mentorships_delete"
    ON public.academia_mentorships FOR DELETE
    USING (is_connection_space_admin(space_id));

-- Indexes
CREATE INDEX idx_academia_mentorships_space_id
    ON public.academia_mentorships(space_id);
CREATE INDEX idx_academia_mentorships_mentor_id
    ON public.academia_mentorships(mentor_member_id)
    WHERE mentor_member_id IS NOT NULL;
CREATE INDEX idx_academia_mentorships_mentee_id
    ON public.academia_mentorships(mentee_member_id)
    WHERE mentee_member_id IS NOT NULL;
CREATE INDEX idx_academia_mentorships_status
    ON public.academia_mentorships(space_id, status);
CREATE INDEX idx_academia_mentorships_next_session
    ON public.academia_mentorships(next_session_at)
    WHERE next_session_at IS NOT NULL AND status = 'active';

-- ============================================================================
-- PART 4: CREATE ACADEMIA_CREDENTIALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.academia_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
    journey_id UUID REFERENCES public.academia_journeys(id) ON DELETE SET NULL,

    -- Credential information
    title TEXT NOT NULL,
    issuer TEXT NOT NULL,
    credential_type TEXT,  -- 'certificate', 'diploma', 'badge', 'publication', 'award'

    -- Dates
    issued_at DATE NOT NULL,
    expires_at DATE,

    -- Verification
    credential_url TEXT,
    credential_id TEXT,

    -- Document storage
    document_url TEXT,

    -- Display and sharing
    display_order INTEGER,
    is_public BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_title_not_empty CHECK (title <> ''),
    CONSTRAINT check_issuer_not_empty CHECK (issuer <> '')
);

COMMENT ON TABLE public.academia_credentials IS
'Academic credentials: certificates, diplomas, badges, publications, and awards.';
COMMENT ON COLUMN public.academia_credentials.credential_type IS 'Type: certificate, diploma, badge, publication, award';
COMMENT ON COLUMN public.academia_credentials.document_url IS 'URL to credential document file';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_academia_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_academia_credentials_updated_at
    BEFORE UPDATE ON public.academia_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_academia_credentials_updated_at();

-- Enable RLS
ALTER TABLE public.academia_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "academia_credentials_select"
    ON public.academia_credentials FOR SELECT
    USING (is_connection_space_member(space_id));

CREATE POLICY "academia_credentials_insert"
    ON public.academia_credentials FOR INSERT
    WITH CHECK (is_connection_space_member(space_id));

CREATE POLICY "academia_credentials_update"
    ON public.academia_credentials FOR UPDATE
    USING (is_connection_space_member(space_id))
    WITH CHECK (is_connection_space_member(space_id));

CREATE POLICY "academia_credentials_delete"
    ON public.academia_credentials FOR DELETE
    USING (is_connection_space_admin(space_id));

-- Indexes
CREATE INDEX idx_academia_credentials_space_id
    ON public.academia_credentials(space_id);
CREATE INDEX idx_academia_credentials_journey_id
    ON public.academia_credentials(journey_id)
    WHERE journey_id IS NOT NULL;
CREATE INDEX idx_academia_credentials_issued_at
    ON public.academia_credentials(space_id, issued_at DESC);
CREATE INDEX idx_academia_credentials_expires_at
    ON public.academia_credentials(expires_at)
    WHERE expires_at IS NOT NULL;
CREATE INDEX idx_academia_credentials_is_public
    ON public.academia_credentials(space_id, is_public)
    WHERE is_public = TRUE;

-- ============================================================================
-- PART 5: GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.academia_journeys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academia_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academia_mentorships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academia_credentials TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETION VERIFICATION
-- ============================================================================

-- Tables created:
-- 1. academia_journeys - Learning journeys (courses, books, certifications)
-- 2. academia_notes - Zettelkasten-style knowledge notes
-- 3. academia_mentorships - Mentorship relationships (giving and receiving)
-- 4. academia_credentials - Academic credentials and achievements
--
-- All tables:
-- - Have RLS enabled with proper SECURITY DEFINER function usage
-- - Include proper indexes for performance
-- - Have updated_at triggers for automatic timestamp updates
-- - Use consistent schema naming (public.*)
-- - Support space-based access control
--
-- Verification query:
-- SELECT tablename, policyname FROM pg_policies
-- WHERE tablename LIKE 'academia_%'
-- ORDER BY tablename, policyname;
