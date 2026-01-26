-- =============================================================================
-- Migration: Complete contact_network schema to match TypeScript types
-- Issue #160: Error fetching user contacts / Error loading recent contacts
-- =============================================================================

-- Add email column
ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add avatar_url column
ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add relationship_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_network' AND column_name = 'relationship_type'
  ) THEN
    ALTER TABLE public.contact_network ADD COLUMN relationship_type TEXT DEFAULT 'contact';
  END IF;
END $$;

-- Add interaction tracking columns
ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS interaction_count INTEGER DEFAULT 0;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS interaction_frequency TEXT;

-- Add relationship health columns
ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 50;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS sentiment_trend TEXT DEFAULT 'unknown';

-- Add engagement columns
ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS engagement_level TEXT DEFAULT 'low';

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS response_avg_time_hours NUMERIC;

-- Add interaction topics
ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS interaction_topics TEXT[] DEFAULT '{}';

-- Add notes and preferences
ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Add status columns
ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT false;

-- Add AI analysis columns
ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS last_analysis_id UUID;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ;

-- Add Google Contacts integration columns
ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS google_contact_id TEXT;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS google_resource_name TEXT;

-- Add WhatsApp integration columns
ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS whatsapp_name TEXT;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS whatsapp_profile_pic_url TEXT;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS whatsapp_sync_enabled BOOLEAN DEFAULT false;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS whatsapp_sync_status TEXT;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS whatsapp_synced_at TIMESTAMPTZ;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS whatsapp_message_count INTEGER DEFAULT 0;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS whatsapp_sentiment_avg NUMERIC;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS whatsapp_metadata JSONB DEFAULT '{}';

-- Create useful indexes
CREATE INDEX IF NOT EXISTS idx_contact_network_relationship_type
ON public.contact_network(relationship_type);

CREATE INDEX IF NOT EXISTS idx_contact_network_health_score
ON public.contact_network(health_score);

CREATE INDEX IF NOT EXISTS idx_contact_network_last_interaction
ON public.contact_network(last_interaction_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_contact_network_active
ON public.contact_network(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_contact_network_google_id
ON public.contact_network(google_contact_id) WHERE google_contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_network_whatsapp_phone
ON public.contact_network(whatsapp_phone) WHERE whatsapp_phone IS NOT NULL;

-- Ensure RLS is enabled
ALTER TABLE public.contact_network ENABLE ROW LEVEL SECURITY;

-- Ensure RLS policies exist
DROP POLICY IF EXISTS "Users can view own contacts" ON public.contact_network;
CREATE POLICY "Users can view own contacts" ON public.contact_network
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own contacts" ON public.contact_network;
CREATE POLICY "Users can insert own contacts" ON public.contact_network
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own contacts" ON public.contact_network;
CREATE POLICY "Users can update own contacts" ON public.contact_network
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own contacts" ON public.contact_network;
CREATE POLICY "Users can delete own contacts" ON public.contact_network
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
