-- ============================================================================
-- Migration: Fix WhatsApp contacts sync_source
-- Date: 2026-01-10
-- Issue: #88 - Lista de contatos WhatsApp nao aparece na UI
-- ============================================================================
--
-- PROBLEM:
-- The edge function sync-whatsapp-contacts was not setting sync_source = 'whatsapp'
-- when upserting contacts. This caused the UI filter to not show WhatsApp contacts
-- when the user selects "WhatsApp" filter, since contacts had sync_source = 'manual'
-- (the column default) or NULL.
--
-- SOLUTION:
-- Update all existing contacts that have whatsapp_id set to have sync_source = 'whatsapp'
--
-- ============================================================================

-- ============================================================================
-- PRE-FLIGHT: Log migration start and show affected rows count
-- ============================================================================

DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIX: WhatsApp contacts sync_source';
  RAISE NOTICE 'Issue #88: WhatsApp contacts not visible with filter';
  RAISE NOTICE 'Started at: %', NOW();
  RAISE NOTICE '========================================';

  -- Count affected rows
  SELECT COUNT(*) INTO affected_count
  FROM contact_network
  WHERE whatsapp_id IS NOT NULL
    AND (sync_source IS NULL OR sync_source != 'whatsapp');

  RAISE NOTICE 'Contacts to update: %', affected_count;
END $$;

-- ============================================================================
-- STEP 1: Update sync_source for all contacts with whatsapp_id
-- ============================================================================

UPDATE contact_network
SET
  sync_source = 'whatsapp',
  last_synced_at = COALESCE(last_synced_at, whatsapp_synced_at, NOW())
WHERE whatsapp_id IS NOT NULL
  AND (sync_source IS NULL OR sync_source != 'whatsapp');

-- ============================================================================
-- STEP 2: Also update whatsapp_synced_at if not set
-- ============================================================================

UPDATE contact_network
SET whatsapp_synced_at = COALESCE(last_synced_at, NOW())
WHERE whatsapp_id IS NOT NULL
  AND whatsapp_synced_at IS NULL;

-- ============================================================================
-- POST-FLIGHT: Verify the fix
-- ============================================================================

DO $$
DECLARE
  total_whatsapp INTEGER;
  with_sync_source INTEGER;
BEGIN
  -- Count total WhatsApp contacts
  SELECT COUNT(*) INTO total_whatsapp
  FROM contact_network
  WHERE whatsapp_id IS NOT NULL;

  -- Count WhatsApp contacts with correct sync_source
  SELECT COUNT(*) INTO with_sync_source
  FROM contact_network
  WHERE whatsapp_id IS NOT NULL
    AND sync_source = 'whatsapp';

  IF total_whatsapp = with_sync_source THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUCCESS: All % WhatsApp contacts now have sync_source = whatsapp', total_whatsapp;
    RAISE NOTICE '========================================';
  ELSE
    RAISE WARNING 'WARNING: % of % WhatsApp contacts have correct sync_source', with_sync_source, total_whatsapp;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Apply this migration to staging';
  RAISE NOTICE '2. Refresh the Contacts page in the UI';
  RAISE NOTICE '3. Select "WhatsApp" filter - contacts should appear';
  RAISE NOTICE '';
  RAISE NOTICE 'Completed at: %', NOW();
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
