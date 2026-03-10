-- Create calendar_events table for Agenda module
-- This is AICA's own calendar system (source of truth).
-- External calendar events (Google, Apple, Outlook) are synced into this table.
-- Cross-module events (Flux, Finance, Studio) also live here.

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  description TEXT CHECK (char_length(description) <= 5000),
  location TEXT,

  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT false,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',

  recurrence_rule TEXT,

  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'google', 'apple', 'outlook', 'flux', 'finance', 'studio')),
  external_id TEXT,
  external_url TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced'
    CHECK (sync_status IN ('synced', 'pending', 'conflict')),
  last_synced_at TIMESTAMPTZ,

  color TEXT,
  category TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_events_source ON public.calendar_events(source);
CREATE INDEX idx_calendar_events_external_id ON public.calendar_events(external_id);

-- Unique constraint to prevent duplicate external events per user+source
CREATE UNIQUE INDEX idx_calendar_events_user_external ON public.calendar_events(user_id, source, external_id)
  WHERE external_id IS NOT NULL;

-- Reuse existing update_updated_at_column() trigger function
-- (already created by earlier migrations, e.g., work_items)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END;
$$;

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies (mandatory for all tables)
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own calendar events"
  ON public.calendar_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar events"
  ON public.calendar_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events"
  ON public.calendar_events FOR DELETE
  USING (auth.uid() = user_id);
