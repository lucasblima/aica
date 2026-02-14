-- Fix stuck WhatsApp messages that are permanently in 'pending' or 'processing' state.
-- These messages can't be reprocessed because raw text was never stored (privacy-first).
-- Mark them as 'skipped' so they don't show as "Processando..." in the timeline.

UPDATE whatsapp_messages
SET processing_status = 'skipped',
    updated_at = NOW()
WHERE processing_status IN ('pending', 'processing')
  AND created_at < NOW() - INTERVAL '10 minutes';
