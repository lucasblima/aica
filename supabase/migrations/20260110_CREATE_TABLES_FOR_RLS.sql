-- ============================================================================
-- CREATE MISSING TABLES FOR PHASE 1 RLS MIGRATION
-- ============================================================================
-- This script creates the 5 tables needed for Phase 1 RLS policies
-- If tables already exist, they will be skipped (IF NOT EXISTS)
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '>>> Creating missing tables for Phase 1 RLS...';
END $$;

-- ============================================================================
-- TABLE 1: ai_usage_tracking_errors
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_usage_tracking_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  error_type TEXT NOT NULL,
  error_message TEXT,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_errors_user_id
  ON public.ai_usage_tracking_errors(user_id);

DO $$ BEGIN
  RAISE NOTICE '✅ Table ai_usage_tracking_errors created/verified';
END $$;

-- ============================================================================
-- TABLE 2: data_deletion_requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id
  ON public.data_deletion_requests(user_id);

DO $$ BEGIN
  RAISE NOTICE '✅ Table data_deletion_requests created/verified';
END $$;

-- ============================================================================
-- TABLE 3: daily_questions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.daily_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = global question
  question_text TEXT NOT NULL,
  answer_text TEXT,
  date_asked DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_questions_user_id
  ON public.daily_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_questions_date
  ON public.daily_questions(date_asked);

DO $$ BEGIN
  RAISE NOTICE '✅ Table daily_questions created/verified';
END $$;

-- ============================================================================
-- TABLE 4: whatsapp_messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contact_network (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_network_user_id
  ON public.contact_network(user_id);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contact_network(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_direction TEXT DEFAULT 'incoming' CHECK (message_direction IN ('incoming', 'outgoing')),
  message_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id
  ON public.whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact_id
  ON public.whatsapp_messages(contact_id);

DO $$ BEGIN
  RAISE NOTICE '✅ Table whatsapp_messages created/verified';
END $$;

-- ============================================================================
-- TABLE 5: whatsapp_sync_logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'in_progress', 'success', 'failed')),
  sync_type TEXT NOT NULL, -- contacts, messages, etc.
  sync_details JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sync_logs_user_id
  ON public.whatsapp_sync_logs(user_id);

DO $$ BEGIN
  RAISE NOTICE '✅ Table whatsapp_sync_logs created/verified';
END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
  tables_exist INT;
BEGIN
  SELECT COUNT(*) INTO tables_exist
  FROM pg_tables
  WHERE tablename IN (
    'ai_usage_tracking_errors',
    'data_deletion_requests',
    'daily_questions',
    'whatsapp_messages',
    'whatsapp_sync_logs'
  ) AND schemaname = 'public';

  RAISE NOTICE '========== TABLE CREATION SUMMARY ==========';
  RAISE NOTICE 'Tables verified/created: %/5', tables_exist;

  IF tables_exist = 5 THEN
    RAISE NOTICE '✅ ALL TABLES READY FOR RLS POLICIES';
  ELSE
    RAISE WARNING '⚠️  Some tables missing. Expected 5, found %', tables_exist;
  END IF;
  RAISE NOTICE '==========================================';
END $$;
