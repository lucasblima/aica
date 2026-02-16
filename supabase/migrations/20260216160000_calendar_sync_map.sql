-- Calendar Sync Map: bidirectional mapping between AICA entities and Google Calendar events
-- Enables "one calendar, one life" sync across Flux, Atlas, Studio, and Grants modules

CREATE TABLE IF NOT EXISTS calendar_sync_map (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('flux', 'atlas', 'studio', 'grants')),
  entity_id TEXT NOT NULL,
  google_event_id TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  sync_direction TEXT DEFAULT 'aica_to_google' CHECK (sync_direction IN ('aica_to_google', 'google_to_aica', 'bidirectional')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, module, entity_id)
);

-- RLS (non-negotiable per AICA rules)
ALTER TABLE calendar_sync_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sync mappings" ON calendar_sync_map
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync mappings" ON calendar_sync_map
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync mappings" ON calendar_sync_map
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sync mappings" ON calendar_sync_map
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for efficient lookups
CREATE INDEX idx_calendar_sync_map_user_module ON calendar_sync_map(user_id, module);
CREATE INDEX idx_calendar_sync_map_user_google_event ON calendar_sync_map(user_id, google_event_id);
