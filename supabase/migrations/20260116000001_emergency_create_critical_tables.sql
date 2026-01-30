-- EMERGENCY Migration: Create critical tables for app functionality
-- This migration consolidates table creation to fix staging deployment
-- Date: 2026-01-16

-- ============================================================================
-- WORK_ITEMS TABLE (Required for Atlas module task creation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.work_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT CHECK (priority IN ('urgent', 'high', 'medium', 'low', 'none')) DEFAULT 'none',
    category TEXT,
    estimated_duration INTEGER, -- in minutes
    actual_duration INTEGER,
    due_date TIMESTAMPTZ,
    scheduled_time TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    association_id UUID,
    module_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_items_user_id ON public.work_items(user_id);
CREATE INDEX IF NOT EXISTS idx_work_items_status ON public.work_items(status);
CREATE INDEX IF NOT EXISTS idx_work_items_due_date ON public.work_items(due_date);
CREATE INDEX IF NOT EXISTS idx_work_items_completed_at ON public.work_items(completed_at);
CREATE INDEX IF NOT EXISTS idx_work_items_created_at ON public.work_items(created_at);

ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_items_user_select" ON public.work_items;
CREATE POLICY "work_items_user_select" ON public.work_items
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "work_items_user_insert" ON public.work_items;
CREATE POLICY "work_items_user_insert" ON public.work_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "work_items_user_update" ON public.work_items;
CREATE POLICY "work_items_user_update" ON public.work_items
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "work_items_user_delete" ON public.work_items;
CREATE POLICY "work_items_user_delete" ON public.work_items
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- GOOGLE_CALENDAR_TOKENS TABLE (Required for calendar integration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.google_calendar_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type TEXT DEFAULT 'Bearer',
    expires_at TIMESTAMPTZ,
    scope TEXT,
    calendar_id TEXT DEFAULT 'primary',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_user_id ON public.google_calendar_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_expires_at ON public.google_calendar_tokens(expires_at);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "google_calendar_tokens_user_select" ON public.google_calendar_tokens;
CREATE POLICY "google_calendar_tokens_user_select" ON public.google_calendar_tokens
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "google_calendar_tokens_user_insert" ON public.google_calendar_tokens;
CREATE POLICY "google_calendar_tokens_user_insert" ON public.google_calendar_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "google_calendar_tokens_user_update" ON public.google_calendar_tokens;
CREATE POLICY "google_calendar_tokens_user_update" ON public.google_calendar_tokens
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "google_calendar_tokens_user_delete" ON public.google_calendar_tokens;
CREATE POLICY "google_calendar_tokens_user_delete" ON public.google_calendar_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Verification query (run manually to confirm)
-- ============================================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('work_items', 'google_calendar_tokens');
