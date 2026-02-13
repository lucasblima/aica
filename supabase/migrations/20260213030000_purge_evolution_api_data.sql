-- ============================================================================
-- Migration: Purge Evolution API Legacy Data
-- Description: Removes all data from Evolution API era so users can start
--              fresh with the manual WhatsApp export import flow.
--              This is a ONE-TIME data cleanup, not a schema change.
-- ============================================================================

-- Use DO block for conditional deletes (tables may not exist)
DO $$
BEGIN
  -- 1. Group participants (FK → contact_network)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_group_participants') THEN
    DELETE FROM public.whatsapp_group_participants;
    RAISE NOTICE 'Purged whatsapp_group_participants';
  END IF;

  -- 2. Extracted entities (FK → contact_network, whatsapp_messages)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_extracted_entities') THEN
    DELETE FROM public.whatsapp_extracted_entities;
    RAISE NOTICE 'Purged whatsapp_extracted_entities';
  END IF;

  -- 3. Conversation threads (FK → contact_network)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversation_threads') THEN
    DELETE FROM public.conversation_threads;
    RAISE NOTICE 'Purged conversation_threads';
  END IF;

  -- 4. Contact health history (FK → contact_network)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contact_health_history') THEN
    DELETE FROM public.contact_health_history;
    RAISE NOTICE 'Purged contact_health_history';
  END IF;

  -- 5. WhatsApp pending actions (FK → whatsapp_messages)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_pending_actions') THEN
    DELETE FROM public.whatsapp_pending_actions;
    RAISE NOTICE 'Purged whatsapp_pending_actions';
  END IF;

  -- 6. WhatsApp media metadata (FK → whatsapp_messages)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_media_metadata') THEN
    DELETE FROM public.whatsapp_media_metadata;
    RAISE NOTICE 'Purged whatsapp_media_metadata';
  END IF;

  -- 7. WhatsApp messages
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_messages') THEN
    DELETE FROM public.whatsapp_messages;
    RAISE NOTICE 'Purged whatsapp_messages';
  END IF;

  -- 8. Contact network
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contact_network') THEN
    DELETE FROM public.contact_network;
    RAISE NOTICE 'Purged contact_network';
  END IF;

  -- 9. WhatsApp sessions (Evolution API sessions)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_sessions') THEN
    DELETE FROM public.whatsapp_sessions;
    RAISE NOTICE 'Purged whatsapp_sessions';
  END IF;

  -- 10. Previous file imports (start fresh)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_file_imports') THEN
    DELETE FROM public.whatsapp_file_imports;
    RAISE NOTICE 'Purged whatsapp_file_imports';
  END IF;
END $$;
