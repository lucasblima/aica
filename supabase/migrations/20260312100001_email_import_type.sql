-- Add import_type discriminator to email_import_log
-- Allows distinguishing WhatsApp vs Finance email imports

ALTER TABLE IF EXISTS email_import_log
  ADD COLUMN IF NOT EXISTS import_type TEXT NOT NULL DEFAULT 'whatsapp';

COMMENT ON COLUMN email_import_log.import_type IS 'Type of import: whatsapp or finance';
