-- =============================================================================
-- Migration: Create states table
-- Issue: createAssociation fails because states table doesn't exist
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================================================

-- Create states table
CREATE TABLE IF NOT EXISTS public.states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL DEFAULT 'work_item',
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    sequence INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_states_association_id ON public.states(association_id);
CREATE INDEX IF NOT EXISTS idx_states_entity_type ON public.states(entity_type);
CREATE INDEX IF NOT EXISTS idx_states_sequence ON public.states(association_id, sequence);

-- Enable RLS
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can manage states for associations they own
DROP POLICY IF EXISTS "Users can view states of own associations" ON public.states;
CREATE POLICY "Users can view states of own associations" ON public.states
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.associations a
            WHERE a.id = states.association_id
            AND a.owner_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert states for own associations" ON public.states;
CREATE POLICY "Users can insert states for own associations" ON public.states
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.associations a
            WHERE a.id = states.association_id
            AND a.owner_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update states of own associations" ON public.states;
CREATE POLICY "Users can update states of own associations" ON public.states
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.associations a
            WHERE a.id = states.association_id
            AND a.owner_user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.associations a
            WHERE a.id = states.association_id
            AND a.owner_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete states of own associations" ON public.states;
CREATE POLICY "Users can delete states of own associations" ON public.states
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.associations a
            WHERE a.id = states.association_id
            AND a.owner_user_id = auth.uid()
        )
    );

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT 'states table created successfully!' as result;
