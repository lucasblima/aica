-- =============================================================================
-- Migration: WhatsApp Timeline Integration
-- Issue #91: Processar mensagens recebidas via webhook para timeline
-- Phase 1: Database schema extensions
-- =============================================================================

-- =============================================================================
-- PART 1: ADD MESSAGE PREVIEW COLUMNS TO CONTACT_NETWORK
-- =============================================================================

-- Add last message preview for displaying in contact cards
ALTER TABLE contact_network
ADD COLUMN IF NOT EXISTS last_message_preview TEXT;

-- Add last message direction to show "Voce:" prefix for outgoing messages
ALTER TABLE contact_network
ADD COLUMN IF NOT EXISTS last_message_direction TEXT
CHECK (last_message_direction IS NULL OR last_message_direction IN ('incoming', 'outgoing'));

COMMENT ON COLUMN contact_network.last_message_preview IS
'Preview of last WhatsApp message (truncated to 100 chars). Auto-updated via trigger.';

COMMENT ON COLUMN contact_network.last_message_direction IS
'Direction of last message (incoming/outgoing). Used for UI display prefix.';

-- =============================================================================
-- PART 2: CREATE TRIGGER FUNCTION TO UPDATE CONTACT PREVIEW
-- =============================================================================

CREATE OR REPLACE FUNCTION update_contact_last_message_preview()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _preview TEXT;
BEGIN
  -- Generate preview based on message content
  _preview := CASE
    WHEN NEW.message_text IS NOT NULL AND LENGTH(NEW.message_text) > 0
      THEN LEFT(NEW.message_text, 100)
    WHEN NEW.media_type = 'audio' THEN '[Audio]'
    WHEN NEW.media_type = 'image' THEN '[Imagem]'
    WHEN NEW.media_type = 'video' THEN '[Video]'
    WHEN NEW.media_type = 'document' THEN '[Documento]'
    WHEN NEW.media_type = 'sticker' THEN '[Sticker]'
    WHEN NEW.media_type = 'location' THEN '[Localizacao]'
    WHEN NEW.media_type = 'contact' THEN '[Contato]'
    WHEN NEW.message_type = 'audio' THEN '[Audio]'
    WHEN NEW.message_type = 'image' THEN '[Imagem]'
    WHEN NEW.message_type = 'video' THEN '[Video]'
    WHEN NEW.message_type = 'document' THEN '[Documento]'
    WHEN NEW.message_type = 'sticker' THEN '[Sticker]'
    WHEN NEW.message_type = 'location' THEN '[Localizacao]'
    WHEN NEW.message_type = 'contact' THEN '[Contato]'
    ELSE '[Mensagem]'
  END;

  -- Update contact_network with preview and direction
  UPDATE contact_network
  SET
    last_message_preview = _preview,
    last_message_direction = COALESCE(NEW.message_direction, NEW.direction),
    last_whatsapp_message_at = COALESCE(NEW.message_timestamp, NOW()),
    updated_at = NOW()
  WHERE id = NEW.contact_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_contact_last_message_preview IS
'Trigger function that updates contact_network with last message preview when a WhatsApp message is inserted.';

-- =============================================================================
-- PART 3: CREATE TRIGGER ON whatsapp_messages
-- =============================================================================

-- Drop existing trigger if exists (idempotent)
DROP TRIGGER IF EXISTS trigger_update_contact_last_message_preview ON whatsapp_messages;

-- Create trigger to fire on INSERT
CREATE TRIGGER trigger_update_contact_last_message_preview
  AFTER INSERT ON whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_last_message_preview();

COMMENT ON TRIGGER trigger_update_contact_last_message_preview ON whatsapp_messages IS
'Updates contact_network.last_message_preview when new WhatsApp message is stored.';

-- =============================================================================
-- PART 4: ENABLE REALTIME FOR whatsapp_messages
-- =============================================================================

-- Check if table is already in publication before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'whatsapp_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
    RAISE NOTICE 'Added whatsapp_messages to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'whatsapp_messages already in supabase_realtime publication';
  END IF;
END $$;

-- =============================================================================
-- PART 5: BACKFILL EXISTING CONTACTS WITH LAST MESSAGE PREVIEW
-- =============================================================================

-- Create function to backfill previews for existing contacts
CREATE OR REPLACE FUNCTION backfill_contact_message_previews(_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _contact RECORD;
  _last_msg RECORD;
  _processed INTEGER := 0;
BEGIN
  -- Loop through contacts needing preview update
  FOR _contact IN
    SELECT cn.id, cn.user_id
    FROM contact_network cn
    WHERE cn.last_message_preview IS NULL
      AND cn.last_whatsapp_message_at IS NOT NULL
      AND (_user_id IS NULL OR cn.user_id = _user_id)
    LIMIT 1000
  LOOP
    -- Get the last message for this contact
    SELECT
      wm.message_text,
      wm.message_direction,
      wm.message_type,
      wm.message_timestamp
    INTO _last_msg
    FROM whatsapp_messages wm
    WHERE wm.contact_id = _contact.id
    ORDER BY wm.message_timestamp DESC
    LIMIT 1;

    -- Update contact with preview
    IF _last_msg IS NOT NULL THEN
      UPDATE contact_network
      SET
        last_message_preview = CASE
          WHEN _last_msg.message_text IS NOT NULL AND LENGTH(_last_msg.message_text) > 0
            THEN LEFT(_last_msg.message_text, 100)
          WHEN _last_msg.message_type = 'audio' THEN '[Audio]'
          WHEN _last_msg.message_type = 'image' THEN '[Imagem]'
          WHEN _last_msg.message_type = 'video' THEN '[Video]'
          WHEN _last_msg.message_type = 'document' THEN '[Documento]'
          ELSE '[Mensagem]'
        END,
        last_message_direction = _last_msg.message_direction
      WHERE id = _contact.id;

      _processed := _processed + 1;
    END IF;
  END LOOP;

  RETURN _processed;
END;
$$;

COMMENT ON FUNCTION backfill_contact_message_previews IS
'Backfills last_message_preview for contacts with existing messages. Run once after migration.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION backfill_contact_message_previews TO service_role;
GRANT EXECUTE ON FUNCTION backfill_contact_message_previews TO authenticated;

-- =============================================================================
-- PART 6: ADD INDEX FOR TIMELINE QUERIES
-- =============================================================================

-- Index for efficient timeline queries (ordered by timestamp, filtered by user)
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timeline
  ON whatsapp_messages(user_id, message_timestamp DESC)
  WHERE message_timestamp IS NOT NULL;

-- =============================================================================
-- PART 7: VERIFICATION
-- =============================================================================

DO $$
DECLARE
  _col_exists BOOLEAN;
BEGIN
  -- Verify columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_network'
      AND column_name = 'last_message_preview'
  ) INTO _col_exists;

  IF NOT _col_exists THEN
    RAISE EXCEPTION 'Column last_message_preview not created';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_network'
      AND column_name = 'last_message_direction'
  ) INTO _col_exists;

  IF NOT _col_exists THEN
    RAISE EXCEPTION 'Column last_message_direction not created';
  END IF;

  -- Verify trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_update_contact_last_message_preview'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_update_contact_last_message_preview not created';
  END IF;

  RAISE NOTICE '=== Migration 20260131000001_whatsapp_timeline_integration completed ===';
  RAISE NOTICE '- Added last_message_preview column to contact_network';
  RAISE NOTICE '- Added last_message_direction column to contact_network';
  RAISE NOTICE '- Created trigger for automatic preview updates';
  RAISE NOTICE '- Enabled realtime for whatsapp_messages';
  RAISE NOTICE '- Created backfill function for existing contacts';
END $$;
