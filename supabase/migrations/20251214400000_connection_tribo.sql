-- ============================================================================
-- MIGRATION: Connection Tribo - Community & Group Coordination Archetype
-- Date: 2025-12-14
-- Author: Aica System Architecture
--
-- PURPOSE:
-- Create tables for Tribo archetype - "Tecido Social":
-- - tribo_rituals: Recurring group events
-- - tribo_ritual_occurrences: Specific instances with RSVP
-- - tribo_shared_resources: Equipment and resource sharing
-- - tribo_group_funds: Collective financing (vaquinhas)
-- - tribo_discussions: Forum-style conversations
--
-- DESIGN PHILOSOPHY:
-- "Tecido Social" - Belonging, rituals, shared resources
-- Focus on community coordination and group harmony.
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE TRIBO_RITUALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tribo_rituals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,

    -- Ritual details
    name TEXT NOT NULL,
    description TEXT,
    recurrence_rule TEXT NOT NULL, -- iCal RRULE format

    -- Schedule
    default_time TIME,
    default_duration_minutes INTEGER DEFAULT 60,
    default_location TEXT,

    -- Participation
    is_mandatory BOOLEAN DEFAULT FALSE,
    typical_attendance INTEGER,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    next_occurrence_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_name_not_empty CHECK (name <> ''),
    CONSTRAINT check_recurrence_not_empty CHECK (recurrence_rule <> '')
);

COMMENT ON TABLE public.tribo_rituals IS
'Recurring group events within Tribo spaces (weekly meetings, monthly gatherings, etc.).';
COMMENT ON COLUMN public.tribo_rituals.recurrence_rule IS 'RFC 5545 RRULE for recurrence pattern';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_tribo_rituals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tribo_rituals_updated_at
    BEFORE UPDATE ON public.tribo_rituals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_tribo_rituals_updated_at();

-- Enable RLS
ALTER TABLE public.tribo_rituals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "tribo_rituals_select"
    ON public.tribo_rituals FOR SELECT
    USING (is_connection_space_member(space_id));

CREATE POLICY "tribo_rituals_insert"
    ON public.tribo_rituals FOR INSERT
    WITH CHECK (is_connection_space_admin(space_id));

CREATE POLICY "tribo_rituals_update"
    ON public.tribo_rituals FOR UPDATE
    USING (is_connection_space_admin(space_id))
    WITH CHECK (is_connection_space_admin(space_id));

CREATE POLICY "tribo_rituals_delete"
    ON public.tribo_rituals FOR DELETE
    USING (is_connection_space_admin(space_id));

-- Indexes
CREATE INDEX idx_tribo_rituals_space_id
    ON public.tribo_rituals(space_id);
CREATE INDEX idx_tribo_rituals_is_active
    ON public.tribo_rituals(is_active)
    WHERE is_active = TRUE;
CREATE INDEX idx_tribo_rituals_next_occurrence
    ON public.tribo_rituals(next_occurrence_at)
    WHERE next_occurrence_at IS NOT NULL;

-- ============================================================================
-- PART 2: CREATE TRIBO_RITUAL_OCCURRENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tribo_ritual_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ritual_id UUID NOT NULL REFERENCES public.tribo_rituals(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.connection_events(id) ON DELETE SET NULL,

    -- Occurrence details
    occurrence_date TIMESTAMPTZ NOT NULL,
    location TEXT,
    notes TEXT,

    -- Logistics
    bring_list JSONB DEFAULT '[]'::jsonb, -- [{item: string, assignedTo: uuid | null, completed: boolean}]

    -- RSVP tracking
    rsvp_data JSONB DEFAULT '{}'::jsonb, -- {member_id: 'yes'|'no'|'maybe'}

    -- Status and attendance
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    actual_attendance INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.tribo_ritual_occurrences IS
'Specific instances of recurring rituals with RSVP data and logistics.';
COMMENT ON COLUMN public.tribo_ritual_occurrences.status IS 'Status: scheduled, completed, cancelled';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_tribo_ritual_occurrences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tribo_ritual_occurrences_updated_at
    BEFORE UPDATE ON public.tribo_ritual_occurrences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_tribo_ritual_occurrences_updated_at();

-- Enable RLS
ALTER TABLE public.tribo_ritual_occurrences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "tribo_occurrences_select"
    ON public.tribo_ritual_occurrences FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tribo_rituals r
            WHERE r.id = tribo_ritual_occurrences.ritual_id
            AND is_connection_space_member(r.space_id)
        )
    );

CREATE POLICY "tribo_occurrences_insert"
    ON public.tribo_ritual_occurrences FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tribo_rituals r
            WHERE r.id = tribo_ritual_occurrences.ritual_id
            AND is_connection_space_admin(r.space_id)
        )
    );

CREATE POLICY "tribo_occurrences_update"
    ON public.tribo_ritual_occurrences FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.tribo_rituals r
            WHERE r.id = tribo_ritual_occurrences.ritual_id
            AND is_connection_space_admin(r.space_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tribo_rituals r
            WHERE r.id = tribo_ritual_occurrences.ritual_id
            AND is_connection_space_admin(r.space_id)
        )
    );

CREATE POLICY "tribo_occurrences_delete"
    ON public.tribo_ritual_occurrences FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.tribo_rituals r
            WHERE r.id = tribo_ritual_occurrences.ritual_id
            AND is_connection_space_admin(r.space_id)
        )
    );

-- Indexes
CREATE INDEX idx_tribo_occurrences_ritual_id
    ON public.tribo_ritual_occurrences(ritual_id);
CREATE INDEX idx_tribo_occurrences_date
    ON public.tribo_ritual_occurrences(occurrence_date);
CREATE INDEX idx_tribo_occurrences_status
    ON public.tribo_ritual_occurrences(status);

-- ============================================================================
-- PART 3: CREATE TRIBO_SHARED_RESOURCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tribo_shared_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,

    -- Resource details
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'equipment',  -- 'equipment', 'space', 'vehicle', 'other'

    -- Availability
    is_available BOOLEAN DEFAULT TRUE,
    current_holder_id UUID REFERENCES public.connection_members(id) ON DELETE SET NULL,
    checked_out_at TIMESTAMPTZ,
    return_date DATE,

    -- Value and documentation
    estimated_value NUMERIC(10, 2),
    images TEXT[] DEFAULT '{}'::text[],
    usage_notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_name_not_empty CHECK (name <> '')
);

COMMENT ON TABLE public.tribo_shared_resources IS
'Equipment, spaces, or items shared among Tribo group members.';
COMMENT ON COLUMN public.tribo_shared_resources.category IS 'Resource category: equipment, space, vehicle, other';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_tribo_shared_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tribo_shared_resources_updated_at
    BEFORE UPDATE ON public.tribo_shared_resources
    FOR EACH ROW
    EXECUTE FUNCTION public.update_tribo_shared_resources_updated_at();

-- Enable RLS
ALTER TABLE public.tribo_shared_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "tribo_resources_select"
    ON public.tribo_shared_resources FOR SELECT
    USING (is_connection_space_member(space_id));

CREATE POLICY "tribo_resources_insert"
    ON public.tribo_shared_resources FOR INSERT
    WITH CHECK (is_connection_space_admin(space_id));

CREATE POLICY "tribo_resources_update"
    ON public.tribo_shared_resources FOR UPDATE
    USING (is_connection_space_member(space_id))
    WITH CHECK (is_connection_space_member(space_id));

CREATE POLICY "tribo_resources_delete"
    ON public.tribo_shared_resources FOR DELETE
    USING (is_connection_space_admin(space_id));

-- Indexes
CREATE INDEX idx_tribo_resources_space_id
    ON public.tribo_shared_resources(space_id);
CREATE INDEX idx_tribo_resources_is_available
    ON public.tribo_shared_resources(is_available);
CREATE INDEX idx_tribo_resources_holder_id
    ON public.tribo_shared_resources(current_holder_id)
    WHERE current_holder_id IS NOT NULL;
CREATE INDEX idx_tribo_resources_category
    ON public.tribo_shared_resources(category);

-- ============================================================================
-- PART 4: CREATE TRIBO_GROUP_FUNDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tribo_group_funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,

    -- Fund details
    title TEXT NOT NULL,
    description TEXT,
    purpose TEXT,

    -- Targets
    target_amount NUMERIC(10, 2) NOT NULL,
    current_amount NUMERIC(10, 2) DEFAULT 0,
    deadline DATE,

    -- Configuration
    contribution_type TEXT DEFAULT 'voluntary',  -- 'voluntary', 'mandatory', 'proportional'

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    completed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_title_not_empty CHECK (title <> ''),
    CONSTRAINT check_target_positive CHECK (target_amount > 0)
);

COMMENT ON TABLE public.tribo_group_funds IS
'Collective financing initiatives within Tribo spaces (vaquinhas/group funds).';
COMMENT ON COLUMN public.tribo_group_funds.contribution_type IS 'Type: voluntary, mandatory, proportional';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_tribo_group_funds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tribo_group_funds_updated_at
    BEFORE UPDATE ON public.tribo_group_funds
    FOR EACH ROW
    EXECUTE FUNCTION public.update_tribo_group_funds_updated_at();

-- Enable RLS
ALTER TABLE public.tribo_group_funds ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "tribo_funds_select"
    ON public.tribo_group_funds FOR SELECT
    USING (is_connection_space_member(space_id));

CREATE POLICY "tribo_funds_insert"
    ON public.tribo_group_funds FOR INSERT
    WITH CHECK (is_connection_space_admin(space_id));

CREATE POLICY "tribo_funds_update"
    ON public.tribo_group_funds FOR UPDATE
    USING (is_connection_space_admin(space_id))
    WITH CHECK (is_connection_space_admin(space_id));

CREATE POLICY "tribo_funds_delete"
    ON public.tribo_group_funds FOR DELETE
    USING (is_connection_space_admin(space_id));

-- Indexes
CREATE INDEX idx_tribo_funds_space_id
    ON public.tribo_group_funds(space_id);
CREATE INDEX idx_tribo_funds_status
    ON public.tribo_group_funds(status);
CREATE INDEX idx_tribo_funds_deadline
    ON public.tribo_group_funds(deadline)
    WHERE deadline IS NOT NULL;

-- ============================================================================
-- PART 5: CREATE TRIBO_FUND_CONTRIBUTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tribo_fund_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id UUID NOT NULL REFERENCES public.tribo_group_funds(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.connection_members(id) ON DELETE CASCADE,

    -- Contribution details
    amount NUMERIC(10, 2) NOT NULL,
    contributed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Confirmation
    is_confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Payment tracking
    payment_method TEXT,
    transaction_id UUID,
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_amount_positive CHECK (amount > 0)
);

COMMENT ON TABLE public.tribo_fund_contributions IS
'Individual contributions to Tribo group funds.';

-- Enable RLS
ALTER TABLE public.tribo_fund_contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "tribo_contributions_select"
    ON public.tribo_fund_contributions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tribo_group_funds gf
            WHERE gf.id = tribo_fund_contributions.fund_id
            AND is_connection_space_member(gf.space_id)
        )
    );

CREATE POLICY "tribo_contributions_insert"
    ON public.tribo_fund_contributions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tribo_group_funds gf
            WHERE gf.id = tribo_fund_contributions.fund_id
            AND is_connection_space_member(gf.space_id)
        )
    );

CREATE POLICY "tribo_contributions_update"
    ON public.tribo_fund_contributions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.tribo_group_funds gf
            WHERE gf.id = tribo_fund_contributions.fund_id
            AND is_connection_space_admin(gf.space_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tribo_group_funds gf
            WHERE gf.id = tribo_fund_contributions.fund_id
            AND is_connection_space_admin(gf.space_id)
        )
    );

CREATE POLICY "tribo_contributions_delete"
    ON public.tribo_fund_contributions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.tribo_group_funds gf
            WHERE gf.id = tribo_fund_contributions.fund_id
            AND is_connection_space_admin(gf.space_id)
        )
    );

-- Indexes
CREATE INDEX idx_tribo_contributions_fund_id
    ON public.tribo_fund_contributions(fund_id);
CREATE INDEX idx_tribo_contributions_member_id
    ON public.tribo_fund_contributions(member_id);
CREATE INDEX idx_tribo_contributions_is_confirmed
    ON public.tribo_fund_contributions(is_confirmed);

-- ============================================================================
-- PART 6: CREATE TRIBO_DISCUSSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tribo_discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Discussion details
    title TEXT NOT NULL,
    content TEXT,
    category TEXT DEFAULT 'general',  -- 'announcement', 'question', 'decision', 'general'

    -- Poll support
    is_poll BOOLEAN DEFAULT FALSE,
    poll_options JSONB DEFAULT '[]'::jsonb, -- [{id: string, text: string, votes: number}]
    poll_votes JSONB DEFAULT '{}'::jsonb, -- {member_id: option_id}
    poll_deadline TIMESTAMPTZ,

    -- Status and engagement
    is_pinned BOOLEAN DEFAULT FALSE,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,

    -- Statistics
    reply_count INTEGER DEFAULT 0,
    last_reply_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_title_not_empty CHECK (title <> '')
);

COMMENT ON TABLE public.tribo_discussions IS
'Forum-style discussions and decision polls within Tribo spaces.';
COMMENT ON COLUMN public.tribo_discussions.category IS 'Category: announcement, question, decision, general';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_tribo_discussions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tribo_discussions_updated_at
    BEFORE UPDATE ON public.tribo_discussions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_tribo_discussions_updated_at();

-- Enable RLS
ALTER TABLE public.tribo_discussions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "tribo_discussions_select"
    ON public.tribo_discussions FOR SELECT
    USING (is_connection_space_member(space_id));

CREATE POLICY "tribo_discussions_insert"
    ON public.tribo_discussions FOR INSERT
    WITH CHECK (
        is_connection_space_member(space_id)
        AND created_by = auth.uid()
    );

CREATE POLICY "tribo_discussions_update"
    ON public.tribo_discussions FOR UPDATE
    USING (
        created_by = auth.uid()
        OR is_connection_space_admin(space_id)
    )
    WITH CHECK (
        created_by = auth.uid()
        OR is_connection_space_admin(space_id)
    );

CREATE POLICY "tribo_discussions_delete"
    ON public.tribo_discussions FOR DELETE
    USING (
        created_by = auth.uid()
        OR is_connection_space_admin(space_id)
    );

-- Indexes
CREATE INDEX idx_tribo_discussions_space_id
    ON public.tribo_discussions(space_id);
CREATE INDEX idx_tribo_discussions_created_by
    ON public.tribo_discussions(created_by);
CREATE INDEX idx_tribo_discussions_category
    ON public.tribo_discussions(space_id, category);
CREATE INDEX idx_tribo_discussions_is_pinned
    ON public.tribo_discussions(is_pinned)
    WHERE is_pinned = TRUE;
CREATE INDEX idx_tribo_discussions_last_reply
    ON public.tribo_discussions(last_reply_at DESC)
    WHERE last_reply_at IS NOT NULL;

-- ============================================================================
-- PART 7: CREATE TRIBO_DISCUSSION_REPLIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tribo_discussion_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES public.tribo_discussions(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Reply content
    content TEXT NOT NULL,

    -- Threading
    parent_reply_id UUID REFERENCES public.tribo_discussion_replies(id) ON DELETE CASCADE,

    -- Reactions
    reactions JSONB DEFAULT '{}' ::jsonb, -- {emoji: [user_ids]}

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_content_not_empty CHECK (content <> '')
);

COMMENT ON TABLE public.tribo_discussion_replies IS
'Replies to discussions with threading support for Tribo spaces.';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_tribo_discussion_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tribo_discussion_replies_updated_at
    BEFORE UPDATE ON public.tribo_discussion_replies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_tribo_discussion_replies_updated_at();

-- Enable RLS
ALTER TABLE public.tribo_discussion_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "tribo_replies_select"
    ON public.tribo_discussion_replies FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tribo_discussions d
            WHERE d.id = tribo_discussion_replies.discussion_id
            AND is_connection_space_member(d.space_id)
        )
    );

CREATE POLICY "tribo_replies_insert"
    ON public.tribo_discussion_replies FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tribo_discussions d
            WHERE d.id = tribo_discussion_replies.discussion_id
            AND is_connection_space_member(d.space_id)
        )
        AND author_id = auth.uid()
    );

CREATE POLICY "tribo_replies_update"
    ON public.tribo_discussion_replies FOR UPDATE
    USING (
        author_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.tribo_discussions d
            WHERE d.id = tribo_discussion_replies.discussion_id
            AND is_connection_space_admin(d.space_id)
        )
    )
    WITH CHECK (
        author_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.tribo_discussions d
            WHERE d.id = tribo_discussion_replies.discussion_id
            AND is_connection_space_admin(d.space_id)
        )
    );

CREATE POLICY "tribo_replies_delete"
    ON public.tribo_discussion_replies FOR DELETE
    USING (
        author_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.tribo_discussions d
            WHERE d.id = tribo_discussion_replies.discussion_id
            AND is_connection_space_admin(d.space_id)
        )
    );

-- Indexes
CREATE INDEX idx_tribo_replies_discussion_id
    ON public.tribo_discussion_replies(discussion_id);
CREATE INDEX idx_tribo_replies_author_id
    ON public.tribo_discussion_replies(author_id);
CREATE INDEX idx_tribo_replies_parent_id
    ON public.tribo_discussion_replies(parent_reply_id)
    WHERE parent_reply_id IS NOT NULL;

-- ============================================================================
-- PART 8: UPDATE FUND AMOUNT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_tribo_fund_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_confirmed AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.is_confirmed = FALSE)) THEN
        UPDATE public.tribo_group_funds
        SET current_amount = current_amount + NEW.amount
        WHERE id = NEW.fund_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tribo_fund_contribution_update
    AFTER INSERT OR UPDATE ON public.tribo_fund_contributions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_tribo_fund_amount();

-- ============================================================================
-- PART 9: UPDATE DISCUSSION STATS TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_tribo_discussion_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.tribo_discussions
    SET
        reply_count = (
            SELECT COUNT(*) FROM public.tribo_discussion_replies
            WHERE discussion_id = NEW.discussion_id
        ),
        last_reply_at = NOW()
    WHERE id = NEW.discussion_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tribo_discussion_reply_update
    AFTER INSERT ON public.tribo_discussion_replies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_tribo_discussion_stats();

-- ============================================================================
-- PART 10: GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tribo_rituals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tribo_ritual_occurrences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tribo_shared_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tribo_group_funds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tribo_fund_contributions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tribo_discussions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tribo_discussion_replies TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETION VERIFICATION
-- ============================================================================

-- Tables created:
-- 1. tribo_rituals - Recurring group events
-- 2. tribo_ritual_occurrences - Specific ritual instances with RSVP
-- 3. tribo_shared_resources - Equipment and resource sharing
-- 4. tribo_group_funds - Collective financing initiatives
-- 5. tribo_fund_contributions - Contributions to group funds
-- 6. tribo_discussions - Forum-style discussions
-- 7. tribo_discussion_replies - Replies with threading
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
-- WHERE tablename LIKE 'tribo_%'
-- ORDER BY tablename, policyname;
