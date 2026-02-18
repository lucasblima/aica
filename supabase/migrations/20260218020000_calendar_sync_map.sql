-- Calendar Sync Map
-- Tracks AICA entity ↔ Google Calendar event mappings for bidirectional sync.
-- Used by calendarSyncService.ts: getMapping, upsertMapping, removeMappingAndGetEventId

CREATE TABLE IF NOT EXISTS public.calendar_sync_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    module TEXT NOT NULL,             -- 'atlas' | 'flux' | 'studio' | 'grants'
    entity_id TEXT NOT NULL,          -- AICA entity ID (work_item.id, etc.)
    google_event_id TEXT NOT NULL,    -- Google Calendar event ID
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_sync_mapping UNIQUE(user_id, module, entity_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_sync_map_user
    ON public.calendar_sync_map(user_id);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_map_entity
    ON public.calendar_sync_map(user_id, module, entity_id);

-- RLS
ALTER TABLE public.calendar_sync_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync mappings"
    ON public.calendar_sync_map FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sync mappings"
    ON public.calendar_sync_map FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync mappings"
    ON public.calendar_sync_map FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sync mappings"
    ON public.calendar_sync_map FOR DELETE
    USING (auth.uid() = user_id);
