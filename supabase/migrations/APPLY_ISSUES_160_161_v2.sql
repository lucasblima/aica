-- =============================================================================
-- Migration v2: Issues #160 and #161 - Simplified (no CHECK constraints inline)
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================================================

-- =============================================================================
-- PART 1: ASSOCIATIONS (Issue #161)
-- =============================================================================

-- Add columns one by one WITHOUT CHECK constraint inline
ALTER TABLE public.associations ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'personal';
ALTER TABLE public.associations ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.associations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.associations ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE public.associations ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_associations_type ON public.associations(type);
CREATE INDEX IF NOT EXISTS idx_associations_is_active ON public.associations(is_active) WHERE is_active = true;

-- RLS policies for associations
ALTER TABLE public.associations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own associations" ON public.associations;
CREATE POLICY "Users can view own associations" ON public.associations
  FOR SELECT TO authenticated USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Users can insert own associations" ON public.associations;
CREATE POLICY "Users can insert own associations" ON public.associations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Users can update own associations" ON public.associations;
CREATE POLICY "Users can update own associations" ON public.associations
  FOR UPDATE TO authenticated USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Users can delete own associations" ON public.associations;
CREATE POLICY "Users can delete own associations" ON public.associations
  FOR DELETE TO authenticated USING (auth.uid() = owner_user_id);

-- =============================================================================
-- PART 2: CONTACT_NETWORK (Issue #160)
-- =============================================================================

-- Basic info columns
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS relationship_type TEXT DEFAULT 'contact';

-- Interaction tracking
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS interaction_count INTEGER DEFAULT 0;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS interaction_frequency TEXT;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS interaction_topics TEXT[] DEFAULT '{}';

-- Health & engagement
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 50;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS sentiment_trend TEXT DEFAULT 'unknown';
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS engagement_level TEXT DEFAULT 'low';
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS response_avg_time_hours NUMERIC;

-- Notes and preferences
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Status columns
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT false;

-- AI analysis
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS last_analysis_id UUID;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ;

-- Google Contacts integration
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS google_contact_id TEXT;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS google_resource_name TEXT;

-- WhatsApp integration
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS whatsapp_name TEXT;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS whatsapp_profile_pic_url TEXT;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS whatsapp_sync_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS whatsapp_sync_status TEXT;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS whatsapp_synced_at TIMESTAMPTZ;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS whatsapp_message_count INTEGER DEFAULT 0;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS whatsapp_sentiment_avg NUMERIC;
ALTER TABLE public.contact_network ADD COLUMN IF NOT EXISTS whatsapp_metadata JSONB DEFAULT '{}';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contact_network_relationship_type ON public.contact_network(relationship_type);
CREATE INDEX IF NOT EXISTS idx_contact_network_health_score ON public.contact_network(health_score);
CREATE INDEX IF NOT EXISTS idx_contact_network_last_interaction ON public.contact_network(last_interaction_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_contact_network_active ON public.contact_network(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_contact_network_google_id ON public.contact_network(google_contact_id) WHERE google_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contact_network_whatsapp_phone ON public.contact_network(whatsapp_phone) WHERE whatsapp_phone IS NOT NULL;

-- RLS policies for contact_network
ALTER TABLE public.contact_network ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own contacts" ON public.contact_network;
CREATE POLICY "Users can view own contacts" ON public.contact_network
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own contacts" ON public.contact_network;
CREATE POLICY "Users can insert own contacts" ON public.contact_network
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own contacts" ON public.contact_network;
CREATE POLICY "Users can update own contacts" ON public.contact_network
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own contacts" ON public.contact_network;
CREATE POLICY "Users can delete own contacts" ON public.contact_network
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =============================================================================
-- VERIFY COLUMNS EXIST
-- =============================================================================
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  -- Check associations columns
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'associations'
    AND column_name IN ('type', 'is_active', 'workspace_id');

  IF col_count >= 3 THEN
    RAISE NOTICE '✅ Associations: type, is_active, workspace_id columns verified';
  ELSE
    RAISE WARNING '❌ Associations: Missing columns! Found only % of 3', col_count;
  END IF;

  -- Check contact_network columns
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'contact_network'
    AND column_name IN ('email', 'relationship_type', 'health_score');

  IF col_count >= 3 THEN
    RAISE NOTICE '✅ Contact Network: email, relationship_type, health_score columns verified';
  ELSE
    RAISE WARNING '❌ Contact Network: Missing columns! Found only % of 3', col_count;
  END IF;
END $$;

-- =============================================================================
-- REFRESH SCHEMA CACHE (CRITICAL!)
-- =============================================================================
NOTIFY pgrst, 'reload schema';

-- Output success message
SELECT 'Migration v2 completed! Check NOTICE messages above for verification.' as result;
