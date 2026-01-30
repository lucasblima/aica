-- ============================================================================
-- MIGRATION: Connection Invitations with Email Tracking
-- Date: 2026-01-29
-- Author: Backend Architect Agent
--
-- PURPOSE:
-- Create connection_invitations table to handle member invitations with
-- email notification tracking, expiration, and acceptance flows.
--
-- FEATURES:
-- - Token-based invitation links (secure UUID tokens)
-- - Email delivery tracking (sent, delivered, bounced, failed)
-- - Expiration handling (7-day default)
-- - Invitation status lifecycle (pending → accepted/rejected/expired)
-- - RLS policies for multi-user isolation
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE ENUM TYPE
-- ============================================================================

-- Enum for invitation status
CREATE TYPE public.connection_invitation_status AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'expired'
);

-- Enum for email delivery status
CREATE TYPE public.email_delivery_status AS ENUM (
    'pending',
    'sent',
    'delivered',
    'bounced',
    'failed'
);

-- ============================================================================
-- PART 2: CREATE connection_invitations TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connection_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,

    -- Invitee information
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,

    -- Invitation details
    status public.connection_invitation_status DEFAULT 'pending' NOT NULL,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.connection_member_role DEFAULT 'member' NOT NULL,

    -- Email tracking
    email_sent_at TIMESTAMPTZ,
    email_delivery_status public.email_delivery_status DEFAULT 'pending' NOT NULL,
    email_delivery_error TEXT,

    -- Lifecycle timestamps
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,

    -- Standard timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    CONSTRAINT check_token_not_empty CHECK (token <> ''),
    CONSTRAINT check_expires_at_future CHECK (expires_at > created_at),
    CONSTRAINT unique_pending_invitation UNIQUE(space_id, email)
        WHERE status = 'pending'
);

COMMENT ON TABLE public.connection_invitations IS
'Stores member invitations for connection spaces with email tracking and expiration.';
COMMENT ON COLUMN public.connection_invitations.token IS 'Secure UUID-based token for invitation links';
COMMENT ON COLUMN public.connection_invitations.email_delivery_status IS 'Tracks email delivery: pending → sent → delivered/bounced/failed';
COMMENT ON COLUMN public.connection_invitations.expires_at IS 'Invitation expiration date (default: 7 days from creation)';

-- ============================================================================
-- PART 3: CREATE UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_connection_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_connection_invitations_updated_at
    BEFORE UPDATE ON public.connection_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_connection_invitations_updated_at();

-- ============================================================================
-- PART 4: CREATE SECURITY DEFINER HELPER FUNCTION
-- ============================================================================

-- Function: Check if user can manage invitations for a space
CREATE OR REPLACE FUNCTION public.can_manage_invitations(
    _space_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Owner or admin can manage invitations
    RETURN EXISTS (
        SELECT 1 FROM public.connection_members
        WHERE space_id = _space_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND is_active = TRUE
    ) OR EXISTS (
        SELECT 1 FROM public.connection_spaces
        WHERE id = _space_id
          AND user_id = auth.uid()
    );
END;
$$;

COMMENT ON FUNCTION public.can_manage_invitations(uuid) IS
'Check if current user can manage invitations for a connection space (owner or admin)';

-- ============================================================================
-- PART 5: ENABLE ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.connection_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 6: CREATE RLS POLICIES
-- ============================================================================

-- Policy: Space owners/admins can view all invitations
CREATE POLICY "connection_invitations_select"
    ON public.connection_invitations FOR SELECT
    USING (
        can_manage_invitations(space_id)  -- Owner/admin can view
        OR
        email = (SELECT email FROM auth.users WHERE id = auth.uid())  -- Invitee can view their own
    );

-- Policy: Only space owners/admins can create invitations
CREATE POLICY "connection_invitations_insert"
    ON public.connection_invitations FOR INSERT
    WITH CHECK (
        can_manage_invitations(space_id)
        AND invited_by = auth.uid()
    );

-- Policy: Only space owners/admins can update invitations
CREATE POLICY "connection_invitations_update"
    ON public.connection_invitations FOR UPDATE
    USING (can_manage_invitations(space_id))
    WITH CHECK (can_manage_invitations(space_id));

-- Policy: Only space owners/admins can delete invitations
CREATE POLICY "connection_invitations_delete"
    ON public.connection_invitations FOR DELETE
    USING (can_manage_invitations(space_id));

-- ============================================================================
-- PART 7: CREATE PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX idx_connection_invitations_space_id
    ON public.connection_invitations(space_id);

CREATE INDEX idx_connection_invitations_email
    ON public.connection_invitations(email);

CREATE INDEX idx_connection_invitations_token
    ON public.connection_invitations(token);

CREATE INDEX idx_connection_invitations_status
    ON public.connection_invitations(space_id, status)
    WHERE status = 'pending';

CREATE INDEX idx_connection_invitations_expires_at
    ON public.connection_invitations(expires_at)
    WHERE status = 'pending' AND expires_at > NOW();

CREATE INDEX idx_connection_invitations_email_status
    ON public.connection_invitations(email_delivery_status)
    WHERE email_delivery_status IN ('pending', 'sent');

CREATE INDEX idx_connection_invitations_invited_by
    ON public.connection_invitations(invited_by);

-- ============================================================================
-- PART 8: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_invitations TO authenticated;

-- ============================================================================
-- PART 9: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.connection_invitations.id IS 'Primary key';
COMMENT ON COLUMN public.connection_invitations.space_id IS 'Reference to connection space';
COMMENT ON COLUMN public.connection_invitations.email IS 'Invitee email address';
COMMENT ON COLUMN public.connection_invitations.token IS 'Secure token for invitation link (UUID without hyphens)';
COMMENT ON COLUMN public.connection_invitations.status IS 'Invitation lifecycle: pending → accepted/rejected/expired';
COMMENT ON COLUMN public.connection_invitations.invited_by IS 'User who created the invitation';
COMMENT ON COLUMN public.connection_invitations.role IS 'Role to assign when invitation is accepted';
COMMENT ON COLUMN public.connection_invitations.email_sent_at IS 'Timestamp when email was sent';
COMMENT ON COLUMN public.connection_invitations.email_delivery_status IS 'Email delivery tracking';
COMMENT ON COLUMN public.connection_invitations.email_delivery_error IS 'Error message if email failed';
COMMENT ON COLUMN public.connection_invitations.expires_at IS 'Expiration timestamp (7 days default)';
COMMENT ON COLUMN public.connection_invitations.accepted_at IS 'Timestamp when invitation was accepted';
COMMENT ON COLUMN public.connection_invitations.rejected_at IS 'Timestamp when invitation was rejected';

-- ============================================================================
-- MIGRATION COMPLETION VERIFICATION
-- ============================================================================

-- Tables created:
-- 1. connection_invitations
--
-- Functions created:
-- 1. can_manage_invitations(uuid)
--
-- Enum types created:
-- 1. connection_invitation_status
-- 2. email_delivery_status
--
-- RLS Policies:
-- - All tables have RLS enabled
-- - SELECT: Owner/admin + invitee can view
-- - INSERT/UPDATE/DELETE: Only owner/admin
-- - Uses SECURITY DEFINER function to prevent recursion
--
-- Verification query:
-- SELECT * FROM pg_policies WHERE tablename = 'connection_invitations';
