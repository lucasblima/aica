-- ============================================================================
-- Migration: Extend whatsapp_file_imports processing_status values
-- Description: Adds 'resolving_contacts' and 'storing_messages' status values
--              for more granular progress tracking during large imports.
-- ============================================================================

-- Drop the old constraint and recreate with expanded values
ALTER TABLE public.whatsapp_file_imports
  DROP CONSTRAINT IF EXISTS whatsapp_file_imports_processing_status_check;

ALTER TABLE public.whatsapp_file_imports
  ADD CONSTRAINT whatsapp_file_imports_processing_status_check
  CHECK (processing_status = ANY (ARRAY[
    'pending'::text,
    'parsing'::text,
    'resolving_contacts'::text,
    'storing_messages'::text,
    'extracting_intents'::text,
    'indexing_rag'::text,
    'completed'::text,
    'failed'::text
  ]));
